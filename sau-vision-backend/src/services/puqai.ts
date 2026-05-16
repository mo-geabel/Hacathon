import { geminiModel } from "./gemini";

// ─────────────────────────────────────────────────────────────────────────────
// puq.ai Integration Service
//
// Powers three distinct AI pipelines:
//  1. Pre-event student evaluation (admission scoring)
//  2. Post-event report generation (attendance, ROI, GPA distribution)
//  3. Certificate generation (per attendee, only for certified events)
//
// Each function first tries the real Gemini model, and falls back to a
// deterministic mock if the API call fails (e.g., depleted credits).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentEvaluation {
  aiScore: number;
  aiRecommendation: string;
}

export interface AttendeeRecord {
  studentId: string;
  fullName: string;
  universityId: string;
  faculty: string;
  programme?: string | null;
  gpa?: number | null;
  eventRating?: number | null;
  checkInTime?: Date | null;
}

export interface PuqAiReport {
  reportId: string;
  generatedAt: string;
  eventTitle: string;
  labName: string;
  faculty: string;
  scheduledStart: string;
  scheduledEnd: string;
  organizerName: string;
  totalRegistered: number;
  totalAttended: number;
  noShows: number;
  attendanceRate: number;
  averageGpa: number | null;
  topPerformers: { name: string; universityId: string; gpa: number | null }[];
  roiSummary: string;
  recommendations: string;
}

export interface CertificateRecord {
  studentId: string;
  certificateId: string;
  issuedAt: string;
  eventTitle: string;
  labName: string;
  studentName: string;
  universityId: string;
  faculty: string;
}

// ─── 1. Pre-Event: Student Admission Scoring ──────────────────────────────────

export async function puqAiEvaluateStudent(
  student: { fullName: string; gpa: number | null; eventRating: number | null; ghostedEventCount: number }
): Promise<StudentEvaluation> {
  const gpa = student.gpa || 0;
  const rating = student.eventRating || 0;

  const systemPrompt = `
    You are the puq.ai Pre-Event Admissions Engine for SAÜ-Vision.
    Your job is to evaluate a student applying for a laboratory event based strictly on their academic and reliability metrics.
    
    Student Name: ${student.fullName}
    GPA: ${student.gpa === null ? "Not Recorded" : student.gpa + "/4.00"}
    Average Event Rating: ${student.eventRating === null ? "No events created yet" : student.eventRating + "/5.0"}
    Ghosted Events (Failed to show up): ${student.ghostedEventCount}

    Instructions:
    - Score them from 1 to 100.
    - Heavily penalize a high ghosted event count (subtract 20-30 points per ghosted event).
    - Reward a high GPA and high Event Rating.
    - Provide a short 1-sentence recommendation for the Professor.

    Return exactly this JSON structure:
    {
      "aiScore": 95,
      "aiRecommendation": "Highly recommended because of their strong GPA and perfect attendance."
    }
  `;

  try {
    const result = await geminiModel.generateContent(systemPrompt);
    let text = result.response.text().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(text);
    return { aiScore: parsed.aiScore, aiRecommendation: parsed.aiRecommendation };
  } catch (error) {
    console.log("puq.ai Student Evaluation: Using smart mock fallback.");

    let score = 50;
    if (gpa >= 3.5) score += 35;
    else if (gpa >= 2.5) score += 15;
    if (rating >= 4.0) score += 15;
    else if (rating >= 3.0) score += 5;
    score -= student.ghostedEventCount * 30;
    score = Math.max(1, Math.min(100, score));

    let recommendation = "Average profile.";
    if (score > 85) recommendation = "Highly recommended for approval due to strong academic performance.";
    else if (score > 60) recommendation = "Solid candidate, normal approval recommended.";
    else if (score > 40) recommendation = "Borderline candidate, moderate academic profile.";
    else recommendation = "Warning: Strongly recommend rejecting due to high ghosted event count and unreliability.";

    return { aiScore: score, aiRecommendation: recommendation };
  }
}

// ─── 2. Post-Event: Report Generation ────────────────────────────────────────

