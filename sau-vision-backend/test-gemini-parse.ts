import "dotenv/config";
import axios from "axios";

const API_URL = "http://localhost:4000/api";

async function testEnrichedParse() {
  console.log("🔍 Testing Enriched Lab Suggestions API\n" + "─".repeat(55));

  // Login
  const loginRes = await axios.post(`${API_URL}/auth/login`, { email: "charlie@sau.edu.tr", password: "pwd" });
  const token = loginRes.data.token;
  console.log("✅ Logged in as Charlie\n");

  // Send prompt
  const res = await axios.post(`${API_URL}/bookings/parse`, {
    prompt: "I need a computer lab for 15 people for machine learning training. We'll use Python, TensorFlow, and Jupyter notebooks.",
    expectedAttendees: 15
  }, { headers: { Authorization: `Bearer ${token}` } });

  const { suggestions, bookingDetails, availableLabCount } = res.data;

  console.log(`📊 ${availableLabCount} labs scanned from database`);
  console.log(`🏷️  Title: "${bookingDetails?.extractedTitle}"`);
  console.log(`📝 Description: "${bookingDetails?.extractedDescription}"`);
  console.log(`👥 Attendees: ${bookingDetails?.suggestedAttendees}\n`);

  console.log(`🏆 ${suggestions.length} Lab Suggestions (with full DB data):\n`);

  for (const s of suggestions) {
    console.log(`  ┌─ #${s.rank} — ${s.labName} ────────────────────────`);
    console.log(`  │ Match Score:   ${s.matchScore}/100`);
    console.log(`  │ Reasoning:     ${s.reasoning}`);
    console.log(`  │`);
    console.log(`  │ 📦 FROM DATABASE:`);
    console.log(`  │   Lab ID:      ${s.lab.id}`);
    console.log(`  │   Name:        ${s.lab.name}`);
    console.log(`  │   Type:        ${s.lab.type}`);
    console.log(`  │   Capacity:    ${s.lab.capacity}`);
    console.log(`  │   Status:      ${s.lab.status}`);
    console.log(`  │   Faculty:     ${s.lab.faculty?.name || "N/A"} (${s.lab.faculty?.code || "N/A"})`);
    console.log(`  │   Tags:        ${JSON.stringify(s.lab.aiTags)}`);
    console.log(`  │   Description: ${s.lab.aiDescription}`);
    console.log(`  └──────────────────────────────────────────\n`);
  }

  // Show the raw JSON the frontend would receive
  console.log("─".repeat(55));
  console.log("📡 RAW API Response (what the frontend receives):");
  console.log(JSON.stringify(res.data, null, 2).slice(0, 2000));
}

testEnrichedParse();
