import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";

import bookingsRouter from "./routes/api/bookings";
import facilitiesRouter from "./routes/api/facilities";
import novaVisionRouter from "./routes/webhooks/novavision";
import puqAiRouter from "./routes/webhooks/puqai";

const app = express();

// ─── Security & Logging ───────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
// NOTE: NovaVision webhook route uses express.raw() locally for HMAC validation
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sau-vision-api", ts: new Date() });
});

// ─── REST API Routes ──────────────────────────────────────────────────────────
app.use("/api/bookings", bookingsRouter);
app.use("/api/facilities", facilitiesRouter);

// ─── Webhook Routes ───────────────────────────────────────────────────────────
app.use("/webhooks", novaVisionRouter);
app.use("/webhooks", puqAiRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 SAÜ-Vision API  →  http://localhost:${PORT}\n`);
});

export default app;
