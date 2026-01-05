import React, { useMemo, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/insights", label: "Insights" },
  { to: "/alerts", label: "Alerts" },
  { to: "/settings", label: "Settings" },
];

// PUBLIC_INTERFACE
export default function Navbar() {
  /** Responsive top navigation bar for SpendSense. */
  const { isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClassName = useMemo(
    () =>
      ({ isActive }) =>
        `ss-navlink ${isActive ? "ss-navlink-active" : ""}`,
    []
  );

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="ss-navbar">
      <div className="ss-container">
        <div className="ss-navbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="ss-btn ss-hamburger"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? "✕" : "☰"}
            </button>

            <Link to="/" className="ss-brand" onClick={closeMobile}>
              <span className="ss-logo" aria-hidden="true" />
              <span>SpendSense</span>
            </Link>
          </div>

          <nav className="ss-navlinks" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClassName} end={item.to === "/"}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ss-actions">
            <div className="ss-search" aria-label="Search">
              <span className="ss-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                placeholder="Search (placeholder)…"
                aria-label="Search (placeholder)"
                onChange={() => {
                  // TODO: Wire up theme-aware global search.
                }}
              />
            </div>

            {/* Profile / avatar placeholder */}
            <button
              type="button"
              className="ss-btn"
              aria-label="User menu (placeholder)"
              onClick={() => {
                // TODO: Open user menu dropdown (profile/settings/logout).
                // For now, keep this as a placeholder control.
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
            >
              <span className="ss-avatar" aria-hidden="true" />
              <span className="ss-muted" style={{ fontSize: 13 }}>
                {isAuthenticated ? "You" : "Guest"}
              </span>
            </button>

            {isAuthenticated ? (
              <button type="button" className="ss-btn ss-btn-primary" onClick={logout}>
                Log out
              </button>
            ) : (
              <NavLink to="/login" className="ss-btn ss-btn-primary">
                Log in
              </NavLink>
            )}
          </div>
        </div>

        {mobileOpen ? (
          <div className="ss-mobile-panel" role="dialog" aria-label="Mobile navigation">
            <div className="ss-mobile-panel-inner">
              <nav className="ss-mobile-navlinks" aria-label="Mobile primary navigation">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={navLinkClassName}
                    end={item.to === "/"}
                    onClick={closeMobile}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="ss-mobile-actions">
                <div className="ss-search" aria-label="Search">
                  <span className="ss-search-icon" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    type="search"
                    placeholder="Search (placeholder)…"
                    aria-label="Search (placeholder)"
                    onChange={() => {
                      // TODO: Wire up theme-aware global search.
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
