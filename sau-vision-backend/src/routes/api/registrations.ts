import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { registrations, bookings, students } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireStudent } from "../../middleware/auth";
import { puqAiEvaluateStudent } from "../../services/puqai";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/registrations/my
// Student fetches their own registrations (joined events)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.user!.id;

  const myRegs = await db.query.registrations.findMany({
    where: eq(registrations.studentId, studentId),
    with: {
      booking: {
        with: {
          lab: { with: { faculty: true } },
          student: { columns: { fullName: true } }
        }
      }
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)]
  });

  // Flatten organizer name for easy frontend access
  const formatted = myRegs.map((reg: any) => ({
    ...reg,
    booking: {
      ...reg.booking,
      organizer: reg.booking?.student,
    }
  }));

  res.json(formatted);
}));

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

  // Fetch full student details for puq.ai evaluation
  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId)
  });

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  // 🤖 Run the puq.ai Automation Pipeline
  const aiEvaluation = await puqAiEvaluateStudent({
    fullName: student.fullName,
    gpa: student.gpa,
    eventRating: student.eventRating,
    ghostedEventCount: student.ghostedEventCount
  });

  const [newRegistration] = await db.insert(registrations).values({
    studentId,
    bookingId,
    status: "registered",
    aiScore: aiEvaluation.aiScore,
    aiRecommendation: aiEvaluation.aiRecommendation
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
