import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Layout from "../components/Layout";
import LoadingState from "../components/ui/LoadingState";

// PUBLIC_INTERFACE
export default function LandingPage() {
  /** Public landing page. Accessible without authentication. */
  const { user, loading, signInWithGoogle } = useAuth();
  const location = useLocation();

  const returnTo = useMemo(() => {
    // When redirected to landing, we store the attempted location in state.from.
    // Keep it predictable: always default to /dashboard after auth.
    const from = location.state?.from;
    if (typeof from === "string" && from.startsWith("/")) return from;
    return "/dashboard";
  }, [location.state]);

  if (loading) {
    return (
      <Layout>
        <h1 className="ss-page-title">SpendSense</h1>
        <LoadingState message="Checking session…" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="ss-card">
        <div className="ss-card-body" style={{ padding: 22 }}>
          <h1 className="ss-page-title" style={{ marginBottom: 10 }}>
            Welcome to SpendSense
          </h1>
          <p className="ss-page-subtitle" style={{ marginTop: 0 }}>
            Sign in to view your dashboard, transactions, insights, alerts, and settings.
          </p>

          {user ? (
            <p className="ss-muted" style={{ margin: "10px 0 0" }}>
              You’re already signed in as <strong>{user.email || "your account"}</strong>.
            </p>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ss-btn ss-btn-primary"
                onClick={() => {
                  // AuthContext persists returnTo across OAuth redirects and chooses an environment-aware callback URL.
                  signInWithGoogle({ returnTo });
                }}
              >
                Continue with Google
              </button>

              <span className="ss-muted" style={{ fontSize: 13 }}>
                Secure authentication powered by Google OAuth.
              </span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
