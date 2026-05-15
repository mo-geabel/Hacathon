import "dotenv/config";
import axios from "axios";
import { db } from "./src/db/client";
import { faculties, labs, admins } from "./src/db/schema";
import bcrypt from "bcrypt";

const API_URL = "http://localhost:4000/api";

async function runTests() {
  console.log("🚀 Starting Full API Test Suite...");
  
  // 1. Seed Database with a Faculty and a Lab directly via Drizzle
  console.log("\n--- Seeding Test Data (Faculty & Lab) ---");
  const [faculty] = await db.insert(faculties).values({
    name: "Faculty of Engineering",
    code: "ENG-TEST",
    deanName: "Dr. Smith"
  }).returning();
  
  const [lab] = await db.insert(labs).values({
    facultyId: faculty.id,
    name: "Advanced Comp Lab",
    type: "computer",
    floor: 2,
    roomNumber: "201",
    capacity: 40,
    aiDescription: "Test computer lab for AI testing"
  }).returning();

  // Create an Admin to test Admin routes
  const adminPassword = await bcrypt.hash("admin123", 10);
  const [admin] = await db.insert(admins).values({
    facultyId: faculty.id,
    universityId: "ADMIN999",
    fullName: "Test Admin",
    email: "admin@sau.edu.tr",
    passwordHash: adminPassword
  }).returning();

  console.log("✅ Seeded Faculty, Lab, and Admin.");

  try {
    // 2. Auth Tests: Register two students
    console.log("\n--- Auth: Registering Students ---");
    const s1Res = await axios.post(`${API_URL}/auth/register/student`, {
      universityId: "S1-TEST", fullName: "Student One", email: "s1@sau.edu.tr", password: "pwd", faculty: "Engineering"
    });
    const s2Res = await axios.post(`${API_URL}/auth/register/student`, {
      universityId: "S2-TEST", fullName: "Student Two", email: "s2@sau.edu.tr", password: "pwd", faculty: "Engineering"
    });

    const student1Token = (await axios.post(`${API_URL}/auth/login`, { email: "s1@sau.edu.tr", password: "pwd" })).data.token;
    const student2Token = (await axios.post(`${API_URL}/auth/login`, { email: "s2@sau.edu.tr", password: "pwd" })).data.token;
    const adminToken = (await axios.post(`${API_URL}/auth/login`, { email: "admin@sau.edu.tr", password: "admin123" })).data.token;
    console.log("✅ Registered students and got tokens.");

    // 3. Test Faculties & Labs API
    console.log("\n--- Testing GET /api/faculties ---");
    const facultiesRes = await axios.get(`${API_URL}/faculties`);
    console.log(`✅ Fetched ${facultiesRes.data.length} faculties.`);

    console.log("\n--- Testing GET /api/labs ---");
    const labsRes = await axios.get(`${API_URL}/labs`);
    console.log(`✅ Fetched ${labsRes.data.length} labs.`);

    // 4. Test Bookings API (Student 1 creates booking)
    console.log("\n--- Testing POST /api/bookings ---");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setHours(end.getHours() + 2);

    const bookingRes = await axios.post(`${API_URL}/bookings`, {
      labId: lab.id,
      title: "Test AI Study Group",
      description: "Working on hackathon",
      expectedAttendees: 10,
      scheduledStart: tomorrow.toISOString(),
      scheduledEnd: end.toISOString()
    }, { headers: { Authorization: `Bearer ${student1Token}` } });
    
    const bookingId = bookingRes.data.id;
    console.log("✅ Booking Created:", bookingRes.data.title);

    // 5. Test Admin Approving Booking
    console.log("\n--- Testing PATCH /api/bookings/:id/status (Admin) ---");
    const approveRes = await axios.patch(`${API_URL}/bookings/${bookingId}/status`, 
      { status: "approved" },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log("✅ Booking Approved:", approveRes.data.status);

    // 6. Test Registrations API (Student 2 registers for Student 1's event)
    console.log("\n--- Testing POST /api/registrations/:bookingId ---");
    const regRes = await axios.post(`${API_URL}/registrations/${bookingId}`, {}, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log("✅ Student 2 Registered successfully. ID:", regRes.data.id);

    // 7. Test Fetching Event Details (Should include nested registration)
    console.log("\n--- Testing GET /api/bookings/:id ---");
    const fetchBookingRes = await axios.get(`${API_URL}/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    console.log(`✅ Fetched Booking details. Number of registrations: ${fetchBookingRes.data.registrations.length}`);

    console.log("\n🎉 ALL API ENDPOINTS TESTED SUCCESSFULLY! 🎉\n");

  } catch (error: any) {
    console.error("\n❌ Test Failed!");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  } finally {
    // Clean up test data
    console.log("--- Cleaning up test data ---");
    // Cascading deletes will handle most of this if set up right, but we do manual cleanup
    // We only delete the specific test emails to be safe
    const { eq, inArray } = require("drizzle-orm");
    const { students } = require("./src/db/schema");
    
    await db.delete(students).where(inArray(students.email, ["s1@sau.edu.tr", "s2@sau.edu.tr"]));
    await db.delete(admins).where(eq(admins.email, "admin@sau.edu.tr"));
    await db.delete(labs).where(eq(labs.id, lab.id));
    await db.delete(faculties).where(eq(faculties.id, faculty.id));
    
    console.log("✅ Cleanup complete.");
    process.exit(0);
  }
}

runTests();
