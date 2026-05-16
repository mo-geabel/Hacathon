import "dotenv/config";
import axios from "axios";
import { db } from "./src/db/client";
import { labs } from "./src/db/schema";
import { eq } from "drizzle-orm";

const API_URL = "http://localhost:4000/api";

async function verifyLabIds() {
  console.log("🔍 Verifying Gemini suggestions match real DB labs...\n");

  // Login
  const loginRes = await axios.post(`${API_URL}/auth/login`, { email: "charlie@sau.edu.tr", password: "pwd" });
  const token = loginRes.data.token;

  // Send a prompt
  const res = await axios.post(`${API_URL}/bookings/parse`, {
    prompt: "I need a computer lab for 10 people for a data science workshop with Python.",
    expectedAttendees: 10
  }, { headers: { Authorization: `Bearer ${token}` } });

  const suggestions = res.data.geminiResult.suggestions;

  console.log(`Gemini returned ${suggestions.length} suggestions. Checking each against the DB:\n`);

  for (const s of suggestions) {
    const dbLab = await db.query.labs.findFirst({ where: eq(labs.id, s.labId) });
    if (dbLab) {
      const nameMatch = dbLab.name === s.labName;
      console.log(`  ✅ #${s.rank} — ID: ${s.labId}`);
      console.log(`     Gemini says: "${s.labName}" | DB says: "${dbLab.name}" ${nameMatch ? "✓ MATCH" : "⚠️ NAME MISMATCH"}`);
      console.log(`     DB Capacity: ${dbLab.capacity} | DB Type: ${dbLab.type} | DB Active: ${dbLab.isActive}`);
    } else {
      console.log(`  ❌ #${s.rank} — ID: ${s.labId} → NOT FOUND IN DATABASE!`);
    }
  }

  process.exit(0);
}

verifyLabIds();
