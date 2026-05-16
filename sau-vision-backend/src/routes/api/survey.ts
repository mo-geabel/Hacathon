import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { registrations, bookings, students } from "../../db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { requireAuth, requireStudent } from "../../middleware/auth";
import { SURVEY_QUESTIONS, calculateSurveyScore } from "../../config/surveyQuestions";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/survey/questions
// Returns the current dynamic question config (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/questions", (_req: Request, res: Response) => {
  res.json({ questions: SURVEY_QUESTIONS });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/survey/:bookingId/my-status
// Tells the guest whether they have already submitted feedback for this booking
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:bookingId/my-status", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const studentId = req.user!.id;

  const reg = await db.query.registrations.findFirst({
    where: and(
      eq(registrations.bookingId, bookingId),
      eq(registrations.studentId, studentId)
    )
  });

  if (!reg) {
    res.status(404).json({ error: "You are not registered for this event." });
    return;
  }

  if (reg.status !== "attended") {
    res.status(403).json({ error: "Only attendees who checked in can submit feedback." });
    return;
  }

  const hasSubmitted = !!reg.postEventFeedback;
  const answers = hasSubmitted ? JSON.parse(reg.postEventFeedback!) : null;

  res.json({ hasSubmitted, answers });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/survey/:bookingId/submit
// Attended guest submits their survey answers
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:bookingId/submit", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const studentId = req.user!.id;
  const { answers } = req.body;  // { organization: 4, content_quality: 5, ... }

  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "Survey answers are required." });
    return;
  }

  // Validate required questions are answered
  const requiredIds = SURVEY_QUESTIONS.filter(q => q.required && q.type !== "text").map(q => q.id);
  const missing = requiredIds.filter(id => answers[id] === undefined || answers[id] === null);
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing answers for: ${missing.join(", ")}` });
    return;
  }

  // Find the guest's registration
  const reg = await db.query.registrations.findFirst({
    where: and(
      eq(registrations.bookingId, bookingId),
      eq(registrations.studentId, studentId)
    ),
    with: { booking: true }
  });

  if (!reg) {
    res.status(404).json({ error: "You are not registered for this event." });
    return;
  }
  if (reg.status !== "attended") {
    res.status(403).json({ error: "Only attendees who have checked in can submit feedback." });
    return;
  }
  if (reg.postEventFeedback) {
    res.status(409).json({ error: "You have already submitted feedback for this event." });
    return;
  }

  // Calculate score
  const score = calculateSurveyScore(answers);
  const payload = JSON.stringify({ ...answers, _score: score, _submittedAt: new Date().toISOString() });

  // Save answers to the registration
  await db.update(registrations)
    .set({ postEventFeedback: payload, updatedAt: new Date() })
    .where(eq(registrations.id, reg.id));

  // ── Recalculate organiser's eventRating ────────────────────────────────────
  // Gather all feedback for all events organized by this student
  const organizerStudentId = (reg as any).booking.studentId;

  const allFeedbackRegs = await db.query.registrations.findMany({
    where: isNotNull(registrations.postEventFeedback),
    with: { booking: true }
  });

  // Filter to only registrations that belong to events organised by this student
  const relevantFeedback = allFeedbackRegs.filter(
    (r: any) => r.booking?.studentId === organizerStudentId && r.postEventFeedback
  );

  if (relevantFeedback.length > 0) {
    const scores = relevantFeedback.map((r: any) => {
      try {
        const parsed = JSON.parse(r.postEventFeedback!);
        return typeof parsed._score === "number" ? parsed._score : 0;
      } catch { return 0; }
    });
    const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    // Convert 0-100 score to 0-5 eventRating
    const newEventRating = parseFloat((avgScore / 20).toFixed(2));

    await db.update(students)
      .set({ eventRating: newEventRating, updatedAt: new Date() })
      .where(eq(students.id, organizerStudentId));
  }

  res.json({
    message: "Feedback submitted successfully. Thank you!",
    score,
    yourAnswers: answers
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/survey/:bookingId/results
// Organizer fetches aggregated survey results for their event
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:bookingId/results", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId)
  });

  if (!booking) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  // Only organizer or admin can see results
  if (req.user!.role !== "admin" && booking.studentId !== userId) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  const regs = await db.query.registrations.findMany({
    where: and(
      eq(registrations.bookingId, bookingId),
      isNotNull(registrations.postEventFeedback)
    )
  });

  const responses = regs.map((r: any) => {
    try { return JSON.parse(r.postEventFeedback!); }
    catch { return null; }
  }).filter(Boolean);

  if (responses.length === 0) {
    res.json({ totalResponses: 0, averageScore: null, questions: SURVEY_QUESTIONS, perQuestion: {} });
    return;
  }

  // Aggregate per question
  const perQuestion: Record<string, any> = {};
  for (const q of SURVEY_QUESTIONS) {
    if (q.type === "rating") {
      const vals = responses.map((r: any) => Number(r[q.id])).filter((v: number) => !isNaN(v));
      perQuestion[q.id] = {
        type: "rating",
        question: q.question,
        average: vals.length > 0 ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2)) : null,
        responses: vals.length,
        distribution: [1,2,3,4,5].map(v => ({ value: v, count: vals.filter((x: number) => x === v).length }))
      };
    } else if (q.type === "boolean") {
      const vals = responses.map((r: any) => r[q.id]);
      const yesCount = vals.filter((v: any) => v === true || v === "true").length;
      perQuestion[q.id] = {
        type: "boolean",
        question: q.question,
        yesCount,
        noCount: vals.length - yesCount,
        yesPercent: vals.length > 0 ? Math.round((yesCount / vals.length) * 100) : 0
      };
    } else if (q.type === "text") {
      perQuestion[q.id] = {
        type: "text",
        question: q.question,
        comments: responses.map((r: any) => r[q.id]).filter((v: any) => v && v.trim())
      };
    }
  }

  const scores = responses.map((r: any) => typeof r._score === "number" ? r._score : 0);
  const averageScore = parseFloat((scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1));

  res.json({
    totalResponses: responses.length,
    averageScore,          // 0-100
    averageRating: parseFloat((averageScore / 20).toFixed(2)), // 0-5
    questions: SURVEY_QUESTIONS,
    perQuestion
  });
}));

export default router;
