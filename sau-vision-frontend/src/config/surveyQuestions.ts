/**
 * FRONTEND SURVEY QUESTION CONFIG
 * Mirrors the backend config in sau-vision-backend/src/config/surveyQuestions.ts
 * Keep both files in sync when modifying questions.
 */

export interface SurveyQuestion {
  id: string;
  type: 'rating' | 'text' | 'boolean';
  question: string;
  description?: string;
  min?: number;
  max?: number;
  weight?: number;
  required?: boolean;
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'organization',
    type: 'rating',
    question: 'How well was the event organized?',
    description: 'Consider preparation, instructions, and overall structure.',
    min: 1, max: 5, weight: 0.30, required: true,
  },
  {
    id: 'content_quality',
    type: 'rating',
    question: 'How would you rate the content quality of this event?',
    description: 'Consider the value and relevance of the material presented.',
    min: 1, max: 5, weight: 0.30, required: true,
  },
  {
    id: 'time_management',
    type: 'rating',
    question: 'How well did the organizer manage the time?',
    description: 'Did the event start/end on time? Was pacing appropriate?',
    min: 1, max: 5, weight: 0.20, required: true,
  },
  {
    id: 'engagement',
    type: 'rating',
    question: 'How engaging was the organizer?',
    description: 'Consider their communication, enthusiasm, and interaction.',
    min: 1, max: 5, weight: 0.10, required: true,
  },
  {
    id: 'would_recommend',
    type: 'boolean',
    question: 'Would you attend another event by this organizer?',
    weight: 0.10, required: true,
  },
  {
    id: 'open_feedback',
    type: 'text',
    question: 'Any additional comments or suggestions for the organizer?',
    description: 'Optional — your honest feedback helps improve future events.',
    required: false,
  },
];

export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};
