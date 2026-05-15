import { useState } from "react";
import { Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { bookingsApi } from "../lib/api";

interface ParsedIntent {
  intent: string; facilityType: string | null; requestedCapacity: number | null;
  preferredDate: string | null; preferredStartTime: string | null; preferredEndTime: string | null;
  eventTitle: string | null; confidence: "high" | "medium" | "low"; clarificationNeeded: string | null;
}

const CONFIDENCE_COLOR = { high: "var(--success)", medium: "var(--warning)", low: "var(--danger)" };

export default function BookingForm() {
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [parsing, setParsing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true); setIntent(null); setError(null);
    try {
      const { data } = await bookingsApi.parse(text);
      setIntent(data.data);
    } catch { setError("Failed to parse request. Check your connection."); }
    finally { setParsing(false); }
  }

  async function handleBook() {
    if (!intent) return;
    setBooking(true); setError(null);
    try {
      await bookingsApi.create({
        userId: "demo-user-id",
        facilityId: "demo-facility-id",
        title: intent.eventTitle ?? "New Booking",
        expectedAttendees: intent.requestedCapacity ?? 10,
        scheduledStart: `${intent.preferredDate}T${intent.preferredStartTime}:00Z`,
        scheduledEnd: `${intent.preferredDate}T${intent.preferredEndTime}:00Z`,
        rawNlRequest: text,
        geminiParsedData: intent,
      });
      setSuccess(true);
    } catch { setError("Booking failed. Please try again."); }
    finally { setBooking(false); }
  }

  if (success) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <CheckCircle size={56} style={{ color: "var(--success)", marginBottom: 16 }} />
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 8 }}>Booking Confirmed!</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Your facility has been reserved. You'll receive a confirmation shortly.</p>
      <button className="btn btn-ghost" onClick={() => { setSuccess(false); setText(""); setIntent(null); }}>Book Another</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8 }}>
          Describe what you need in plain language (Turkish or English)
        </label>
        <textarea
          className="textarea"
          rows={4}
          placeholder='e.g. "Yarın öğleden sonra 2-4 arası 40 kişilik bir seminer odası lazım" or "I need a lab for 20 students on Friday at 10am"'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <button className="btn btn-primary" onClick={handleParse} disabled={parsing || !text.trim()} style={{ width: "100%", justifyContent: "center" }}>
        {parsing ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={16} />}
        {parsing ? "Analyzing with Gemini AI..." : "Parse My Request"}
      </button>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, color: "var(--danger)", fontSize: "0.85rem" }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Parsed intent preview */}
      {intent && (
        <div className="card" style={{ marginTop: 24, gap: 16, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Parsed Intent</h3>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: CONFIDENCE_COLOR[intent.confidence] }}>
              {intent.confidence.toUpperCase()} confidence
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Facility Type", intent.facilityType?.replace("_", " ") ?? "—"],
              ["Capacity",      intent.requestedCapacity ? `${intent.requestedCapacity} people` : "—"],
              ["Date",          intent.preferredDate ?? "—"],
              ["Time",          intent.preferredStartTime && intent.preferredEndTime ? `${intent.preferredStartTime} – ${intent.preferredEndTime}` : "—"],
              ["Event",         intent.eventTitle ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          {intent.clarificationNeeded && (
            <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--warning)" }}>
              ⚠ {intent.clarificationNeeded}
            </div>
          )}

          {intent.confidence !== "low" && !intent.clarificationNeeded && (
            <button className="btn btn-primary" onClick={handleBook} disabled={booking} style={{ justifyContent: "center" }}>
              {booking ? <Loader2 size={16} /> : <CheckCircle size={16} />}
              {booking ? "Booking..." : "Confirm Booking"}
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
