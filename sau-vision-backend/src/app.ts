import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sau-vision-api", ts: new Date() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running → http://localhost:${PORT}`);
  console.log(`   Health check  → http://localhost:${PORT}/health\n`);
});
