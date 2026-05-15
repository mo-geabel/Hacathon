import { useEffect, useState } from "react";
import { BookOpen, Building2, Ghost } from "lucide-react";
import { bookingsApi, facilitiesApi } from "../lib/api";

interface Stats { active: number; available: number; ghosted: number; }

export default function StatsBar() {
  const [stats, setStats] = useState<Stats>({ active: 0, available: 0, ghosted: 0 });

  useEffect(() => {
    async function load() {
      const [bRes, fRes] = await Promise.allSettled([bookingsApi.list(), facilitiesApi.list()]);
      const bookingsData = bRes.status === "fulfilled" ? bRes.value.data.data : [];
      const facilitiesData = fRes.status === "fulfilled" ? fRes.value.data.data : [];
      setStats({
        active: bookingsData.filter((b: { status: string }) => b.status === "active").length,
        available: facilitiesData.filter((f: { status: string }) => f.status === "available").length,
        ghosted: bookingsData.filter((b: { status: string }) => b.status === "ghosted").length,
      });
    }
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const items = [
    { label: "Active Bookings",    value: stats.active,    icon: <BookOpen size={18} />,  color: "var(--accent)" },
    { label: "Available Rooms",    value: stats.available, icon: <Building2 size={18} />, color: "var(--teal)" },
    { label: "Ghosted Today",      value: stats.ghosted,   icon: <Ghost size={18} />,     color: "var(--danger)" },
  ];

  return (
    <div className="grid-4" style={{ marginBottom: 48 }}>
      {items.map(({ label, value, icon, color }) => (
        <div key={label} className="card" style={{ textAlign: "center", padding: "20px 16px" }}>
          <div style={{ color, marginBottom: 8 }}>{icon}</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