export async function puqAiGenerateReport(params: {
  booking: {
    id: string;
    title: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    requiresCertificate: boolean;
    lab: { name: string; faculty: { name: string } };
    organizer: { fullName: string };
  };
  attendees: AttendeeRecord[];
  totalRegistered: number;
}): Promise<PuqAiReport> {
  const { booking, attendees, totalRegistered } = params;
  const attended = attendees.length;
  const noShows = totalRegistered - attended;
  const attendanceRate = totalRegistered > 0 ? Math.round((attended / totalRegistered) * 100) : 0;
  const avgGpa =
    attendees.filter((a) => a.gpa !== null && a.gpa !== undefined).length > 0
      ? parseFloat(
          (
            attendees.reduce((sum, a) => sum + (a.gpa || 0), 0) /
            attendees.filter((a) => a.gpa !== null).length
          ).toFixed(2)
        )
      : null;

  const reportId = `RPT-${booking.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
  const generatedAt = new Date().toISOString();

  const attendeeList = attendees
    .map((a) => `${a.fullName} (${a.universityId}, GPA: ${a.gpa ?? "N/A"}, Faculty: ${a.faculty})`)
    .join("\n");

  const prompt = `
You are the puq.ai Post-Event Analytics Engine for SAÜ-Vision university facility management.
Generate a professional event report based on this data:

Event: "${booking.title}"
Lab: ${booking.lab.name} — ${booking.lab.faculty.name}
Organizer: ${booking.organizer.fullName}
Scheduled: ${booking.scheduledStart.toISOString()} → ${booking.scheduledEnd.toISOString()}
Certified Event: ${booking.requiresCertificate ? "Yes (certificates issued)" : "No"}

Attendance:
- Registered: ${totalRegistered}
- Attended: ${attended}
- No-Shows: ${noShows}
- Attendance Rate: ${attendanceRate}%
- Average Attendee GPA: ${avgGpa ?? "N/A"}

Attendees:
${attendeeList || "No attendees recorded."}

Write a concise, professional ROI summary (2-3 sentences) and one actionable recommendation.
Return ONLY valid JSON in this exact structure:
{
  "roiSummary": "...",
  "recommendations": "...",
  "topPerformers": [
    { "name": "...", "universityId": "...", "gpa": 3.8 }
  ]
}
(topPerformers: up to 3 attendees with the highest GPA, or empty array if none)
  `;

  let roiSummary = `The event "${booking.title}" achieved a ${attendanceRate}% attendance rate with ${attended} out of ${totalRegistered} registered students attending. ${booking.requiresCertificate ? "Certificates have been issued to all verified attendees." : ""}`;
  let recommendations = "Consider promoting the event earlier to improve registration turnout.";
  let topPerformers: { name: string; universityId: string; gpa: number | null }[] = [];

  try {
    const result = await geminiModel.generateContent(prompt);
    let text = result.response.text().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(text);
    roiSummary = parsed.roiSummary || roiSummary;
    recommendations = parsed.recommendations || recommendations;
    topPerformers = parsed.topPerformers || [];
  } catch (err) {
    console.log("puq.ai Report Generation: Using smart mock fallback.");
    // Build top performers from data we already have
    topPerformers = attendees
      .filter((a) => a.gpa !== null)
      .sort((a, b) => (b.gpa || 0) - (a.gpa || 0))
      .slice(0, 3)
      .map((a) => ({ name: a.fullName, universityId: a.universityId, gpa: a.gpa ?? null }));
  }

  return {
    reportId,
    generatedAt,
    eventTitle: booking.title,
    labName: booking.lab.name,
    faculty: booking.lab.faculty.name,
    scheduledStart: booking.scheduledStart.toISOString(),
    scheduledEnd: booking.scheduledEnd.toISOString(),
    organizerName: booking.organizer.fullName,
    totalRegistered,
    totalAttended: attended,
    noShows,
    attendanceRate,
    averageGpa: avgGpa,
    topPerformers,
    roiSummary,
    recommendations,
  };
}

// ─── 3. Post-Event: Certificate Generation (Certified Events Only) ────────────

export async function puqAiGenerateCertificates(params: {
  booking: {
    id: string;
    title: string;
    scheduledStart: Date;
    lab: { name: string; faculty: { name: string } };
  };
  attendees: AttendeeRecord[];
}): Promise<CertificateRecord[]> {
  const { booking, attendees } = params;
  const issuedAt = new Date().toISOString();

  const certificates: CertificateRecord[] = attendees.map((attendee) => ({
    studentId: attendee.studentId,
    certificateId: `CERT-${booking.id.slice(0, 6).toUpperCase()}-${attendee.universityId}-${Date.now()}`,
    issuedAt,
    eventTitle: booking.title,
    labName: booking.lab.name,
    studentName: attendee.fullName,
    universityId: attendee.universityId,
    faculty: attendee.faculty,
  }));

  console.log(
    `puq.ai: Generated ${certificates.length} certificates for event "${booking.title}"`
  );

  return certificates;
}
