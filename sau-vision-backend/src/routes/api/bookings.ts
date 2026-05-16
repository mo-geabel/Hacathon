import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { bookings, labs, studentHistory, registrations, students } from "../../db/schema";
import { eq, and, gte, lt, or } from "drizzle-orm";
import { requireAuth, requireAdmin, requireStudent } from "../../middleware/auth";
import { geminiModel } from "../../services/gemini";
import axios from "axios";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings
// Role-scoped listing:
//   • Student → only sees their own bookings (hard-scoped by JWT studentId)
//   • Admin   → sees all bookings in their faculty's labs (scoped by facultyId)
//               Pass ?labId=... or ?status=... to filter further
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { status, labId } = req.query;
  const { role, id: userId, facultyId } = req.user!;

  // Helper function to calculate a student's importance score
  const calculateScore = (student: any) => {
    // Event rating (0-5) has higher weight (x15) than GPA (0-4) (x5)
    const gpaScore = (student.gpa || 0) * 5;
    const ratingScore = (student.eventRating || 0) * 15;
    const penalty = (student.ghostedEventCount || 0) * 30;
    return gpaScore + ratingScore - penalty;
  };

  // Helper function to sort a list of bookings by student performance
  const sortBookingsByPerformance = (bookingsList: any[]) => {
    return bookingsList.sort((a, b) => {
      const scoreA = calculateScore(a.student);
      const scoreB = calculateScore(b.student);
      
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  };

  const filters = [];

  // Students can only ever see their own bookings
  if (role === "student") {
    filters.push(eq(bookings.studentId, userId));
  }

  // Admins are scoped to bookings whose lab belongs to their faculty
  // If a ?labId= filter is provided it overrides the faculty-wide scope
  if (role === "admin") {
    if (typeof labId === "string") {
      filters.push(eq(bookings.labId, labId));
    } else if (facultyId) {
      // Join through labs to filter by facultyId
      const facultyLabs = await db
        .select({ id: labs.id })
        .from(labs)
        .where(eq(labs.facultyId, facultyId));

      const labIds = facultyLabs.map((l) => l.id);
      if (labIds.length === 0) {
        res.json([]); // Admin has no labs yet
        return;
      }
      // Drizzle doesn't have inArray in this version — filter in JS
      const allBookings = await db.query.bookings.findMany({
        where: status
          ? eq(bookings.status, status as any)
          : undefined,
        with: {
          student: { columns: { passwordHash: false } },
          lab: true,
          registrations: true,
        },
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      });

      const scoped = allBookings.filter((b) => labIds.includes(b.labId));
      res.json(sortBookingsByPerformance(scoped));
      return;
    }
  }

  if (typeof status === "string") filters.push(eq(bookings.status, status as any));

  const allBookings = await db.query.bookings.findMany({
    where: filters.length ? and(...filters) : undefined,
    with: {
      student: { columns: { passwordHash: false } },
      lab: true,
      registrations: true,
    },
    orderBy: (b, { desc }) => [desc(b.createdAt)],
  });

  res.json(sortBookingsByPerformance(allBookings));
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/events
// Student only — fetch all approved events (expectedAttendees > 1)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/events", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.user!.id;
  
  const allEvents = await db.query.bookings.findMany({
    where: and(
      or(eq(bookings.status, "approved"), eq(bookings.status, "active")),
      gte(bookings.expectedAttendees, 2)
    ),
    with: {
      lab: {
        with: { faculty: { columns: { name: true } } }
      },
      student: { columns: { fullName: true } },
      registrations: true
    },
    orderBy: (b, { asc }) => [asc(b.scheduledStart)],
  });

  const formattedEvents = allEvents.map((event) => {
    const isRegistered = event.registrations.some((r: any) => r.studentId === studentId);
    
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      scheduledStart: event.scheduledStart,
      scheduledEnd: event.scheduledEnd,
      requiresCertificate: event.requiresCertificate,
      expectedAttendees: event.expectedAttendees,
      attendeeCount: event.registrations.length,
      isRegistered,
      lab: {
        id: event.lab.id,
        name: event.lab.name,
        faculty: event.lab.faculty?.name || "Unknown Faculty",
      },
      organizer: event.student?.fullName || "Unknown Organizer",
    };
  });

  res.json(formattedEvents);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:id/join-info
// Public endpoint (no auth required) — fetch event info for the QR scan landing page
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/join-info", asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      lab: true,
      student: { columns: { fullName: true } },
      registrations: true
    }
  });

  if (!booking || (booking.status !== "approved" && booking.status !== "active")) {
    res.status(404).json({ error: "Event not found or not active." });
    return;
  }

  res.json({
    id: booking.id,
    title: booking.title,
    scheduledStart: booking.scheduledStart,
    scheduledEnd: booking.scheduledEnd,
    requiresCertificate: booking.requiresCertificate,
    expectedAttendees: booking.expectedAttendees,
    attendeeCount: booking.registrations.length,
    labName: booking.lab?.name || "Unknown Lab",
    organizerName: booking.student?.fullName || "Unknown Organizer",
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings
// Students only — admins manage facilities, they don't create bookings
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const { labId, title, description, expectedAttendees, scheduledStart, scheduledEnd, requiresCertificate } = req.body;
  const studentId = req.user!.id;

  if (!labId || !title || !expectedAttendees || !scheduledStart || !scheduledEnd) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    res.status(400).json({ error: "Invalid scheduledStart / scheduledEnd" });
    return;
  }

  // Check business hours 09:00 to 18:30
  const startTotalMins = start.getHours() * 60 + start.getMinutes();
  const endTotalMins = end.getHours() * 60 + end.getMinutes();
  if (startTotalMins < 9 * 60 || endTotalMins > 18 * 60 + 30) {
    res.status(400).json({ error: "Bookings must be between 09:00 and 18:30." });
    return;
  }

  // Prevent booking in the past (allow a 5-minute grace period for latency)
  const now = new Date();
  const gracePeriodStart = new Date(now.getTime() - 5 * 60000);
  if (start < gracePeriodStart) {
    res.status(400).json({ error: "Cannot schedule a booking in the past." });
    return;
  }

  // Verify the lab exists and is active
  const lab = await db.query.labs.findFirst({
    where: and(eq(labs.id, labId), eq(labs.isActive, true)),
  });

  if (!lab) {
    res.status(404).json({ error: "Lab not found or is no longer active" });
    return;
  }

  // ── Option B conflict check ────────────────────────────────────────────────
  // Only APPROVED or ACTIVE bookings block the slot.
  // Multiple pending requests for the same window are allowed — admin decides.
  // Two windows overlap when: existingStart < newEnd AND existingEnd > newStart
  const allLabBookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.labId, labId),
      // status IN ('approved', 'active')
      or(
        eq(bookings.status, "approved"),
        eq(bookings.status, "active")
      )
    ),
  });

  const conflict = allLabBookings.find(
    (b) => b.scheduledStart < end && b.scheduledEnd > start
  );

  if (conflict) {
    const conflictStart = conflict.scheduledStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const conflictEnd   = conflict.scheduledEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    res.status(409).json({
      error: `This lab is already booked from ${conflictStart} to ${conflictEnd}. Please choose a different time slot.`,
      conflict: {
        bookingId: conflict.id,
        scheduledStart: conflict.scheduledStart,
        scheduledEnd: conflict.scheduledEnd,
      },
    });
    return;
  }

  const [newBooking] = await db.insert(bookings).values({
    studentId,
    labId,
    title,
    description,
    expectedAttendees,
    scheduledStart: start,
    scheduledEnd: end,
    requiresCertificate: requiresCertificate === true,
    status: "pending",
  }).returning();

  // Log the creation into the student's history
  await db.insert(studentHistory).values({
    studentId,
    bookingId: newBooking.id,
    eventType: "booking_created",
    description: `Created a booking for ${expectedAttendees} attendees in lab ${labId}`
  });

  res.status(201).json(newBooking);
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/parse
// AI-Powered: Translates a natural language request into a matched Lab ID
// Students only — this drives the student chatbot booking flow
// ─────────────────────────────────────────────────────────────────────────────
router.post("/parse", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const { prompt, expectedAttendees, scheduledStart, scheduledEnd } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Missing 'prompt' in request body" });
    return;
  }

  // 1. Fetch active labs with enough capacity
  const labFilters = [eq(labs.isActive, true), eq(labs.status, "available")];
  if (expectedAttendees) {
    labFilters.push(gte(labs.capacity, expectedAttendees));
  }

  const candidateLabs = await db.query.labs.findMany({
    where: and(...labFilters),
    with: { faculty: { columns: { name: true, code: true } } },
  });

  // 2. If a time window is provided, filter out labs that have an
  //    approved/active booking that overlaps — Option B conflict check
  let availableLabs = candidateLabs;
  if (scheduledStart && scheduledEnd) {
    const start = new Date(scheduledStart);
    const end   = new Date(scheduledEnd);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      const blockedBookings = await db.query.bookings.findMany({
        where: or(
          eq(bookings.status, "approved"),
          eq(bookings.status, "active")
        ),
      });
      const blockedLabIds = new Set(
        blockedBookings
          .filter((b) => b.scheduledStart < end && b.scheduledEnd > start)
          .map((b) => b.labId)
      );
      availableLabs = candidateLabs.filter((l) => !blockedLabIds.has(l.id));
    }
  }

  if (availableLabs.length === 0) {
    res.status(404).json({ error: "No labs available that match the capacity requirements." });
    return;
  }

  // 2. Format the labs into a compressed context string for Gemini
  const labsContext = availableLabs.map((l) => {
    const tags = (l.aiTags as string[] | null) || [];
    return `ID: ${l.id} | Name: ${l.name} | Faculty: ${l.faculty.name} | Type: ${l.type} | Capacity: ${l.capacity} | Tags: ${tags.join(",")} | Description: ${l.aiDescription}`;
  }).join("\n");

  // 3. Call Gemini AI to analyze the request and suggest the top 3 labs
  try {
    const aiPrompt = `
You are an intelligent university lab booking assistant at Sakarya University (SAÜ).
A student has made the following request: "${prompt}"

Here is the list of currently available labs in the university:
${labsContext}

Your task:
1. Analyze the student's request — consider capacity, equipment, software (Python, MATLAB, etc.), lab type, and any faculty preference.
2. Rank the TOP 3 best-matching labs from the list above. If fewer than 3 labs are available, return only those that exist.
3. For each suggestion, explain WHY it is a good fit (or why it is not perfect but still acceptable).
4. Extract a short title and description for the booking based on the student's request.
5. Extract or suggest an appropriate number of attendees.

You MUST respond ONLY with a valid JSON object matching this exact structure:
{
  "suggestions": [
    {
      "rank": 1,
      "labId": "the-uuid-of-the-lab",
      "labName": "Human readable lab name",
      "facultyName": "Faculty name",
      "matchScore": 95,
      "reasoning": "Why this lab is the best fit"
    },
    {
      "rank": 2,
      "labId": "second-best-uuid",
      "labName": "Second lab name",
      "facultyName": "Faculty name",
      "matchScore": 80,
      "reasoning": "Why this is the second choice"
    },
    {
      "rank": 3,
      "labId": "third-best-uuid",
      "labName": "Third lab name",
      "facultyName": "Faculty name",
      "matchScore": 60,
      "reasoning": "Why this is still acceptable"
    }
  ],
  "bookingDetails": {
    "extractedTitle": "A concise title for the booking",
    "extractedDescription": "A longer description of what the student needs",
    "suggestedAttendees": 10
  }
}

matchScore should be 0-100 where 100 is a perfect match.
If a lab does not match well at all, do NOT include it in the suggestions — only return labs that are at least somewhat relevant.
If no lab matches, return an empty "suggestions" array and explain in "bookingDetails.extractedDescription".
    `;

    const result = await geminiModel.generateContent(aiPrompt);
    let responseText = result.response.text();
    
    // Strip markdown code fences if Gemini wraps the JSON in them (defensive)
    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // Gemini in JSON mode guarantees valid JSON, but we parse defensively
    const geminiResult = JSON.parse(responseText);

    // 4. Enrich each suggestion with REAL lab data from the database
    //    This ensures the frontend gets full lab details (capacity, type, floor, room, etc.)
    //    and protects against any Gemini hallucination of non-existent IDs.
    const enrichedSuggestions = [];
    for (const suggestion of geminiResult.suggestions || []) {
      const dbLab = availableLabs.find(l => l.id === suggestion.labId);
      if (dbLab) {
        enrichedSuggestions.push({
          ...suggestion,
          lab: {
            id: dbLab.id,
            name: dbLab.name,
            type: dbLab.type,
            capacity: dbLab.capacity,
            floor: (dbLab as any).floor ?? null,
            roomNumber: (dbLab as any).roomNumber ?? null,
            status: dbLab.status,
            faculty: dbLab.faculty,
            aiTags: dbLab.aiTags,
            aiDescription: dbLab.aiDescription,
          }
        });
      }
      // If the lab ID doesn't exist in the DB, skip it (Gemini hallucinated)
    }

    res.json({
      originalPrompt: prompt,
      availableLabCount: availableLabs.length,
      suggestions: enrichedSuggestions,
      bookingDetails: geminiResult.bookingDetails
    });
  } catch (error: any) {
    console.error("Gemini AI Error:", error?.response?.data || error.message);
    res.status(500).json({ error: "AI Parsing failed", details: error.message });
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:id
// • Student → can only fetch their own booking
// • Admin   → can fetch any booking in their faculty's labs
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const { role, id: userId, facultyId } = req.user!;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      student: { columns: { passwordHash: false } },
      lab: { with: { faculty: true } },
      registrations: {
        with: { student: { columns: { passwordHash: false } } },
      },
    },
  });

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Students can only view their own bookings
  if (role === "student" && booking.studentId !== userId) {
    res.status(403).json({ error: "Access denied. This booking does not belong to you." });
    return;
  }

  // Admins can only view bookings for labs inside their faculty
  if (role === "admin" && facultyId) {
    const labFacultyId = (booking as any).lab?.faculty?.id ?? (booking as any).lab?.facultyId;
    if (labFacultyId && labFacultyId !== facultyId) {
      res.status(403).json({ error: "Access denied. This booking is outside your faculty." });
      return;
    }
  }

  res.json(booking);
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id
// Student only — allows editing a booking ONLY if it is still 'pending'
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const studentId = req.user!.id;
  const { labId, title, description, expectedAttendees, scheduledStart, scheduledEnd, studentComment } = req.body;

  // 1. Fetch the existing booking
  const existingBooking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });

  if (!existingBooking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // 2. Ensure ownership and status
  if (existingBooking.studentId !== studentId) {
    res.status(403).json({ error: "Access denied. You can only edit your own bookings." });
    return;
  }

  if (existingBooking.status !== "pending" && existingBooking.status !== "approved") {
    res.status(400).json({ error: "Only pending or approved bookings can be edited." });
    return;
  }

  // 3. Gather updates
  const updates: any = { updatedAt: new Date() };

  // If approved, students can only add/update their comment
  if (existingBooking.status === "approved") {
    if (studentComment !== undefined) {
      updates.studentComment = studentComment;
    } else {
      res.status(400).json({ error: "You can only update your comment on an approved booking." });
      return;
    }
  } else {
    // If pending, they can update everything including comment
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (expectedAttendees !== undefined) updates.expectedAttendees = expectedAttendees;
    if (studentComment !== undefined) updates.studentComment = studentComment;

    let start = existingBooking.scheduledStart;
    let end = existingBooking.scheduledEnd;
    let timeOrLabChanged = false;

    if (scheduledStart) {
      start = new Date(scheduledStart);
      timeOrLabChanged = true;
    }
    if (scheduledEnd) {
      end = new Date(scheduledEnd);
      timeOrLabChanged = true;
    }
    if (labId !== undefined && labId !== existingBooking.labId) {
      updates.labId = labId;
      timeOrLabChanged = true;
    }

    if (timeOrLabChanged) {
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        res.status(400).json({ error: "Invalid scheduledStart / scheduledEnd" });
        return;
      }

      // Check business hours 09:00 to 18:30
      const startTotalMins = start.getHours() * 60 + start.getMinutes();
      const endTotalMins = end.getHours() * 60 + end.getMinutes();
      if (startTotalMins < 9 * 60 || endTotalMins > 18 * 60 + 30) {
        res.status(400).json({ error: "Bookings must be between 09:00 and 18:30." });
        return;
      }
      updates.scheduledStart = start;
      updates.scheduledEnd = end;

      const targetLabId = labId || existingBooking.labId;

      // Verify the lab exists and is active
      const lab = await db.query.labs.findFirst({
        where: and(eq(labs.id, targetLabId), eq(labs.isActive, true)),
      });

      if (!lab) {
        res.status(404).json({ error: "Target lab not found or is no longer active" });
        return;
      }

      // Option B conflict check
      const allLabBookings = await db.query.bookings.findMany({
        where: and(
          eq(bookings.labId, targetLabId),
          or(
            eq(bookings.status, "approved"),
            eq(bookings.status, "active")
          )
        ),
      });

      const conflict = allLabBookings.find(
        (b) => b.id !== bookingId && b.scheduledStart < end && b.scheduledEnd > start
      );

      if (conflict) {
        const conflictStart = conflict.scheduledStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const conflictEnd   = conflict.scheduledEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        res.status(409).json({
          error: `This lab is already booked from ${conflictStart} to ${conflictEnd}. Please choose a different time slot.`,
          conflict: {
            bookingId: conflict.id,
            scheduledStart: conflict.scheduledStart,
            scheduledEnd: conflict.scheduledEnd,
          },
        });
        return;
      }
    }
  }

  const [updatedBooking] = await db
    .update(bookings)
    .set(updates)
    .where(eq(bookings.id, bookingId))
    .returning();

  res.json(updatedBooking);
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/status
// Admin only — approve or reject a pending booking
// Admin must belong to the same faculty as the lab in the booking
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const { status } = req.body;
  const { facultyId } = req.user!;

  if (status !== "approved" && status !== "rejected") {
    res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    return;
  }

  // Fetch the booking with its lab to verify faculty ownership
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { lab: true },
  });

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  // Ensure the admin only approves bookings for their own faculty's labs
  if (facultyId && (booking as any).lab.facultyId !== facultyId) {
    res.status(403).json({ error: "Access denied. This booking is outside your faculty." });
    return;
  }

  // ── Prevent Double Booking on Approval ─────────────────────────────────────
  // If the admin is trying to approve this booking, we must ensure the lab
  // isn't ALREADY approved/active for this time slot by another request.
  if (status === "approved") {
    const start = new Date(booking.scheduledStart);
    const end = new Date(booking.scheduledEnd);

    const overlappingBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.labId, booking.labId),
        or(eq(bookings.status, "approved"), eq(bookings.status, "active"))
      )
    });

    const conflict = overlappingBookings.find(
      (b) => b.id !== bookingId && b.scheduledStart < end && b.scheduledEnd > start
    );

    if (conflict) {
      const conflictStart = conflict.scheduledStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const conflictEnd   = conflict.scheduledEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      res.status(409).json({
        error: `Cannot approve: This lab is already booked from ${conflictStart} to ${conflictEnd}.`,
        conflict: {
          bookingId: conflict.id,
          scheduledStart: conflict.scheduledStart,
          scheduledEnd: conflict.scheduledEnd,
        },
      });
      return;
    }
  }

  const [updatedBooking] = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
    .returning();

  res.json(updatedBooking);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:id/invitations
