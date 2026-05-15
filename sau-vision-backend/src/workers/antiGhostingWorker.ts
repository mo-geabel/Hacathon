import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { bookings, facilities } from "../db/schema";

const EMPTY_ZONE_GRACE_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_TO_RECLAIM_MS = 5 * 60 * 1000;  // 5 minutes

/** bookingId → active reclamation timer */
const reclaimTimers = new Map<string, NodeJS.Timeout>();

export const antiGhostingWorker = {
  /**
   * Called when NovaVision reports person_count === 0 on an active booking.
   * Starts the 10-min grace check → 5-min warning → reclaim flow.
   */
  async handleEmptyZone(bookingId: string, detectedAt: Date): Promise<void> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking || booking.status !== "active") return;
    if (booking.warningIssuedAt !== null) return; // already in warning phase

    const elapsedMs = detectedAt.getTime() - booking.scheduledStart.getTime();
    if (elapsedMs < EMPTY_ZONE_GRACE_MS) {
      console.info(`[AntiGhosting] Booking ${bookingId}: empty at T+${Math.round(elapsedMs / 60000)}min — within grace period.`);
      return;
    }

    // Issue warning
    const warningTime = new Date();
    await db.update(bookings).set({ warningIssuedAt: warningTime, updatedAt: warningTime }).where(eq(bookings.id, bookingId));
    console.warn(`[AntiGhosting] ⚠️  Warning issued for booking ${bookingId}`);

    // TODO: push notification to user here

    // Start 5-minute reclamation countdown
    const timer = setTimeout(() => antiGhostingWorker.reclaimFacility(bookingId), WARNING_TO_RECLAIM_MS);
    reclaimTimers.set(bookingId, timer);
  },

  /**
   * Called when the IoT QR scanner registers a check-in.
   * Cancels any pending reclamation timer.
   */
  async handleCheckIn(bookingId: string): Promise<void> {
    const timer = reclaimTimers.get(bookingId);
    if (timer) {
      clearTimeout(timer);
      reclaimTimers.delete(bookingId);
      console.info(`[AntiGhosting] ✅ Check-in for ${bookingId} — reclamation cancelled.`);
    }
    const now = new Date();
    await db.update(bookings).set({ checkInRegistered: true, checkInTime: now, warningIssuedAt: null, updatedAt: now }).where(eq(bookings.id, bookingId));
  },

  /**
   * Final reclamation: flips booking → ghosted, facility → available.
   * Runs inside a DB transaction for atomicity.
   */
  async reclaimFacility(bookingId: string): Promise<void> {
    reclaimTimers.delete(bookingId);

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking || booking.checkInRegistered) return; // late check-in guard

    const now = new Date();
    const reason = `Anti-Ghosting: NovaVision reported empty zone at T+10min. No IoT check-in within 5-min warning window. Released at ${now.toISOString()}.`;

    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: "ghosted", ghostedAt: now, ghostReason: reason, updatedAt: now }).where(eq(bookings.id, bookingId));
      await tx.update(facilities).set({ status: "available", currentOccupancy: 0, updatedAt: now }).where(eq(facilities.id, booking.facilityId));
    });

    console.warn(`[AntiGhosting] 👻 Booking ${bookingId} GHOSTED — facility ${booking.facilityId} released.`);
    // TODO: push notification to user here
  },
};
