import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db/client";
import { faculties, labs } from "../../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/faculties
// List all active faculties
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const allFaculties = await db.query.faculties.findMany({
    where: eq(faculties.isActive, true)
  });
  res.json(allFaculties);
}));

// GET /api/faculties/:id
// Get a specific faculty with all its active labs
router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.params.id;

  const faculty = await db.query.faculties.findFirst({
    where: eq(faculties.id, facultyId),
    with: {
      labs: {
        where: eq(labs.isActive, true)
      }
    }
  });

  if (!faculty) {
    res.status(404).json({ error: "Faculty not found" });
    return;
  }

  res.json(faculty);
}));

export default router;
