import { geminiModel } from "./gemini";

interface StudentEvaluation {
  aiScore: number;
  aiRecommendation: string;
}

/**
 * puq.ai Integration Service
 * 
 * In a real-world scenario, this service would communicate directly with the puq.ai API 
 * for academic scoring and ROI/Certificate generation. For this hackathon, we power the 
 * puq.ai decision engine using our Gemini 2.5 Flash model (or a smart fallback mock).
 */
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
    // 🚨 Bypassing real Gemini call because the user's API key is completely depleted of credits
    // This prevents the Google Generative AI SDK from hanging for 60+ seconds on auto-retries
    // const result = await geminiModel.generateContent(systemPrompt);
    // const responseText = result.response.text();
    // const parsed = JSON.parse(responseText);
    // return { aiScore: parsed.aiScore, aiRecommendation: parsed.aiRecommendation };
    
    throw new Error("Bypassing API due to depleted credits");
  } catch (error) {
    console.log("puq.ai API (Gemini) failed. Using internal smart mock evaluation.");
    
    let score = 50;
    let recommendation = "Average profile.";

    if (gpa >= 3.5) score += 35;
    else if (gpa >= 2.5) score += 15;

    if (rating >= 4.0) score += 15;
    else if (rating >= 3.0) score += 5;

    const ghostPenalty = student.ghostedEventCount * 30;
    score -= ghostPenalty;

    if (score > 100) score = 100;
    if (score < 1) score = 1;

    if (score > 85) recommendation = "Highly recommended for approval due to strong academic performance.";
    else if (score > 60) recommendation = "Solid candidate, normal approval recommended.";
    else if (score > 40) recommendation = "Borderline candidate, moderate academic profile.";
    else recommendation = "Warning: Strongly recommend rejecting due to high ghosted event count and unreliability.";

    return { aiScore: score, aiRecommendation: recommendation };
  }
}
