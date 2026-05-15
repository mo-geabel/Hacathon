import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { facilities } from "../../db/schema";

const router = Router();

/** GET /api/facilities — list all active facilities */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(facilities).where(eq(facilities.isActive, true));
  res.json({ data: rows });
});

/** GET /api/facilities/density-map — live occupancy for every facility */
router.get("/density-map", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      building: facilities.building,
      type: facilities.type,
      capacity: facilities.capacity,
      currentOccupancy: facilities.currentOccupancy,
      status: facilities.status,
    })
    .from(facilities)
    .where(eq(facilities.isActive, true));

  const map = rows.map((f) => ({
    ...f,
    occupancyPercent: Math.round((f.currentOccupancy / f.capacity) * 100),
  }));

  res.json({ data: map });
});

/** GET /api/facilities/:id — single facility */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const [facility] = await db.select().from(facilities).where(eq(facilities.id, req.params.id)).limit(1);
  if (!facility) { res.status(404).json({ error: "Facility not found" }); return; }
  res.json({ data: facility });
});

export default router;
