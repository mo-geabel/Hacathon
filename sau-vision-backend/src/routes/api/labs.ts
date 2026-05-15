import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { labs } from "../../db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/labs
// List all active labs with optional filters
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const { facultyId, type, status } = req.query;

  const filters = [eq(labs.isActive, true)];

  if (typeof facultyId === "string") filters.push(eq(labs.facultyId, facultyId));
  if (typeof type === "string") filters.push(eq(labs.type, type as any));
  if (typeof status === "string") filters.push(eq(labs.status, status as any));

  const allLabs = await db.query.labs.findMany({
    where: and(...filters),
    with: {
      faculty: true // Include faculty details
    }
  });

  res.json(allLabs);
}));

// GET /api/labs/:id
// Get a specific lab
router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const labId = req.params.id;

  const lab = await db.query.labs.findFirst({
    where: eq(labs.id, labId),
    with: {
      faculty: true
    }
  });

  if (!lab) {
    res.status(404).json({ error: "Lab not found" });
    return;
  }

  res.json(lab);
}));

export default router;
