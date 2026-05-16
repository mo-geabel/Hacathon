import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { faculties, labs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculties — public
// Students browse faculties on the landing/map page before logging in
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (_req: Request, res: Response) => {
  const allFaculties = await db.query.faculties.findMany({
    where: eq(faculties.isActive, true),
  });
  res.json(allFaculties);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculties/mine — admin only  ← MUST be before /:id
// Returns the faculty the logged-in admin belongs to, with all its labs
// Useful for the admin dashboard to auto-load their context on login
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mine", requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { facultyId } = req.user!;

  if (!facultyId) {
    res.status(400).json({ error: "Admin account is not linked to a faculty" });
    return;
  }

  const faculty = await db.query.faculties.findFirst({
    where: eq(faculties.id, facultyId),
    with: {
      labs: {
        where: eq(labs.isActive, true),
      },
    },
  });

  if (!faculty) {
    res.status(404).json({ error: "Faculty not found" });
    return;
  }

  res.json(faculty);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculties/:id — public
// Returns the faculty with all its active labs
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.params.id;

  const faculty = await db.query.faculties.findFirst({
    where: eq(faculties.id, facultyId),
    with: {
      labs: {
        where: eq(labs.isActive, true),
      },
    },
  });

  if (!faculty) {
    res.status(404).json({ error: "Faculty not found" });
    return;
  }

  res.json(faculty);
}));

export default router;
