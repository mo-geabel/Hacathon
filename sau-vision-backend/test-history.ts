import "dotenv/config";
import axios from "axios";

const API_URL = "http://localhost:4000/api";

async function testHistory() {
  console.log("🧪 Testing Student History Endpoint...");
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: "gemini@sau.edu.tr",
      password: "pwd"
    });
    const token = loginRes.data.token;
    console.log("✅ Authenticated successfully.");

    console.log("📝 Creating a test booking to populate history...");
    await axios.post(`${API_URL}/bookings`, {
      labId: "c679d20a-3037-40d7-94a7-a133f5b240ff", // Random UUID just for testing, actually needs a real labId if DB restricts it.
      // Wait, let's fetch a real lab ID first
    }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    
    // Better yet, just fetch a real lab from /api/labs to avoid foreign key errors
    const labsRes = await axios.get(`${API_URL}/labs`);
    const realLabId = labsRes.data[0]?.id;

    if (realLabId) {
      await axios.post(`${API_URL}/bookings`, {
        labId: realLabId,
        title: "My History Test Booking",
        expectedAttendees: 5,
        scheduledStart: new Date().toISOString(),
        scheduledEnd: new Date(Date.now() + 3600000).toISOString()
      }, { headers: { Authorization: `Bearer ${token}` } });
      console.log("✅ Booking created successfully.");
    }

    const res = await axios.get(`${API_URL}/students/me/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("\n📊 Student History Statistics:");
    console.log(JSON.stringify(res.data.statistics, null, 2));

    console.log("\n📅 Timeline Events:");
    console.log(JSON.stringify(res.data.timeline, null, 2));

  } catch (error: any) {
    console.error("❌ Test failed:", error?.response?.data || error.message);
  }
}

testHistory();
