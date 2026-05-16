import "dotenv/config";
import axios from "axios";

const WEBHOOK_URL = "https://api.puq.ai/h/a3eb61690eeb/sync";

async function testWebhook() {
  console.log("🔍 Testing new puq.ai webhook variants...\n");

  const variants = [
    {
      name: "Dify style with inputs key",
      body: {
        inputs: {
          student_prompt: "I need a computer lab for 10 people for a data science workshop.",
          labs_context: "ID: abc-123 | Name: CS Lab | Tags: python,matlab | Capacity: 30"
        },
        response_mode: "blocking",
        user: "test"
      }
    },
    {
      name: "Flat body (no inputs wrapper)",
      body: {
        student_prompt: "I need a computer lab for 10 people.",
        labs_context: "ID: abc-123 | Name: CS Lab | Tags: python,matlab | Capacity: 30"
      }
    },
    {
      name: "query field style",
      body: {
        query: "I need a computer lab for 10 people.",
        inputs: { labs_context: "ID: abc-123 | Name: CS Lab | Tags: python,matlab | Capacity: 30" },
        response_mode: "blocking",
        user: "test"
      }
    }
  ];

  for (const variant of variants) {
    console.log(`\n--- Testing: ${variant.name} ---`);
    try {
      const res = await axios.post(WEBHOOK_URL, variant.body, {
        headers: { "Content-Type": "application/json" },
        timeout: 60000
      });
      console.log("✅ Status:", res.status);
      console.log("Response:", JSON.stringify(res.data, null, 2).slice(0, 1000));
      break; // Stop on first success
    } catch (err: any) {
      console.error("❌ Failed - Status:", err?.response?.status);
      console.error("   Data:", JSON.stringify(err?.response?.data, null, 2)?.slice(0, 300));
      console.error("   Msg:", err?.message);
    }
  }
}

testWebhook();
