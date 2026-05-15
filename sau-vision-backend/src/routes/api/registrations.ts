import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { registrations, bookings } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireStudent } from "../../middleware/auth";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/registrations/:bookingId
// Student registers for an event
router.post("/:bookingId", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId;
  const studentId = req.user!.id;

  // Verify the booking exists
  const event = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId)
  });

  if (!event) {
    res.status(404).json({ error: "Event (booking) not found" });
    return;
  }

  // Prevent duplicate registration
  const existing = await db.query.registrations.findFirst({
    where: and(
      eq(registrations.studentId, studentId),
      eq(registrations.bookingId, bookingId)
    )
  });

  if (existing) {
    res.status(400).json({ error: "You are already registered for this event" });
    return;
  }

  const [newRegistration] = await db.insert(registrations).values({
    studentId,
    bookingId,
    status: "registered"
  }).returning();

  res.status(201).json(newRegistration);
}));

// DELETE /api/registrations/:bookingId
// Student cancels their registration
router.delete("/:bookingId", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId;
  const studentId = req.user!.id;

  const [deletedRegistration] = await db.delete(registrations)
    .where(and(
      eq(registrations.studentId, studentId),
      eq(registrations.bookingId, bookingId)
    ))
    .returning();

  if (!deletedRegistration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  res.json({ message: "Registration cancelled successfully" });
}));

export default router;
