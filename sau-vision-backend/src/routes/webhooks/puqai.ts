import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { bookings, eventAnalytics } from "../../db/schema";
import { verifyPuqAiToken } from "../../middleware/webhookAuth";

const router = Router();

interface PuqAiReportPayload {
  job_id: string;
  booking_id: string;
  status: "completed" | "failed";
  roi_score: number;
  utilization_grade: "A" | "B" | "C" | "D" | "F";
  peak_occupancy: number;
  actual_duration_minutes: number;
  certificate_url: string;
  roi_report_url: string;
  recommendations: string[];
}

/**
 * POST /webhooks/puqai
 * Receives the async post-event report from puq.ai.
 * Persists certificate & ROI URLs, writes aggregate analytics row.
 */
router.post("/puqai", verifyPuqAiToken, async (req: Request, res: Response): Promise<void> => {
  const payload: PuqAiReportPayload = req.body;

  if (payload.status === "failed") {
    console.error(`[puq.ai] Job ${payload.job_id} failed`);
    res.status(200).json({ received: true });
    return;
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, payload.booking_id)).limit(1);
  if (!booking) {
    res.status(200).json({ received: true, warning: "unknown_booking" });
    return;
  }

  await db.update(bookings).set({
    certificateUrl: payload.certificate_url,
    roiReportUrl: payload.roi_report_url,
    puqAiReportPayload: payload as Record<string, unknown>,
    status: "completed",
    updatedAt: new Date(),
  }).where(eq(bookings.id, payload.booking_id));

  await db.insert(eventAnalytics).values({
    bookingId: payload.booking_id,
    facilityId: booking.facilityId,
    source: "puq_ai",
    peakOccupancy: payload.peak_occupancy,
    actualDurationMinutes: payload.actual_duration_minutes,
    roiScore: payload.roi_score,
    rawPayload: payload as Record<string, unknown>,
    notes: payload.recommendations.join("; "),
    recordedAt: new Date(),
  });

  console.info(`[puq.ai] ✅ Report saved for booking ${payload.booking_id} — ROI: ${payload.roi_score}`);
  res.status(200).json({ received: true });
});

export default router;
