import React, { useMemo, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/insights", label: "Insights" },
  { to: "/alerts", label: "Alerts" },
  { to: "/settings", label: "Settings" },
];

function getAvatarUrl(user) {
  // Supabase user metadata often includes avatar_url for Google.
  const meta = user?.user_metadata || {};
  return meta.avatar_url || meta.picture || null;
}

// PUBLIC_INTERFACE
export default function Navbar() {
  /** Responsive top navigation bar for SpendSense. */
  const { user, signOut, signInWithGoogle } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinkClassName = useMemo(
    () =>
      ({ isActive }) =>
        `ss-navlink ${isActive ? "ss-navlink-active" : ""}`,
    []
  );

  const closeMobile = () => setMobileOpen(false);

  const avatarUrl = getAvatarUrl(user);

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

            <Link to={user ? "/dashboard" : "/"} className="ss-brand" onClick={closeMobile}>
              <span className="ss-logo" aria-hidden="true" />
              <span>SpendSense</span>
            </Link>
          </div>

          {/* Only show primary navigation when authenticated */}
          {user ? (
            <nav className="ss-navlinks" aria-label="Primary navigation">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClassName} end={item.to === "/dashboard"}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : (
            <div />
          )}

          <div className="ss-actions">
            {/* Keep search only for authenticated area */}
            {user ? (
              <div className="ss-search" aria-label="Search">
                <span className="ss-search-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="search"
                  placeholder="Search…"
                  aria-label="Search"
                  onChange={() => {
                    // TODO: Wire up theme-aware global search.
                  }}
                />
              </div>
            ) : null}

            {/* Profile / identity */}
            <button
              type="button"
              className="ss-btn"
              aria-label="User identity"
              onClick={() => {
                // Keep placeholder for future dropdown; no-op for now.
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.email ? `${user.email} avatar` : "User avatar"}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "1px solid var(--ss-border)",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span className="ss-avatar" aria-hidden="true" />
              )}

              <span className="ss-muted" style={{ fontSize: 13, maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis" }}>
                {user ? user.email || "Signed in" : "Guest"}
              </span>
            </button>

            {user ? (
              <button
                type="button"
                className="ss-btn ss-btn-primary"
                onClick={async () => {
                  await signOut();
                  navigate("/", { replace: true });
                }}
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                className="ss-btn ss-btn-primary"
                onClick={() => {
                  const returnTo = location.state?.from || "/dashboard";
                  const state = encodeURIComponent(JSON.stringify({ returnTo, ts: Date.now() }));
                  signInWithGoogle({ state });
                }}
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {mobileOpen ? (
          <div className="ss-mobile-panel" role="dialog" aria-label="Mobile navigation">
            <div className="ss-mobile-panel-inner">
              {user ? (
                <nav className="ss-mobile-navlinks" aria-label="Mobile primary navigation">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={navLinkClassName}
                      end={item.to === "/dashboard"}
                      onClick={closeMobile}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              ) : null}

              <div className="ss-mobile-actions">
                {user ? (
                  <div className="ss-search" aria-label="Search">
                    <span className="ss-search-icon" aria-hidden="true">
                      ⌕
                    </span>
                    <input
                      type="search"
                      placeholder="Search…"
                      aria-label="Search"
                      onChange={() => {
                        // TODO: Wire up theme-aware global search.
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
