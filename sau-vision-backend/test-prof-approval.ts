import "dotenv/config";
import axios from "axios";
import { db } from "./src/db/client";
import { students, admins, faculties, labs } from "./src/db/schema";
import { eq } from "drizzle-orm";

const API_URL = "http://localhost:4000/api";

async function runTest() {
  console.log("🧪 Starting Professor Approval & Sorting Test...\n");

  try {
    // 1. Setup a Test Faculty and Admin
    let faculty = await db.query.faculties.findFirst({ where: eq(faculties.code, "FCS") });
    if (!faculty) {
      const [newFac] = await db.insert(faculties).values({
        name: "Faculty of Computer Science",
        code: "FCS"
      }).returning();
      faculty = newFac;
    }

    const facultyId = faculty.id;

    // We must insert the admin manually since there is no /register/admin route
    const bcrypt = require("bcrypt");
    const passwordHash = await bcrypt.hash("pwd", 10);
    
    let admin = await db.query.admins.findFirst({ where: eq(admins.email, "prof2@sau.edu.tr") });
    if (!admin) {
      const [newAdmin] = await db.insert(admins).values({
        universityId: "PROF-2024",
        fullName: "Prof. Alan Turing",
        email: "prof2@sau.edu.tr",
        passwordHash,
        facultyId
      }).returning();
      admin = newAdmin;
    }

    const profRes = await axios.post(`${API_URL}/auth/login`, {
      email: "prof2@sau.edu.tr", password: "pwd"
    });
    const profToken = profRes.data.token;
    console.log("✅ Professor logged in.");

    // 2. Setup 3 Students with Different Performance Levels
    const testStudents = [
      { id: "A-BAD", name: "Alice (Bad)", gpa: 2.0, rating: 2.0, ghost: 2, email: "alice@sau.edu.tr" },
      { id: "B-AVG", name: "Bob (Avg)", gpa: 3.0, rating: 3.5, ghost: 0, email: "bob@sau.edu.tr" },
      { id: "C-STAR", name: "Charlie (Star)", gpa: 3.9, rating: 4.9, ghost: 0, email: "charlie@sau.edu.tr" }
    ];

    for (const s of testStudents) {
      await axios.post(`${API_URL}/auth/register/student`, {
        universityId: s.id, fullName: s.name, email: s.email, password: "pwd", faculty: "Computer Science"
      }).catch(() => {});
      
      // Forcefully update their stats in the DB for the test
      await db.update(students).set({
        gpa: s.gpa,
        eventRating: s.rating,
        ghostedEventCount: s.ghost
      }).where(eq(students.email, s.email));
    }
    console.log("✅ 3 Students registered and stats injected.");

    // 3. Each student creates a booking request
    // We need a lab for the faculty
    let lab = await db.query.labs.findFirst({ where: eq(labs.facultyId, facultyId) });
    if (!lab) {
      const [newLab] = await db.insert(labs).values({
        name: "CS Advanced Lab",
        capacity: 30,
        type: "computer",
        roomNumber: "C-101",
        aiDescription: "Standard computer lab",
        facultyId,
        isActive: true,
        status: "available"
      }).returning();
      lab = newLab;
    }

    const labId = lab.id;

    for (const s of testStudents) {
      const loginRes = await axios.post(`${API_URL}/auth/login`, { email: s.email, password: "pwd" });
      const studentToken = loginRes.data.token;

      await axios.post(`${API_URL}/bookings`, {
        labId: labId,
        title: `Booking Request from ${s.name}`,
        expectedAttendees: 5,
        scheduledStart: new Date(Date.now() + 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + 90000000).toISOString()
      }, { headers: { Authorization: `Bearer ${studentToken}` } });
    }
    console.log("✅ 3 Booking requests created.");

    // 4. Professor fetches bookings
    console.log("\n📡 Fetching pending bookings for Professor...");
    const bookingsRes = await axios.get(`${API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${profToken}` }
    });

    const pendingRequests = bookingsRes.data.filter((b: any) => b.status === "pending");

    console.log(`Found ${pendingRequests.length} pending requests.`);
    console.log("Order of Importance (Should be Star -> Avg -> Bad):");
    pendingRequests.forEach((req: any, index: number) => {
      console.log(` ${index + 1}. ${req.student.fullName} | GPA: ${req.student.gpa} | Rating: ${req.student.eventRating} | Ghosts: ${req.student.ghostedEventCount}`);
    });

    // 5. Professor Approves the top student
    const topRequest = pendingRequests[0];
    if (topRequest) {
      console.log(`\n👨‍🏫 Professor is approving the top request from ${topRequest.student.fullName}...`);
      const approveRes = await axios.patch(`${API_URL}/bookings/${topRequest.id}/status`, {
        status: "approved"
      }, { headers: { Authorization: `Bearer ${profToken}` } });

      console.log("✅ Status successfully changed to:", approveRes.data.status);
    }

    console.log("\n🎉 Test completed successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Test failed:", error?.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
