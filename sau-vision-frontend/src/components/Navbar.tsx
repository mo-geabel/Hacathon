import { Link, useLocation } from "react-router-dom";
import { Building2, LayoutDashboard, CalendarPlus } from "lucide-react";

export default function Navbar() {
  const { pathname } = useLocation();

  const links = [
    { to: "/",          label: "Live Map",   icon: <Building2 size={16} /> },
    { to: "/book",      label: "Book Space", icon: <CalendarPlus size={16} /> },
    { to: "/dashboard", label: "Dashboard",  icon: <LayoutDashboard size={16} /> },
  ];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(10,15,30,0.85)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, var(--accent), var(--teal))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 800, color: "#fff",
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
            SAÜ<span style={{ color: "var(--accent)" }}>-Vision</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 6 }}>
          {links.map(({ to, label, icon }) => (
            <Link key={to} to={to} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: "var(--radius-sm)",
              fontSize: "0.875rem", fontWeight: 500,
              color: pathname === to ? "var(--text-primary)" : "var(--text-muted)",
              background: pathname === to ? "rgba(99,102,241,0.15)" : "transparent",
              border: pathname === to ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
              transition: "all 0.2s",
            }}>
              {icon}{label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
