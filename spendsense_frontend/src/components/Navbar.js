import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function getAvatarUrl(user) {
  // Supabase user metadata often includes avatar_url for Google.
  const meta = user?.user_metadata || {};
  return meta.avatar_url || meta.picture || null;
}

// PUBLIC_INTERFACE
export default function Navbar() {
  /** Top navbar per spec: brand on left, identity + sign out on right. */
  const { user, signOut, signInWithGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const avatarUrl = getAvatarUrl(user);

  return (
    <header className="ss-navbar">
      <div className="ss-container">
        <div className="ss-navbar-inner">
          {/* Left: logo + app name */}
          <Link to={user ? "/dashboard" : "/"} className="ss-brand">
            <span className="ss-logo" aria-hidden="true" />
            <span>SpendSense</span>
          </Link>

          {/* Right: avatar, user email, sign out */}
          <div className="ss-actions ss-actions-compact" aria-label="User actions">
            {user ? (
              <>
                <div className="ss-identity" aria-label="Signed in user">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.email ? `${user.email} avatar` : "User avatar"}
                      className="ss-avatar-img"
                    />
                  ) : (
                    <span className="ss-avatar" aria-hidden="true" />
                  )}

                  <span className="ss-identity-email" title={user.email || ""}>
                    {user.email || "Signed in"}
                  </span>
                </div>

                <button
                  type="button"
                  className="ss-btn ss-btn-primary"
                  onClick={async () => {
                    await signOut();
                    navigate("/", { replace: true });
                  }}
                >
                  Sign Out
                </button>
              </>
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
      </div>
    </header>
  );
}
