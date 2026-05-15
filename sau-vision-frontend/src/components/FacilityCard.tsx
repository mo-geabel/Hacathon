import { Users, Wifi } from "lucide-react";
import type { FacilityDensity } from "../hooks/useFacilities";

const TYPE_LABELS: Record<string, string> = {
  lecture_hall: "Lecture Hall", seminar_room: "Seminar Room",
  laboratory: "Laboratory", sports_hall: "Sports Hall",
  conference_room: "Conference Room", study_room: "Study Room", amphitheater: "Amphitheater",
};

function getBarColor(pct: number): string {
  if (pct >= 90) return "var(--danger)";
  if (pct >= 70) return "var(--warning)";
  return "var(--teal)";
}

interface Props { facility: FacilityDensity; }

export default function FacilityCard({ facility }: Props) {
  const { name, building, type, capacity, currentOccupancy, occupancyPercent, status } = facility;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 2 }}>{name}</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{building} · {TYPE_LABELS[type] ?? type}</p>
        </div>
        <span className={`badge badge-${status}`}>{status}</span>
      </div>

      {/* Occupancy bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={12} /> Occupancy
          </span>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: getBarColor(occupancyPercent) }}>
            {currentOccupancy} / {capacity}
          </span>
        </div>
        <div className="occ-bar">
          <div className="occ-bar-fill" style={{ width: `${Math.min(occupancyPercent, 100)}%`, background: getBarColor(occupancyPercent) }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <Wifi size={11} style={{ color: "var(--teal)" }} />
        <span>Live · {occupancyPercent}% full</span>
      </div>
    </div>
  );
}
