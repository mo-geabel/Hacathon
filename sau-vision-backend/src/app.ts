import express from "express";
import "dotenv/config";
import cors from "cors";

// Routers
import authRoutes from "./routes/api/auth";
import facultiesRoutes from "./routes/api/faculties";
import labsRoutes from "./routes/api/labs";
import bookingsRoutes from "./routes/api/bookings";
import registrationsRoutes from "./routes/api/registrations";
import studentsRoutes from "./routes/api/students";
import surveyRoutes from "./routes/api/survey";
import eventsRoutes from "./routes/api/events";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/faculties", facultiesRoutes);
app.use("/api/labs", labsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/registrations", registrationsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/survey", surveyRoutes);
app.use("/api/events", eventsRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sau-vision-api", ts: new Date() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running → http://localhost:${PORT}`);
  console.log(`   Health check  → http://localhost:${PORT}/health\n`);
});

