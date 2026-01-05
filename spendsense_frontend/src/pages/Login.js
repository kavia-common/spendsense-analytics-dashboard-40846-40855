import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import LoadingState from "../components/ui/LoadingState";

/**
 * Legacy route kept to avoid breaking old bookmarks.
 * The app now uses `/` as the public landing and Google OAuth for sign-in.
 */

// PUBLIC_INTERFACE
export default function LoginPage() {
  /** Redirect legacy /login to landing page. */
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <Layout>
      <LoadingState message="Redirecting…" />
    </Layout>
  );
}
