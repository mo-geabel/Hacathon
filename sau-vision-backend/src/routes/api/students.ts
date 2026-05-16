import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { studentHistory } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireStudent } from "../../middleware/auth";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/students/me/history
// Retrieves the logged-in student's behavioral history statistics
router.get("/me/history", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.user!.id;

  // Fetch all history events for this student
  const events = await db.query.studentHistory.findMany({
    where: eq(studentHistory.studentId, studentId),
    orderBy: (history, { desc }) => [desc(history.createdAt)],
  });

  // Calculate statistics based on the events
  let bookingsCount = 0;
  let cancellationsCount = 0;
  let delaysCount = 0;

  for (const event of events) {
    if (event.eventType === "booking_created") {
      bookingsCount++;
    } else if (event.eventType === "last_minute_cancellation" || event.eventType === "ghosted") {
      cancellationsCount++;
    } else if (event.eventType === "delay_recorded") {
      delaysCount++;
    }
  }

  // Return the calculated statistics and the raw timeline
  res.json({
    statistics: {
      bookings: bookingsCount,
      lastMinuteCancellations: cancellationsCount,
      recordedDelays: delaysCount,
    },
    timeline: events
  });
}));

export default router;
