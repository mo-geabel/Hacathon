import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { bookings, labs } from "../../db/schema";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { geminiModel } from "../../services/gemini";

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

// POST /api/bookings/parse
// AI-Powered Endpoint: Translates a natural language string into a Lab ID
router.post("/parse", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { prompt, expectedAttendees } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Missing 'prompt' in request body" });
    return;
  }

  // 1. Fetch available labs from the DB that can fit the attendees
  // If expectedAttendees is provided, filter by capacity. Otherwise, fetch all active labs.
  const labFilters = [eq(labs.isActive, true)];
  if (expectedAttendees) {
    labFilters.push(gte(labs.capacity, expectedAttendees));
  }

  const availableLabs = await db.query.labs.findMany({
    where: and(...labFilters),
    with: { faculty: { columns: { name: true, code: true } } }
  });

  if (availableLabs.length === 0) {
    res.status(404).json({ error: "No labs available that match the capacity requirements." });
    return;
  }

  // 2. Format the labs into a compressed string for Gemini
  const labsContext = availableLabs.map(l => {
    const tags = (l.aiTags as string[] | null) || [];
    return `ID: ${l.id} | Name: ${l.name} | Faculty: ${l.faculty.name} | Type: ${l.type} | Capacity: ${l.capacity} | Tags: ${tags.join(",")} | Description: ${l.aiDescription}`;
  }).join("\n");

  // 3. Construct the prompt for Gemini
  const systemPrompt = `
You are the AI Facility Manager for Sakarya University (SAÜ-Vision).
A student is trying to book a room. Their request is: "${prompt}"

Here is the list of available laboratories:
${labsContext}

Your task is to find the single best matching laboratory for this request.
You MUST return a valid JSON object matching this exact schema:
{
  "matchedLabId": "UUID string of the best lab",
  "confidenceScore": number between 1-100,
  "reason": "A short, friendly sentence explaining to the student why you chose this lab.",
  "detectedRequirements": ["list", "of", "requirements", "you", "found", "in", "the", "prompt"]
}

If no lab is a good fit, return null for matchedLabId and explain why in the reason field.
`;

  // 4. Call Gemini
  const result = await geminiModel.generateContent(systemPrompt);
  const responseText = result.response.text();

  try {
    const parsedData = JSON.parse(responseText);
    res.json({
      originalPrompt: prompt,
      geminiResult: parsedData
    });
  } catch (error) {
    console.error("Gemini JSON Parsing Error:", responseText);
    res.status(500).json({ error: "AI returned invalid format", raw: responseText });
  }
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
