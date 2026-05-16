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
// POST /api/bookings
// Students only — admins manage facilities, they don't create bookings
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireAuth, requireStudent, asyncHandler(async (req: Request, res: Response) => {
  const { labId, title, description, expectedAttendees, scheduledStart, scheduledEnd } = req.body;
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

  // 3. Call the external puq.ai Webhook
  try {
    const webhookUrl = process.env.PUQ_AI_WEBHOOK_URL || "https://api.puq.ai/h/a3eb61690eeb/sync";
    
    // If puq.ai uses the Dify engine under the hood, it requires variables to be inside "inputs" 
    // and "response_mode" set to "blocking" for a synchronous JSON response.
    const response = await axios.post(webhookUrl, {
      inputs: {
        student_prompt: prompt,
        labs_context: labsContext
      },
      response_mode: "blocking",
      user: req.user?.id || "anonymous"
    }, {
      // Dify workflows require the API Key in the Authorization header
      headers: {
        "Authorization": `Bearer ${process.env.PUQ_AI_API_KEY || ""}`,
        "Content-Type": "application/json"
      }
    });

    // We assume the puq.ai workflow directly returns the JSON object we requested
    const parsedData = response.data;
    
    // If the workflow returns it as a stringified JSON inside a text field, we'd parse it here.
    // Assuming puq.ai returns proper JSON headers:
    const geminiResult = typeof parsedData === "string" ? JSON.parse(parsedData) : parsedData;

    res.json({
      originalPrompt: prompt,
      geminiResult
    });
  } catch (error: any) {
    console.error("puq.ai Webhook Error:", error?.response?.data || error.message);
    res.status(500).json({ error: "External AI Workflow failed", details: error.message });
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
