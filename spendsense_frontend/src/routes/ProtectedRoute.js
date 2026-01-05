import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import LoadingState from "../components/ui/LoadingState";
import Layout from "../components/Layout";

// PUBLIC_INTERFACE
export default function ProtectedRoute() {
  /** Route guard that requires an authenticated user. */
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Checking authentication…" />
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
