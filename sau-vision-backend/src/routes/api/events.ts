import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { campusEvents } from "../../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/events
// Return all campus events (public, no auth needed for the map)
router.get("/", asyncHandler(async (_req: Request, res: Response) => {
  const events = await db.select().from(campusEvents).orderBy(campusEvents.createdAt);
  res.json(events);
}));

// POST /api/events
// Create a new campus event marker
router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const { title, description, date, category, mapX, mapY } = req.body;

  if (!title || !date || mapX === undefined || mapY === undefined) {
    res.status(400).json({ error: "Missing required fields: title, date, mapX, mapY" });
    return;
  }

  const [newEvent] = await db.insert(campusEvents).values({
    title,
    description: description ?? null,
    date,
    category: category ?? "other",
    mapX: parseFloat(mapX),
    mapY: parseFloat(mapY),
  }).returning();

  res.status(201).json(newEvent);
}));

// DELETE /api/events/:id
// Remove a campus event marker
router.delete("/:id", asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [deleted] = await db.delete(campusEvents)
    .where(eq(campusEvents.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({ success: true });
}));

export default router;
