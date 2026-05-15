import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export interface ParsedBookingIntent {
  intent: "book_facility" | "cancel_booking" | "check_availability" | "unknown";
  facilityType: string | null;
  requestedCapacity: number | null;
  preferredDate: string | null;       // YYYY-MM-DD
  preferredStartTime: string | null;  // HH:MM (24h)
  preferredEndTime: string | null;    // HH:MM (24h)
  eventTitle: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
  clarificationNeeded: string | null;
}

const SYSTEM_PROMPT = `You are SAÜ-Vision, a facility booking assistant for Sakarya University.
Extract structured JSON booking intent from Turkish/English natural language requests.
Return ONLY valid JSON matching this schema (no markdown, no explanation):
{ intent, facilityType, requestedCapacity, preferredDate (YYYY-MM-DD), preferredStartTime (HH:MM), preferredEndTime (HH:MM), eventTitle, notes, confidence, clarificationNeeded }
Turkish context: derslik=lecture_hall, seminer=seminar_room, lab=laboratory, konferans=conference_room.
Set confidence="high" only when facilityType, date, AND time range are all present.`;

/**
 * Parses a natural language booking request using Gemini and returns
 * a structured ParsedBookingIntent object.
 */
export async function parseBookingIntent(nlText: string): Promise<ParsedBookingIntent> {
  const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser: "${nlText}"`);
  const text = result.response.text().trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(text) as ParsedBookingIntent;
}
