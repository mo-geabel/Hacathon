import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { labs, bookings } from "../../db/schema";
import { eq, and, or, gte, lt } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/labs — public
// Students browse labs before logging in (landing page, map view)
// Optional filters: ?facultyId=, ?type=, ?status=
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const { facultyId, type, status } = req.query;

  const filters = [eq(labs.isActive, true)];

  if (typeof facultyId === "string") filters.push(eq(labs.facultyId, facultyId));
  if (typeof type === "string")      filters.push(eq(labs.type, type as any));
  if (typeof status === "string")    filters.push(eq(labs.status, status as any));

  // Build day boundaries in UTC for today's bookings
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

  const allLabs = await db.query.labs.findMany({
    where: and(...filters),
    with: { 
      faculty: true,
      bookings: {
        where: and(
          or(eq(bookings.status, "approved"), eq(bookings.status, "active")),
          lt(bookings.scheduledStart, dayEnd),
          gte(bookings.scheduledEnd, dayStart)
        ),
        columns: {
          id: true,
          title: true,
          description: true,
          scheduledStart: true,
          scheduledEnd: true,
          status: true
        }
      }
    },
  });

  res.json(allLabs);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/labs/:id/slots — authenticated (any role)
// Returns all approved/active booked windows for a given lab on a given date.
// Query: ?date=YYYY-MM-DD (defaults to today)
// The frontend uses this to grey out unavailable time slots in the booking form.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/slots", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const labId = req.params.id;
  const dateStr = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];

  // Build day boundaries in UTC
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

  // Fetch all approved/active bookings for this lab on the requested day
  const allBookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.labId, labId),
      or(
        eq(bookings.status, "approved"),
        eq(bookings.status, "active")
      )
    ),
  });

  // Filter to bookings that overlap with this day (some bookings may span midnight)
  const slots = allBookings
    .filter((b) => b.scheduledStart < dayEnd && b.scheduledEnd > dayStart)
    .map((b) => ({
      bookingId: b.id,
      scheduledStart: b.scheduledStart,
      scheduledEnd: b.scheduledEnd,
    }));

  res.json({ labId, date: dateStr, slots });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/labs/:id — public
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const labId = req.params.id;

  const lab = await db.query.labs.findFirst({
    where: eq(labs.id, labId),
    with: { faculty: true },
  });

  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return;
  }

  res.json(lab);
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/labs/:id/status — admin only
// Allows an admin to change a lab's status (available / maintenance / reserved)
// Admin must belong to the same faculty as the lab
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const labId = req.params.id;
  const { status } = req.body;
  const { facultyId } = req.user!;

  const allowed = ["available", "maintenance", "reserved"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    return;
  }

  const lab = await db.query.labs.findFirst({ where: eq(labs.id, labId) });

  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return;
  }

  // Admins can only manage labs inside their own faculty
  if (facultyId && lab.facultyId !== facultyId) {
    res.status(403).json({ error: "Access denied. This lab is outside your faculty." });
    return;
  }

  const [updated] = await db
    .update(labs)
    .set({ status, updatedAt: new Date() })
    .where(eq(labs.id, labId))
    .returning();

  res.json(updated);
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/labs/:id/occupancy — admin only (or NovaVision webhook)
// Updates the live headcount for a lab room
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/occupancy", requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const labId = req.params.id;
  const { currentOccupancy } = req.body;
  const { facultyId } = req.user!;

  if (typeof currentOccupancy !== "number" || currentOccupancy < 0) {
    res.status(400).json({ error: "currentOccupancy must be a non-negative number" });
    return;
  }

  const lab = await db.query.labs.findFirst({ where: eq(labs.id, labId) });

  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return;
  }

  if (facultyId && lab.facultyId !== facultyId) {
    res.status(403).json({ error: "Access denied. This lab is outside your faculty." });
    return;
  }

  const [updated] = await db
    .update(labs)
    .set({ currentOccupancy, updatedAt: new Date() })
    .where(eq(labs.id, labId))
    .returning();

  res.json(updated);
}));

export default router;
