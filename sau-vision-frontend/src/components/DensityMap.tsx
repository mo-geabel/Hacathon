import FacilityCard from "./FacilityCard";
import { useFacilities } from "../hooks/useFacilities";
import { RefreshCw } from "lucide-react";

export default function DensityMap() {
  const { facilities, loading, error, refetch } = useFacilities(10_000);

  if (error) return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--danger)" }}>
      {error} <button className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={refetch}>Retry</button>
    </div>
  );

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Live <span>Facility</span> Status
        </h2>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "0.8rem" }} onClick={refetch}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 160 }} />
          ))}
        </div>
      ) : (
        <div className="grid-3">
          {facilities.map((f) => <FacilityCard key={f.id} facility={f} />)}
        </div>
      )}
    </section>
  );
}