// Organizer only — fetch the list of QR code payloads for all attendees
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/invitations", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const studentId = req.user!.id;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      registrations: {
        with: { student: { columns: { passwordHash: false } } },
      }
    }
  });

  if (!booking || booking.studentId !== studentId) {
    res.status(404).json({ error: "Booking not found or not owned by you" });
    return;
  }

  // Generate QR code strings (Payloads) for each registered student
  const invitations = (booking.registrations as any[]).map((reg: any) => {
    return {
      student: reg.student,
      qrPayload: `sau-vision://checkin/${reg.id}`,
      status: reg.status
    };
  });

  res.json({
    bookingId: booking.id,
    title: booking.title,
    invitations
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:id/my-qr
// Student only — fetch your own personal QR code for an event you registered for
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/my-qr", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
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

  res.json({
    registrationId: reg.id,
    qrPayload: `sau-vision://checkin/${reg.id}`,
    status: reg.status
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/checkin
// Admin/Organizer only — scan a QR code to mark a student as attended
// ─────────────────────────────────────────────────────────────────────────────
router.post("/checkin", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { qrPayload } = req.body;
  const userId = req.user!.id;

  if (!qrPayload || !qrPayload.startsWith("sau-vision://checkin/")) {
    res.status(400).json({ error: "Invalid QR code format" });
    return;
  }

  const registrationId = qrPayload.split("sau-vision://checkin/")[1];

  const reg = await db.query.registrations.findFirst({
    where: eq(registrations.id, registrationId),
    with: { booking: true }
  });

  if (!reg) {
    res.status(404).json({ error: "Registration not found for this QR code" });
    return;
  }

  // Verify the person scanning is the organizer or an admin
  if (req.user!.role !== "admin" && reg.booking.studentId !== userId) {
    res.status(403).json({ error: "Access denied. You are not the organizer of this event." });
    return;
  }

  if (reg.status === "attended") {
    res.status(400).json({ error: "Student has already been checked in." });
    return;
  }

  // Check if 3 hours have passed since the scheduled end time
  const scheduledEnd = new Date(reg.booking.scheduledEnd);
  const now = new Date();
  const threeHoursInMs = 3 * 60 * 60 * 1000;
  
  if (now.getTime() > scheduledEnd.getTime() + threeHoursInMs) {
    res.status(403).json({ error: "Attendance window closed. It has been more than 3 hours since the event ended." });
    return;
  }

  const [updatedReg] = await db
    .update(registrations)
    .set({
      status: "attended",
      checkInTime: new Date(),
      updatedAt: new Date()
    })
    .where(eq(registrations.id, registrationId))
    .returning();

  res.json({
    message: "Check-in successful",
    registration: updatedReg
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/:id/self-checkin
// Student self-service: scan the host's event QR → register + mark attended in one shot
// Works for both new guests (auto-registers) and already-registered guests (idempotent)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/self-checkin", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const studentId = req.user!.id;

  // 1. Verify the event exists and is approved/active
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { lab: true, registrations: true }
  });

  if (!booking || (booking.status !== "approved" && booking.status !== "active")) {
    res.status(404).json({ error: "Event not found or is not currently accepting attendees." });
    return;
  }

  // Check if 3 hours have passed since the scheduled end time
  const scheduledEnd = new Date(booking.scheduledEnd);
  const now = new Date();
  const threeHoursInMs = 3 * 60 * 60 * 1000;
  
  if (now.getTime() > scheduledEnd.getTime() + threeHoursInMs) {
    res.status(403).json({ error: "Attendance window closed. It has been more than 3 hours since the event ended." });
    return;
  }

  // 2. Prevent the organizer from self-checking into their own event
  if (booking.studentId === studentId) {
    res.status(400).json({ error: "You are the organizer of this event and cannot register as an attendee." });
    return;
  }

  // 3. Check capacity
  const currentAttendees = (booking.registrations as any[]).length;
  if (currentAttendees >= booking.expectedAttendees) {
    res.status(409).json({ error: "This event has reached its maximum capacity." });
    return;
  }

  // 4. Find or create the registration
  let reg = await db.query.registrations.findFirst({
    where: and(
      eq(registrations.bookingId, bookingId),
      eq(registrations.studentId, studentId)
    )
  });

  if (!reg) {
    // Guest is new — create registration
    const [newReg] = await db.insert(registrations).values({
      bookingId,
      studentId,
      status: "registered",
    }).returning();
    reg = newReg;
  }

  // 5. If already attended — idempotent, just return success
  if (reg.status === "attended") {
    res.json({
      message: "You are already checked in!",
      alreadyAttended: true,
      registration: reg
    });
    return;
  }

  // 6. Mark as attended
  const [updatedReg] = await db
    .update(registrations)
    .set({
      status: "attended",
      checkInTime: new Date(),
      updatedAt: new Date()
    })
    .where(eq(registrations.id, reg.id))
    .returning();

  res.json({
    message: "Self check-in successful! Your attendance has been recorded.",
    alreadyAttended: false,
    registration: updatedReg,
    eventTitle: booking.title,
    labName: (booking as any).lab?.name
  });
}));



// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/:id/conclude
// Organizer only — ends the event, finalizes attendance, and PUNISHES no-shows
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/conclude", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const userId = req.user!.id;


  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { registrations: true }
  });

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (booking.studentId !== userId) {
    res.status(403).json({ error: "Only the organizer can conclude this event." });
    return;
  }

  if (booking.status === "completed") {
    res.status(400).json({ error: "This event is already concluded." });
    return;
  }

  // 1. Find no-shows (registered but didn't attend)
  const noShows = booking.registrations.filter((r: any) => r.status === "registered");

  // 2. Punish no-shows
  for (const noShow of noShows) {
    // Update registration status to "no_show"
    await db.update(registrations)
      .set({ status: "no_show", updatedAt: new Date() })
      .where(eq(registrations.id, noShow.id));

    // Fetch the student
    const student = await db.query.students.findFirst({
      where: eq(students.id, (noShow as any).studentId)
    });

    if (student) {
      // Decrease rating and increase ghosted count
      // Rating drops by 0.5 (min 0)
      const newRating = Math.max((student.eventRating || 5.0) - 0.5, 0);
      const newGhostCount = (student.ghostedEventCount || 0) + 1;

      await db.update(students)
        .set({
          eventRating: newRating,
          ghostedEventCount: newGhostCount,
          updatedAt: new Date()
        })
        .where(eq(students.id, student.id));

      // Log punishment in their history
      await db.insert(studentHistory).values({
        studentId: student.id,
        bookingId: booking.id,
        eventType: "ghosted",
        description: `Failed to attend event '${booking.title}'. Rating decreased to ${newRating.toFixed(1)} and ghost count increased.`
      });
    }
  }

  // 3. Mark booking as completed
  const [completedBooking] = await db.update(bookings)
    .set({ status: "completed", actualEnd: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, booking.id))
    .returning();

  res.json({
    message: "Event successfully concluded.",
    booking: completedBooking,
    stats: {
      totalRegistrations: booking.registrations.length,
      attended: booking.registrations.length - noShows.length,
      noShowsPunished: noShows.length
    }
  });
}));

export default router;
