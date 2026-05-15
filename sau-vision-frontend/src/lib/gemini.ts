import type { IntentExtraction } from '../types';

/**
 * MOCK GEMINI PARSER
 * Since no API key is provided, this function simulates the behavior of 
 * a Gemini model extracting structured data from a natural language request.
 */
export async function extractIntentFromQuery(query: string): Promise<IntentExtraction> {
  // Simulate network delay for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const lowerQuery = query.toLowerCase();
  
  // Default fallback intent
  const intent: IntentExtraction = {
    capacity: 4,
    hardware: 'None',
    date: new Date().toISOString().split('T')[0], // Today
    time: '14:00'
  };

  // Naive capacity extraction
  const capacityMatch = lowerQuery.match(/(\d+)\s*(people|students|persons|capacity)/);
  if (capacityMatch && capacityMatch[1]) {
    intent.capacity = parseInt(capacityMatch[1], 10);
  } else if (lowerQuery.includes('large')) {
    intent.capacity = 50;
  }

  // Naive hardware extraction
  if (lowerQuery.includes('gpu') || lowerQuery.includes('graphic')) {
    intent.hardware = 'GPU Workstations';
  } else if (lowerQuery.includes('mac') || lowerQuery.includes('apple')) {
    intent.hardware = 'Macs';
  } else if (lowerQuery.includes('projector') || lowerQuery.includes('presentation')) {
    intent.hardware = 'Projector';
  }

  // Naive time extraction (just looking for numbers like "4 pm", "16:00")
  const timeMatch = lowerQuery.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const isPm = timeMatch[3] === 'pm';
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    
    const minutes = timeMatch[2] || '00';
    intent.time = `${hour.toString().padStart(2, '0')}:${minutes}`;
  }

  // Date extraction
  if (lowerQuery.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    intent.date = tomorrow.toISOString().split('T')[0];
  }

  return intent;
}
