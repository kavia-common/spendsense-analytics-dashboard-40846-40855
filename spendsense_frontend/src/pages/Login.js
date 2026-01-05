import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../auth/AuthContext";

// PUBLIC_INTERFACE
export default function LoginPage() {
  /** Mock login page used by ProtectedRoute. */
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/";

  return (
    <Layout>
      <h1 className="ss-page-title">Login</h1>

      <div className="ss-card">
        <div className="ss-card-body">
          <p className="ss-muted" style={{ marginTop: 0 }}>
            This is a placeholder login screen.
            <br />
            TODO: Integrate real authentication later.
          </p>

          {isAuthenticated ? (
            <button
              type="button"
              className="ss-btn ss-btn-primary"
              onClick={() => navigate(from, { replace: true })}
            >
              Continue to app
            </button>
          ) : (
            <button
              type="button"
              className="ss-btn ss-btn-primary"
              onClick={() => {
                login();
                navigate(from, { replace: true });
              }}
            >
              Mock Login
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
