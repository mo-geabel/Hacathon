/**
 * DYNAMIC SURVEY QUESTION CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the single source of truth for all survey questions.
 * To change the questionnaire, edit the SURVEY_QUESTIONS array only.
 * The system automatically adapts the UI, scoring, and storage to any changes.
 *
 * Question types:
 *  - "rating"  : Star / numeric scale (min → max)
 *  - "text"    : Free-text input
 *  - "boolean" : Yes / No question
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SurveyQuestion {
  id: string;
  type: "rating" | "text" | "boolean";
  question: string;
  description?: string;
  /** For type "rating" */
  min?: number;
  max?: number;
  /** Weight used in final score calculation (0–1), ignored for "text" questions */
  weight?: number;
  required?: boolean;
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "organization",
    type: "rating",
    question: "How well was the event organized?",
    description: "Consider preparation, instructions, and overall structure.",
    min: 1,
    max: 5,
    weight: 0.30,
    required: true,
  },
  {
    id: "content_quality",
    type: "rating",
    question: "How would you rate the content quality of this event?",
    description: "Consider the value and relevance of the material presented.",
    min: 1,
    max: 5,
    weight: 0.30,
    required: true,
  },
  {
    id: "time_management",
    type: "rating",
    question: "How well did the organizer manage the time?",
    description: "Did the event start/end on time? Was pacing appropriate?",
    min: 1,
    max: 5,
    weight: 0.20,
    required: true,
  },
  {
    id: "engagement",
    type: "rating",
    question: "How engaging was the organizer?",
    description: "Consider their communication, enthusiasm, and interaction.",
    min: 1,
    max: 5,
    weight: 0.10,
    required: true,
  },
  {
    id: "would_recommend",
    type: "boolean",
    question: "Would you attend another event by this organizer?",
    weight: 0.10,
    required: true,
  },
  {
    id: "open_feedback",
    type: "text",
    question: "Any additional comments or suggestions for the organizer?",
    description: "Optional — your honest feedback helps improve future events.",
    required: false,
  },
];

/**
 * Calculates a 0-100 score from raw survey answers.
 * Only "rating" and "boolean" questions with a weight contribute to the score.
 */
export function calculateSurveyScore(answers: Record<string, any>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const q of SURVEY_QUESTIONS) {
    if (!q.weight || q.type === "text") continue;
    const answer = answers[q.id];
    if (answer === undefined || answer === null) continue;

    let normalised = 0;
    if (q.type === "rating" && q.min !== undefined && q.max !== undefined) {
      normalised = (Number(answer) - q.min) / (q.max - q.min); // 0 – 1
    } else if (q.type === "boolean") {
      normalised = answer === true || answer === "true" ? 1 : 0;
    }

    weightedSum += normalised * q.weight;
    totalWeight += q.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100);
}
