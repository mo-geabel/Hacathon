import "dotenv/config";
import axios from "axios";
import { db } from "./src/db/client";
import { bookings, registrations } from "./src/db/schema";
import { eq } from "drizzle-orm";

const API_URL = "http://localhost:4000/api";

async function testUnifiedEvents() {
  console.log("🧪 Testing Unified Public Events & Punishment System...");

  try {
    // 1. Get our test professor and student tokens
    const profRes = await axios.post(`${API_URL}/auth/login`, { email: "prof2@sau.edu.tr", password: "pwd" }).catch(() => null);
    const profToken = profRes?.data?.token;

    const studentRes = await axios.post(`${API_URL}/auth/login`, { email: "charlie@sau.edu.tr", password: "pwd" }).catch(() => null);
    const charlieToken = studentRes?.data?.token;

    if (!charlieToken) {
        console.log("❌ Could not login as Charlie. Make sure test-prof-approval.ts ran.");
        process.exit(1);
    }

    const bookingsRes = await axios.get(`${API_URL}/bookings`, { headers: { Authorization: `Bearer ${charlieToken}` } });
    let approvedBooking = bookingsRes.data.find((b: any) => b.status === "approved" || b.status === "pending");

    if (!approvedBooking) {
      console.log("❌ Could not find a booking.");
      process.exit(1);
    }
    
    // If it's pending, let's approve it using DB for speed
    if (approvedBooking.status === "pending") {
        await db.update(bookings).set({ status: "approved" }).where(eq(bookings.id, approvedBooking.id));
        approvedBooking.status = "approved";
    }

    console.log(`\n📅 Found Approved Booking: ${approvedBooking.title}`);

    // Let's create dummy registrations for Alice (who will ghost) and Bob (who will attend)
    const { students: schemaStudents } = require('./src/db/schema');
    let alice = await db.query.students.findFirst({ where: eq(schemaStudents.email, "alice@sau.edu.tr") });
    let bob = await db.query.students.findFirst({ where: eq(schemaStudents.email, "bob@sau.edu.tr") });

    if (!alice || !bob) {
        console.log("❌ Could not find Alice or Bob.");
        process.exit(1);
    }

    // Clean old registrations to prevent unique constraint errors if any
    await db.delete(registrations).where(eq(registrations.bookingId, approvedBooking.id));

    const [regAlice] = await db.insert(registrations).values({
      bookingId: approvedBooking.id,
      studentId: alice!.id,
      status: "registered"
    }).returning();

    const [regBob] = await db.insert(registrations).values({
      bookingId: approvedBooking.id,
      studentId: bob!.id,
      status: "registered"
    }).returning();
    
    console.log(`✅ Dummy registrations added for ${alice?.fullName} and ${bob?.fullName}`);

    // 2. Bob fetches his own QR code
    console.log("\n📲 Bob is fetching his personal QR Code...");
    const bobRes = await axios.post(`${API_URL}/auth/login`, { email: "bob@sau.edu.tr", password: "pwd" });
    const bobToken = bobRes.data.token;

    const myQrRes = await axios.get(`${API_URL}/bookings/${approvedBooking.id}/my-qr`, {
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    console.log("✅ Bob's QR Payload:", myQrRes.data.qrPayload);

    // 3. Bob arrives, Charlie scans his QR code to check him in
    console.log("\n📷 Charlie is scanning Bob's QR code at the door...");
    const checkInRes = await axios.post(`${API_URL}/bookings/checkin`, {
      qrPayload: myQrRes.data.qrPayload
    }, { headers: { Authorization: `Bearer ${charlieToken}` } }); 

    console.log("✅ Server response:", checkInRes.data.message);
    console.log("✅ Bob's new status:", checkInRes.data.registration.status);

    // 4. The Event Ends. Charlie concludes the event to punish no-shows (Alice).
    console.log("\n⏳ The event is over. Charlie is concluding the event...");
    const concludeRes = await axios.post(`${API_URL}/bookings/${approvedBooking.id}/conclude`, {}, { 
      headers: { Authorization: `Bearer ${charlieToken}` } 
    });

    console.log("✅ Event Concluded!");
    console.log("📊 Stats:", concludeRes.data.stats);

    // 5. Verify Alice was punished
    const punishedAlice = await db.query.students.findFirst({ where: eq(schemaStudents.id, alice!.id) });
    console.log(`\n⚖️ Alice's new rating: ${punishedAlice?.eventRating} (Ghosted Count: ${punishedAlice?.ghostedEventCount})`);

    console.log("\n🎉 Event Types, QR Check-in, & Punishment System verified!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Test failed:", error?.response?.data || error.message);
    process.exit(1);
  }
}

testUnifiedEvents();
