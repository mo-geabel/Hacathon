import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { bookings } from "../../db/schema";
import { parseBookingIntent } from "../../services/geminiService";
import { antiGhostingWorker } from "../../workers/antiGhostingWorker";

const router = Router();

/** POST /api/bookings/parse — NL text → structured intent (Gemini) */
router.post("/parse", async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as { text: string };
  if (!text) { res.status(400).json({ error: "text is required" }); return; }

  const intent = await parseBookingIntent(text);
  res.json({ data: intent });
});

/** GET /api/bookings — list bookings (optionally filter by status) */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(bookings);
  res.json({ data: rows });
});

/** GET /api/bookings/:id */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  res.json({ data: booking });
});

/** POST /api/bookings — create a booking */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    userId: string; facilityId: string; title: string;
    expectedAttendees: number; scheduledStart: string; scheduledEnd: string;
    rawNlRequest?: string; geminiParsedData?: Record<string, unknown>;
  };

  const [newBooking] = await db.insert(bookings).values({
    userId: body.userId,
    facilityId: body.facilityId,
    title: body.title,
    expectedAttendees: body.expectedAttendees,
    scheduledStart: new Date(body.scheduledStart),
    scheduledEnd: new Date(body.scheduledEnd),
    rawNlRequest: body.rawNlRequest,
    geminiParsedData: body.geminiParsedData,
    status: "confirmed",
  }).returning();

  res.status(201).json({ data: newBooking });
});

/** POST /api/bookings/:id/checkin — IoT QR scan triggers check-in */
router.post("/:id/checkin", async (req: Request, res: Response): Promise<void> => {
  await antiGhostingWorker.handleCheckIn(req.params.id);
  res.json({ success: true });
});

/** PATCH /api/bookings/:id/cancel */
router.patch("/:id/cancel", async (req: Request, res: Response): Promise<void> => {
  await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(bookings.id, req.params.id));
  res.json({ success: true });
});

export default router;
