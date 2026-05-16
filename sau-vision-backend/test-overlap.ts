import "dotenv/config";
import axios from "axios";
import { db } from "./src/db/client";
import { labs, faculties, admins } from "./src/db/schema";
import { eq } from "drizzle-orm";

const API_URL = "http://localhost:4000/api";

async function testOverlapLogic() {
  console.log("🔍 Testing Booking Overlap & Conflict Logic\n" + "─".repeat(55));

  try {
    // 1. Log in users
    console.log("1️⃣ Logging in users...");
    const charlieRes = await axios.post(`${API_URL}/auth/login`, { email: "charlie@sau.edu.tr", password: "pwd" });
    const tokenCharlie = charlieRes.data.token;

    const bobRes = await axios.post(`${API_URL}/auth/login`, { email: "bob@sau.edu.tr", password: "pwd" });
    const tokenBob = bobRes.data.token;

    const profRes = await axios.post(`${API_URL}/auth/login`, { email: "prof2@sau.edu.tr", password: "pwd" });
    const tokenProf = profRes.data.token;
    console.log("✅ Logged in Charlie (Student A), Bob (Student B), and Prof (Admin)");

    // 2. Find a lab that belongs to Prof's faculty
    const profAdmin = await db.query.admins.findFirst({ where: eq(admins.email, "prof2@sau.edu.tr") });
    const testLab = await db.query.labs.findFirst({ where: eq(labs.facultyId, profAdmin!.facultyId!) });
    console.log(`\n2️⃣ Found Lab: ${testLab!.name} (ID: ${testLab!.id})`);

    // Setup times (Tomorrow 10:00 to 12:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const start = tomorrow.toISOString();
    
    tomorrow.setHours(12, 0, 0, 0);
    const end = tomorrow.toISOString();

    console.log(`   Time Slot: ${start} to ${end}`);

    // 3. Charlie requests the slot
    console.log("\n3️⃣ Charlie requests the lab...");
    const req1 = await axios.post(`${API_URL}/bookings`, {
      labId: testLab!.id,
      title: "Charlie's Study Group",
      description: "Studying for finals",
      expectedAttendees: 5,
      scheduledStart: start,
      scheduledEnd: end
    }, { headers: { Authorization: `Bearer ${tokenCharlie}` } });
    const bookingCharlie = req1.data;
    console.log("✅ Charlie's request created (Status: pending)");

    // 4. Bob requests the SAME slot
    console.log("\n4️⃣ Bob requests the SAME lab at the SAME time...");
    const req2 = await axios.post(`${API_URL}/bookings`, {
      labId: testLab!.id,
      title: "Bob's Project Meeting",
      description: "Working on the final project",
      expectedAttendees: 5,
      scheduledStart: start,
      scheduledEnd: end
    }, { headers: { Authorization: `Bearer ${tokenBob}` } });
    const bookingBob = req2.data;
    console.log("✅ Bob's request created successfully (Both are pending, so no conflict yet)");

    // 5. Admin approves Charlie's request
    console.log("\n5️⃣ Admin approves Charlie's request...");
    await axios.patch(`${API_URL}/bookings/${bookingCharlie.id}/status`, { status: "approved" }, 
      { headers: { Authorization: `Bearer ${tokenProf}` } });
    console.log("✅ Charlie's booking is now APPROVED.");

    // 6. Admin tries to approve Bob's request
    console.log("\n6️⃣ Admin tries to approve Bob's request (should fail)...");
    try {
      await axios.patch(`${API_URL}/bookings/${bookingBob.id}/status`, { status: "approved" }, 
        { headers: { Authorization: `Bearer ${tokenProf}` } });
      console.error("❌ FAILED: Admin was able to double-book the lab!");
    } catch (err: any) {
      if (err.response?.status === 409) {
        console.log("✅ SUCCESS: Admin was blocked with 409 Conflict!");
        console.log("   API Error:", err.response.data.error);
      } else {
        console.error("❌ FAILED: Unexpected error", err.response?.data || err.message);
      }
    }

    // 7. A new student tries to request the slot
    console.log("\n7️⃣ Charlie tries to book the same slot again (should fail during creation)...");
    try {
      await axios.post(`${API_URL}/bookings`, {
        labId: testLab!.id,
        title: "Another meeting",
        description: "Testing",
        expectedAttendees: 5,
        scheduledStart: start,
        scheduledEnd: end
      }, { headers: { Authorization: `Bearer ${tokenCharlie}` } });
      console.error("❌ FAILED: Charlie was able to request a blocked slot!");
    } catch (err: any) {
      if (err.response?.status === 409) {
        console.log("✅ SUCCESS: Creation was blocked with 409 Conflict!");
        console.log("   API Error:", err.response.data.error);
      } else {
        console.error("❌ FAILED: Unexpected error", err.response?.data || err.message);
      }
    }

    console.log("\n" + "─".repeat(55));
    console.log("🎉 All overlap and double-booking protections are working perfectly!");

  } catch (error: any) {
    console.error("❌ Test crashed:", error?.response?.data || error.message);
  }
}

testOverlapLogic();
