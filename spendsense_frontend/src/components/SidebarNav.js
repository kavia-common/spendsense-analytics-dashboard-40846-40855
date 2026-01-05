import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/insights", label: "Insights" },
  { to: "/alerts", label: "Alerts" },
  { to: "/settings", label: "Settings" },
];

// PUBLIC_INTERFACE
export default function SidebarNav() {
  /** Left-side navigation for authenticated app pages. */
  return (
    <aside className="ss-sidebar" aria-label="Sidebar navigation">
      <nav className="ss-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              `ss-sidebar-link ${isActive ? "ss-sidebar-link-active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
