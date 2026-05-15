import express from "express";
import "dotenv/config";
import cors from "cors";
import authRoutes from "./routes/api/auth";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sau-vision-api", ts: new Date() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running → http://localhost:${PORT}`);
  console.log(`   Health check  → http://localhost:${PORT}/health\n`);
});

