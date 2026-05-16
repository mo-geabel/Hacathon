/**
 * test-puqai-webhook.ts
 * ─────────────────────────────────────────────────────────────────
 * Standalone test for the puq.ai certificate webhook loop.
 * Simulates concluding an event with 3 attendees, sending one
 * payload at a time with a 10-second gap between each.
 *
 * Run with:
 *   npx ts-node test-puqai-webhook.ts
 * ─────────────────────────────────────────────────────────────────
 */

import axios from "axios";

const PUQ_WEBHOOK = "https://api.puq.ai/h/570e414d8707/sync";

// ── Mock attendees — replace with real data to test live ─────────
const mockAttendees = [
  {
    participant_name: "Caner Kaya",
    participant_email: "mohamedgabel1@gmail.com",
  },
  {
    participant_name: "Ahmet Yılmaz",
    participant_email: "ahmet.yilmaz@ogr.sakarya.edu.tr",
  },
  {
    participant_name: "Zeynep Arslan",
    participant_email: "zeynep.arslan@ogr.sakarya.edu.tr",
  },
];

const EVENT_NAME = "Bilişim Sistemleri ve Yapay Zeka Atölyesi";
const ORGANIZER_NAME = "Ali Demir"; // Name of the student who hosted the event
const EVENT_DATE = new Date().toLocaleDateString("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ── Helper ────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Main loop ─────────────────────────────────────────────────────
async function runWebhookLoop() {
  console.log(`\n🚀 Starting puq.ai webhook test`);
  console.log(`   Event   : ${EVENT_NAME}`);
  console.log(`   Date    : ${EVENT_DATE}`);
  console.log(`   Webhook : ${PUQ_WEBHOOK}`);
  console.log(`   Total   : ${mockAttendees.length} attendee(s)\n`);

  for (let i = 0; i < mockAttendees.length; i++) {
    const attendee = mockAttendees[i];
    const payload = {
      participant_name: attendee.participant_name,
      event_date: EVENT_DATE,
      event_name: EVENT_NAME,
      participant_email: attendee.participant_email,
      organizer_name: ORGANIZER_NAME,
    };

    console.log(`📤 [${i + 1}/${mockAttendees.length}] Sending payload:`);
    console.log(JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(PUQ_WEBHOOK, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 8000,
      });
      console.log(`✅ Success — HTTP ${response.status}\n`);
    } catch (err: any) {
      const status = err.response?.status ?? "N/A";
      const body = err.response?.data ?? err.message;
      console.error(`❌ Failed — HTTP ${status}`, body, "\n");
    }

    // Wait 10 seconds before the next one (skip after last)
    if (i < mockAttendees.length - 1) {
      console.log(`⏳ Waiting 10 seconds before next attendee...\n`);
      await sleep(10000);
    }
  }

  console.log(`\n🏁 Webhook loop complete. ${mockAttendees.length} certificate(s) processed.`);
}

runWebhookLoop();
