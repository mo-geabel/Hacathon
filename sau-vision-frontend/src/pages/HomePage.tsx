import StatsBar from "../components/StatsBar";
import DensityMap from "../components/DensityMap";
import { Link } from "react-router-dom";
import { CalendarPlus, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="page">
      <div className="container">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", padding: "40px 0 64px" }}>
          <div style={{ display: "inline-block", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: "4px 16px", fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)", marginBottom: 20, letterSpacing: "0.06em" }}>
            SAKARYA ÜNİVERSİTESİ · SMART CAMPUS
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20 }}>
            Campus Resources,<br />
            <span style={{ background: "linear-gradient(135deg, var(--accent), var(--teal))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Managed Intelligently.
            </span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-subtle)", maxWidth: 520, margin: "0 auto 32px" }}>
            Book any campus facility with a single sentence. NovaVision AI monitors usage in real time and prevents ghost reservations automatically.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/book" className="btn btn-primary">
              <CalendarPlus size={16} /> Book a Space
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              View Dashboard <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* ── Live Stats ───────────────────────────────────────────────── */}
        <StatsBar />

        {/* ── Density Map ──────────────────────────────────────────────── */}
        <DensityMap />

      </div>
    </main>
  );
}
