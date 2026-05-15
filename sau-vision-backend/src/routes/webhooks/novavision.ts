import { Router, Request, Response, raw } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../../db/client";
import { facilities, bookings, eventAnalytics } from "../../db/schema";
import { verifyNovaVisionSignature } from "../../middleware/webhookAuth";
import { antiGhostingWorker } from "../../workers/antiGhostingWorker";

const router = Router();

interface NovaVisionPayload {
  event: "occupancy_update" | "zone_empty" | "zone_full" | "stream_error";
  camera_id: string;
  timestamp: string;
  person_count: number;
  confidence: number;
}

/**
 * POST /webhooks/novavision
 * Receives live occupancy snapshots from NovaVision Vision AI.
 * 1. Validates HMAC-SHA256 signature
 * 2. Resolves camera_id → facility
 * 3. Updates currentOccupancy
 * 4. Logs to event_analytics
 * 5. Triggers Anti-Ghosting if zone is empty
 */
router.post(
  "/novavision",
  raw({ type: "application/json" }), // raw body needed for HMAC
  verifyNovaVisionSignature,
  async (req: Request, res: Response): Promise<void> => {
    const payload: NovaVisionPayload = JSON.parse((req.body as Buffer).toString("utf8"));
    const { camera_id, person_count, timestamp, event } = payload;

    const [facility] = await db.select().from(facilities).where(eq(facilities.novavisionCameraId, camera_id)).limit(1);
    if (!facility) {
      res.status(200).json({ acknowledged: true, warning: "unknown_camera" });
      return;
    }

    await db.update(facilities).set({ currentOccupancy: person_count, updatedAt: new Date() }).where(eq(facilities.id, facility.id));

    const now = new Date(timestamp);
    const [activeBooking] = await db.select().from(bookings).where(
      and(eq(bookings.facilityId, facility.id), eq(bookings.status, "active"), lte(bookings.scheduledStart, now), gte(bookings.scheduledEnd, now))
    ).limit(1);

    if (activeBooking) {
      await db.insert(eventAnalytics).values({
        bookingId: activeBooking.id,
        facilityId: facility.id,
        source: "novavision",
        personCount: person_count,
        occupancyRatio: person_count / facility.capacity,
        rawPayload: payload as Record<string, unknown>,
        recordedAt: now,
      });

      if (person_count === 0 && event === "zone_empty") {
        await antiGhostingWorker.handleEmptyZone(activeBooking.id, now);
      }
    }

    res.status(200).json({ acknowledged: true });
  }
);

export default router;
