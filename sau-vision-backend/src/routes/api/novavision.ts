import { Router, Request, Response } from "express";
import { getNovaVisionStats, getLastRawFrame, processVideo } from "../../services/novavision";
import path from "path";

const router = Router();

/**
 * GET /api/novavision/stats
 * Returns class session summary: start time, end time, peak student count, processing status.
 */
router.get("/stats", (_req: Request, res: Response) => {
  res.json({ success: true, data: getNovaVisionStats() });
});

/**
 * GET /api/novavision/raw
 * Returns the last raw frame received from the Nova Vision pipeline (debugging).
 */
router.get("/raw", (_req: Request, res: Response) => {
  const raw = getLastRawFrame();
  if (!raw.frame) {
    return res.status(204).json({
      success: false,
      message: "No frames processed yet. POST to /api/novavision/process first.",
    });
  }
  res.json({ success: true, data: raw });
});

/**
 * POST /api/novavision/process
 * Trigger video processing. Optionally send { "videoPath": "..." } in body.
 * Defaults to the VIDEO_PATH env variable or video.mp4 in the project root.
 */
router.post("/process", async (req: Request, res: Response) => {
  const stats = getNovaVisionStats();
  if (stats.isProcessing) {
    return res.status(409).json({
      success: false,
      message: "A video is already being processed. Please wait.",
    });
  }

  const videoPath: string | undefined = req.body?.videoPath;

  // Kick off processing in the background — don't await so the request returns immediately
  const resolvedPath = videoPath
    ? path.resolve(videoPath)
    : undefined;

  processVideo(resolvedPath).catch((err) =>
    console.error("Background processVideo error:", err.message)
  );

  res.json({
    success: true,
    message: "Video processing started. Poll GET /api/novavision/stats for results.",
    videoPath: resolvedPath ?? "default (VIDEO_PATH env or video.mp4)",
  });
});

export default router;
