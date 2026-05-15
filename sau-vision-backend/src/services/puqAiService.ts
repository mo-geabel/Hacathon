import axios from "axios";

const client = axios.create({
  baseURL: process.env.PUQAI_BASE_URL ?? "https://api.puq.ai/v1",
  headers: { Authorization: `Bearer ${process.env.PUQAI_API_KEY}`, "Content-Type": "application/json" },
  timeout: 15_000,
});

export interface PuqAiJobPayload {
  booking_id: string;
  facility_name: string;
  facility_capacity: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  peak_occupancy: number;
  average_occupancy: number;
  student_name: string;
  student_university_id: string;
  event_title: string;
  /** Our webhook URL — puq.ai will POST the report here when ready */
  callback_url: string;
}

export interface PuqAiJobResponse {
  job_id: string;
  status: "queued" | "processing";
  estimated_completion_seconds: number;
}

/**
 * Submits a completed event to puq.ai for async report generation.
 * puq.ai calls back /webhooks/puqai when the PDF is ready.
 */
export async function submitEventReport(payload: PuqAiJobPayload): Promise<PuqAiJobResponse> {
  const { data } = await client.post<PuqAiJobResponse>("/reports/event", payload);
  console.info(`[puq.ai] Job queued: ${data.job_id} for booking ${payload.booking_id}`);
  return data;
}
