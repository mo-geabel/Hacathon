/**
 * test-puqai-admin-report.ts
 * ─────────────────────────────────────────────────────────────────
 * Standalone test for the puq.ai ADMIN EVENT REPORT webhook.
 * Simulates concluding an event and sending the full summary
 * (stats, attendees, no-shows, lab info, responsible admins)
 * to the admin report webhook in a single payload.
 *
 * Run with:
 *   npx ts-node test-puqai-admin-report.ts
 * ─────────────────────────────────────────────────────────────────
 */

import axios from "axios";

const PUQ_ADMIN_WEBHOOK = "https://api.puq.ai/h/584d68b66834/sync";

// ── Mock event data — replace with real values to test live ───────
const mockReport = {
  report_type: "event_summary",

  // Event Info
  event_name:        "Bilişim Sistemleri ve Yapay Zeka Atölyesi",
  event_description: "AI ve makine öğrenmesi üzerine uygulamalı bir atölye çalışması.",
  event_date:        new Date().toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric",
  }),
  event_start_time:  "10:00",
  event_end_time:    "12:30",

  // Organizer
  organizer_name:  "MOHAMMD GEABEL",
  organizer_email: "mohamedgabel1@gmail.com",

  // Lab & Faculty
  lab_name:            "Bilgisayar Mühendisliği Lab A",
  lab_room:            "B-204",
  lab_floor:           "Floor 2",
  faculty_name:        "Mühendislik Fakültesi",
  responsible_admins:  "Dr. Fatma Şahin (fatma.sahin@sakarya.edu.tr), Mert Çelik (mert.celik@sakarya.edu.tr)",

  // Attendance Stats
  expected_attendees: 20,
  actual_attendees:   15,
  no_shows:           5,
  attendance_rate:    "75%",

  // Attendee list (comma-separated names)
  attendee_list: [
    "Ahmet Yılmaz",
    "Zeynep Arslan",
    "Caner Kaya",
    "Elif Demir",
    "Burak Şahin",
    "Selin Kurt",
    "Murat Aydın",
    "Hande Özkan",
    "Furkan Yıldız",
    "Dilan Karahan",
    "Emre Boz",
    "Nisan Çelik",
    "Barış Güler",
    "Tuğba Acar",
    "Kerem Polat",
  ].join(", "),

  concluded_at: new Date().toISOString(),
};

// ── Send ──────────────────────────────────────────────────────────
async function runAdminReportTest() {
  console.log("\n📊 Sending admin event report to puq.ai...\n");
  console.log("Webhook :", PUQ_ADMIN_WEBHOOK);
  console.log("Payload :");
  console.log(JSON.stringify(mockReport, null, 2));
  console.log();

  try {
    const response = await axios.post(PUQ_ADMIN_WEBHOOK, mockReport, {
      headers: { "Content-Type": "application/json" },
      timeout: 8000,
    });
    console.log(`✅ Admin report sent successfully — HTTP ${response.status}`);
    if (response.data) {
      console.log("Response:", JSON.stringify(response.data, null, 2));
    }
  } catch (err: any) {
    const status = err.response?.status ?? "N/A";
    const body   = err.response?.data   ?? err.message;
    console.error(`❌ Failed — HTTP ${status}`, body);
  }
}

runAdminReportTest();
