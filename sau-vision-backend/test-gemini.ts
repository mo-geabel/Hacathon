import "dotenv/config";
import axios from "axios";

const API_URL = "http://localhost:4000/api";

async function testGeminiEngine() {
  console.log("🤖 Starting Gemini AI Engine Test...");

  try {
    // 1. Get a student token
    console.log("Registering Student 1...");
    await axios.post(`${API_URL}/auth/register/student`, {
      universityId: "GEMINI-TEST", fullName: "Gemini Tester", email: "gemini@sau.edu.tr", password: "pwd", faculty: "Engineering"
    }).catch(() => {}); // ignore if already exists

    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: "gemini@sau.edu.tr",
      password: "pwd"
    });
    const token = loginRes.data.token;
    console.log("✅ Authenticated successfully.\n");

    // 2. Test 1: Music Room Request
    console.log("--- Test 1: Traditional Music Room ---");
    const prompt1 = "I have a group of 15 people and we need a quiet room to practice playing traditional Turkish instruments like the Ney and Kanun.";
    console.log(`Prompt: "${prompt1}"`);
    console.log("Waiting for Gemini to parse and match...\n");

    const res1 = await axios.post(`${API_URL}/bookings/parse`, {
      prompt: prompt1,
      expectedAttendees: 15
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("🎯 Gemini Result:");
    console.log(JSON.stringify(res1.data.geminiResult, null, 2));

    // 3. Test 2: Video Editing Request
    console.log("\n--- Test 2: Video Editing Request ---");
    const prompt2 = "Me and my friend need to render a heavy 3D animation and edit a video using Final Cut Pro.";
    console.log(`Prompt: "${prompt2}"`);
    console.log("Waiting for Gemini to parse and match...\n");

    const res2 = await axios.post(`${API_URL}/bookings/parse`, {
      prompt: prompt2,
      expectedAttendees: 2
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("🎯 Gemini Result:");
    console.log(JSON.stringify(res2.data.geminiResult, null, 2));

    console.log("\n🎉 Gemini Tests Completed Successfully!");
  } catch (error: any) {
    console.error("\n❌ Gemini Test Failed:");
    console.error(error);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

testGeminiEngine();
