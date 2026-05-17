import "dotenv/config";
import { db } from "./src/db/client";
import { bookings, registrations, students, labs } from "./src/db/schema";
import { eq, like } from "drizzle-orm";

async function run() {
  console.log("🚀 Starting End-to-End Event Automation Test...");

  // 1. Find our students
  const ahmet = await db.query.students.findFirst({
    where: like(students.email, "ahmet.yilmaz%")
  });
  const zeynep = await db.query.students.findFirst({
    where: like(students.email, "zeynep.celik%")
  });

  if (!ahmet || !zeynep) {
    console.error("❌ Test students not found in DB.");
    process.exit(1);
  }

  console.log(`👤 Found Host: ${ahmet.fullName} (Rating: ${ahmet.eventRating})`);
  console.log(`👤 Found Attendee: ${zeynep.fullName}`);

  let mohamed = await db.query.students.findFirst({
    where: eq(students.email, "mohamedgabel1@gmail.com")
  });

  if (!mohamed) {
    const [newStudent] = await db.insert(students).values({
      universityId: "123456789",
      fullName: "Mohamed Gabel",
      email: "mohamedgabel1@gmail.com",
      passwordHash: "dummy",
      faculty: "Computer Science",
      programme: "Software Engineering"
    }).returning();
    mohamed = newStudent;
  }
  
  console.log(`👤 Found/Created Target Attendee: ${mohamed.fullName} (${mohamed.email})`);

  // 2. Find a valid lab
  const lab = await db.query.labs.findFirst();
  if (!lab) {
    console.error("❌ No labs found in DB.");
    process.exit(1);
  }

  // 3. Create two expired bookings directly in the database
  // This bypasses the API business hours and future-date restrictions so we can test the cron job immediately.
  const now = new Date();
  const pastStart = new Date(now.getTime() - 60 * 60000); // 1 hour ago
  const pastEnd = new Date(now.getTime() - 1000); // 1 second ago (expired)

  console.log("\n📅 Injecting 2 expired events into the database...");

  const [certifiedEvent] = await db.insert(bookings).values({
    labId: lab.id,
    studentId: ahmet.id,
    title: "Test Automation - Certified React Workshop",
    description: "This event SHOULD trigger a puq.ai certificate.",
    scheduledStart: pastStart,
    scheduledEnd: pastEnd,
    status: "approved",
    expectedAttendees: 10,
    requiresCertificate: true
  }).returning();

  const [regularEvent] = await db.insert(bookings).values({
    labId: lab.id,
    studentId: ahmet.id,
    title: "Test Automation - Regular Study Group",
    description: "This event SHOULD NOT trigger a puq.ai certificate.",
    scheduledStart: pastStart,
    scheduledEnd: pastEnd,
    status: "approved",
    expectedAttendees: 5,
    requiresCertificate: false
  }).returning();

  console.log(`✅ Created Certified Event: ${certifiedEvent.title}`);
  console.log(`✅ Created Regular Event: ${regularEvent.title}`);

  let noshow = await db.query.students.findFirst({
    where: eq(students.email, "noshow@sau.edu.tr")
  });

  if (!noshow) {
    const [newStudent] = await db.insert(students).values({
      universityId: "999999999",
      fullName: "No Show Student",
      email: "noshow@sau.edu.tr",
      passwordHash: "dummy",
      faculty: "Engineering",
      programme: "Mechanical Engineering"
    }).returning();
    noshow = newStudent;
  }

  // 4. Register Zeynep and Mohamed as "attended", and noshow as "registered" (didn't check in)
  console.log("\n📲 Registering attendees (including a no-show)...");
  await db.insert(registrations).values([
    {
      bookingId: certifiedEvent.id,
      studentId: zeynep.id,
      status: "attended"
    },
    {
      bookingId: regularEvent.id,
      studentId: zeynep.id,
      status: "attended"
    },
    {
      bookingId: certifiedEvent.id,
      studentId: mohamed.id,
      status: "attended"
    },
    {
      bookingId: certifiedEvent.id,
      studentId: noshow.id,
      status: "registered" // They joined the event but didn't scan the QR code!
    }
  ]);
  console.log("✅ Zeynep and Mohamed successfully checked in.");
  console.log("❌ No Show Student registered but failed to check in!");

  console.log("\n🎯 TEST DATA INJECTED SUCCESSFULLY!");
  console.log("=====================================================");
  console.log("The backend server's Event Scheduler cron job runs every 60 seconds.");
  console.log("Please watch the backend terminal running `npm run dev`.");
  console.log("Within the next minute, you should see:");
  console.log("  1. The cron job picking up both events.");
  console.log("  2. It will send the Admin Report to puq.ai for BOTH events.");
  console.log("  3. It will ONLY send the Certificate webhook for the Certified React Workshop.");
  console.log("=====================================================\n");
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
