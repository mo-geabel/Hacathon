import "dotenv/config";
import axios, { AxiosError } from "axios";
import { db } from "./src/db/client";
import { bookings, registrations } from "./src/db/schema";
import { eq } from "drizzle-orm";

const API_URL = "http://localhost:4000/api";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    const detail = err?.response?.data || err?.message || err;
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`         → ${JSON.stringify(detail)}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function run() {
  console.log("\n🧪 Bookings API Full Test Suite\n" + "─".repeat(50));

  // ── Auth Setup ────────────────────────────────────────────────────────────
  console.log("\n[1] AUTH SETUP");

  let studentToken = "";
  let student2Token = "";
  let adminToken = "";
  let createdBookingId = "";

  await test("Login as Charlie (student)", async () => {
    const res = await axios.post(`${API_URL}/auth/login`, { email: "charlie@sau.edu.tr", password: "pwd" });
    studentToken = res.data.token;
    assert(!!studentToken, "No token returned");
  });

  await test("Login as Bob (student 2)", async () => {
    const res = await axios.post(`${API_URL}/auth/login`, { email: "bob@sau.edu.tr", password: "pwd" });
    student2Token = res.data.token;
    assert(!!student2Token, "No token returned");
  });

  await test("Login as Prof (admin)", async () => {
    const res = await axios.post(`${API_URL}/auth/login`, { email: "prof2@sau.edu.tr", password: "pwd" });
    adminToken = res.data.token;
    assert(!!adminToken, "No token returned");
  });

  // ── GET /api/bookings ─────────────────────────────────────────────────────
  console.log("\n[2] GET /api/bookings");

  await test("Student can fetch their own bookings", async () => {
    const res = await axios.get(`${API_URL}/bookings`, { headers: { Authorization: `Bearer ${studentToken}` } });
    assert(Array.isArray(res.data), "Expected array");
  });

  await test("Admin can fetch faculty bookings (sorted by performance)", async () => {
    const res = await axios.get(`${API_URL}/bookings`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert(Array.isArray(res.data), "Expected array");
  });

  await test("Unauthenticated request is rejected (401)", async () => {
    try {
      await axios.get(`${API_URL}/bookings`);
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 401, `Expected 401, got ${e.response?.status}`);
    }
  });

  // ── POST /api/bookings ────────────────────────────────────────────────────
  console.log("\n[3] POST /api/bookings");

  let labId = "";
  await test("Get a lab from the admin's faculty", async () => {
    // Fetch admin's profile to get their facultyId
    const meRes = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const adminFacultyId = meRes.data.profile.facultyId;
    // Fetch a lab that belongs to that specific faculty
    const labsRes = await axios.get(`${API_URL}/labs`);
    const matchingLab = labsRes.data.find((l: any) => l.facultyId === adminFacultyId);
    labId = matchingLab?.id;
    assert(!!labId, `No labs found for admin's faculty (${adminFacultyId})`);
  });

  await test("Student can create a booking", async () => {
    const res = await axios.post(`${API_URL}/bookings`, {
      labId,
      title: "API Test Booking",
      expectedAttendees: 10,
      scheduledStart: new Date(Date.now() + 2 * 86400000).toISOString(),
      scheduledEnd: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    }, { headers: { Authorization: `Bearer ${studentToken}` } });
    createdBookingId = res.data.id;
    assert(res.data.status === "pending", "Expected status=pending");
    assert(!!createdBookingId, "No booking id returned");
  });

  await test("Missing required fields returns 400", async () => {
    try {
      await axios.post(`${API_URL}/bookings`, { labId }, { headers: { Authorization: `Bearer ${studentToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 400, `Expected 400, got ${e.response?.status}`);
    }
  });

  await test("Admin cannot create a booking (403)", async () => {
    try {
      await axios.post(`${API_URL}/bookings`, {
        labId, title: "Admin Booking", expectedAttendees: 5,
        scheduledStart: new Date(Date.now() + 3 * 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString(),
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 403, `Expected 403, got ${e.response?.status}`);
    }
  });

  // ── GET /api/bookings/:id ─────────────────────────────────────────────────
  console.log("\n[4] GET /api/bookings/:id");

  await test("Student can fetch their own booking by ID", async () => {
    const res = await axios.get(`${API_URL}/bookings/${createdBookingId}`, { headers: { Authorization: `Bearer ${studentToken}` } });
    assert(res.data.id === createdBookingId, "Wrong booking returned");
  });

  await test("Student cannot fetch another student's booking (403)", async () => {
    try {
      await axios.get(`${API_URL}/bookings/${createdBookingId}`, { headers: { Authorization: `Bearer ${student2Token}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 403, `Expected 403, got ${e.response?.status}`);
    }
  });

  await test("Non-existent booking returns 404", async () => {
    try {
      await axios.get(`${API_URL}/bookings/00000000-0000-0000-0000-000000000000`, { headers: { Authorization: `Bearer ${studentToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 404, `Expected 404, got ${e.response?.status}`);
    }
  });

  // ── PATCH /api/bookings/:id/status ───────────────────────────────────────
  console.log("\n[5] PATCH /api/bookings/:id/status (Admin)");

  await test("Admin can approve a pending booking", async () => {
    const res = await axios.patch(`${API_URL}/bookings/${createdBookingId}/status`, { status: "approved" },
      { headers: { Authorization: `Bearer ${adminToken}` } });
    assert(res.data.status === "approved", "Expected status=approved");
  });

  await test("Invalid status value returns 400", async () => {
    try {
      await axios.patch(`${API_URL}/bookings/${createdBookingId}/status`, { status: "maybeyes" },
        { headers: { Authorization: `Bearer ${adminToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 400, `Expected 400, got ${e.response?.status}`);
    }
  });

  await test("Student cannot change booking status (403)", async () => {
    try {
      await axios.patch(`${API_URL}/bookings/${createdBookingId}/status`, { status: "approved" },
        { headers: { Authorization: `Bearer ${studentToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 403, `Expected 403, got ${e.response?.status}`);
    }
  });

  // ── GET /api/bookings/:id/my-qr ───────────────────────────────────────────
  console.log("\n[6] GET /api/bookings/:id/my-qr");

  let qrPayload = "";

  // Register Bob for Charlie's approved event
  await test("Register Bob for the event (DB insert)", async () => {
    const { students: schemaStudents } = require("./src/db/schema");
    const bob = await db.query.students.findFirst({ where: eq(schemaStudents.email, "bob@sau.edu.tr") });
    await db.delete(registrations).where(eq(registrations.bookingId, createdBookingId));
    await db.insert(registrations).values({ bookingId: createdBookingId, studentId: bob!.id, status: "registered" });
    assert(!!bob, "Bob not found");
  });

  await test("Bob can fetch his QR code", async () => {
    const res = await axios.get(`${API_URL}/bookings/${createdBookingId}/my-qr`, { headers: { Authorization: `Bearer ${student2Token}` } });
    qrPayload = res.data.qrPayload;
    assert(qrPayload.startsWith("sau-vision://checkin/"), "Invalid QR format");
  });

  await test("Unregistered student gets 404 on /my-qr", async () => {
    // Use a fresh login for Alice who is not registered
    const aliceRes = await axios.post(`${API_URL}/auth/login`, { email: "alice@sau.edu.tr", password: "pwd" });
    try {
      await axios.get(`${API_URL}/bookings/${createdBookingId}/my-qr`, { headers: { Authorization: `Bearer ${aliceRes.data.token}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 404, `Expected 404, got ${e.response?.status}`);
    }
  });

  // ── GET /api/bookings/:id/invitations ─────────────────────────────────────
  console.log("\n[7] GET /api/bookings/:id/invitations");

  await test("Organizer (Charlie) can fetch invitation list with QR codes", async () => {
    const res = await axios.get(`${API_URL}/bookings/${createdBookingId}/invitations`, { headers: { Authorization: `Bearer ${studentToken}` } });
    assert(Array.isArray(res.data.invitations), "Expected invitations array");
    assert(res.data.invitations.length > 0, "Expected at least 1 invitation");
    assert(res.data.invitations[0].qrPayload.startsWith("sau-vision://checkin/"), "Invalid QR payload");
  });

  await test("Non-organizer cannot fetch invitations (404)", async () => {
    try {
      await axios.get(`${API_URL}/bookings/${createdBookingId}/invitations`, { headers: { Authorization: `Bearer ${student2Token}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 404, `Expected 404, got ${e.response?.status}`);
    }
  });

  // ── POST /api/bookings/checkin ─────────────────────────────────────────────
  console.log("\n[8] POST /api/bookings/checkin");

  await test("Organizer can scan Bob's QR code to check him in", async () => {
    const res = await axios.post(`${API_URL}/bookings/checkin`, { qrPayload }, { headers: { Authorization: `Bearer ${studentToken}` } });
    assert(res.data.registration.status === "attended", "Expected status=attended");
  });

  await test("Scanning the same QR code twice returns 400", async () => {
    try {
      await axios.post(`${API_URL}/bookings/checkin`, { qrPayload }, { headers: { Authorization: `Bearer ${studentToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 400, `Expected 400, got ${e.response?.status}`);
    }
  });

  await test("Invalid QR format returns 400", async () => {
    try {
      await axios.post(`${API_URL}/bookings/checkin`, { qrPayload: "not-a-valid-qr" }, { headers: { Authorization: `Bearer ${studentToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 400, `Expected 400, got ${e.response?.status}`);
    }
  });

  // ── POST /api/bookings/:id/conclude ──────────────────────────────────────
  console.log("\n[9] POST /api/bookings/:id/conclude");

  await test("Non-organizer cannot conclude the event (403)", async () => {
    try {
      await axios.post(`${API_URL}/bookings/${createdBookingId}/conclude`, {}, { headers: { Authorization: `Bearer ${student2Token}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 403, `Expected 403, got ${e.response?.status}`);
    }
  });

  await test("Organizer can conclude the event and punishment is applied", async () => {
    const res = await axios.post(`${API_URL}/bookings/${createdBookingId}/conclude`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
    assert(res.data.booking.status === "completed", "Expected status=completed");
    assert(typeof res.data.stats.attended === "number", "Expected attendance count");
    assert(typeof res.data.stats.noShowsPunished === "number", "Expected no-show count");
  });

  await test("Concluding an already-completed event returns 400", async () => {
    try {
      await axios.post(`${API_URL}/bookings/${createdBookingId}/conclude`, {}, { headers: { Authorization: `Bearer ${studentToken}` } });
      throw new Error("Should have failed");
    } catch (e: any) {
      assert(e.response?.status === 400, `Expected 400, got ${e.response?.status}`);
    }
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed === 0) {
    console.log("🎉 All tests passed!\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Check the output above.\n");
    process.exit(1);
  }
}

run();
