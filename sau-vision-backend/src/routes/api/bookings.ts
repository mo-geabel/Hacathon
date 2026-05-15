import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { bookings } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/bookings
// List bookings with optional filters (status, labId)
router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { status, labId } = req.query;
  const filters = [];

  if (typeof status === "string") filters.push(eq(bookings.status, status as any));
  if (typeof labId === "string") filters.push(eq(bookings.labId, labId));

  const allBookings = await db.query.bookings.findMany({
    where: filters.length ? and(...filters) : undefined,
    with: {
      student: { columns: { passwordHash: false } }, // Exclude password
      lab: true,
      registrations: true
    },
    orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
  });

  res.json(allBookings);
}));

// POST /api/bookings
// Create a new booking
router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { labId, title, description, expectedAttendees, scheduledStart, scheduledEnd } = req.body;
  const studentId = req.user!.id; // from requireAuth

  if (!labId || !title || !expectedAttendees || !scheduledStart || !scheduledEnd) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [newBooking] = await db.insert(bookings).values({
    studentId,
    labId,
    title,
    description,
    expectedAttendees,
    scheduledStart: new Date(scheduledStart),
    scheduledEnd: new Date(scheduledEnd),
    status: "pending"
  }).returning();

  res.status(201).json(newBooking);
}));

// GET /api/bookings/:id
// Get details of a specific booking
router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      student: { columns: { passwordHash: false } },
      lab: true,
      registrations: {
        with: {
          student: { columns: { passwordHash: false } }
        }
      }
    }
  });

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(booking);
}));

// PATCH /api/bookings/:id/status
// Admin endpoint to approve/reject a booking
router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const { status } = req.body; // 'approved' or 'rejected'

  if (status !== "approved" && status !== "rejected") {
    res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    return;
  }

  const [updatedBooking] = await db.update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
    .returning();

  if (!updatedBooking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(updatedBooking);
}));

export default router;
