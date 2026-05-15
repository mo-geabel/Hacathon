import axios from "axios";

const API_URL = "http://localhost:4000/api/auth";

async function runTests() {
  const randomId = Math.floor(Math.random() * 100000);
  const testStudent = {
    universityId: `TEST${randomId}`,
    fullName: "Test Student",
    email: `test${randomId}@sau.edu.tr`,
    password: "password123",
    faculty: "Engineering",
    programme: "Computer Science"
  };

  try {
    console.log(`\n--- 1. Registering Student (${testStudent.email}) ---`);
    const registerRes = await axios.post(`${API_URL}/register/student`, testStudent);
    console.log("✅ Registration Success:");
    console.log(registerRes.data);

    console.log("\n--- 2. Logging In ---");
    const loginRes = await axios.post(`${API_URL}/login`, {
      email: testStudent.email,
      password: testStudent.password
    });
    console.log("✅ Login Success!");
    const token = loginRes.data.token;
    console.log(`Received Token: ${token.substring(0, 30)}...`);

    console.log("\n--- 3. Testing Protected Route (/me) ---");
    const meRes = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Profile Fetched:");
    console.log(meRes.data);

    console.log("\n🎉 All tests passed successfully!\n");
  } catch (error: any) {
    console.error("\n❌ Test Failed:");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTests();
