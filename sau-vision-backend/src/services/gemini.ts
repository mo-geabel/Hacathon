import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We use the 1.5-flash model because it is incredibly fast and highly optimized for JSON extraction
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    // Force the AI to always return a strict JSON object
    responseMimeType: "application/json",
  }
});
