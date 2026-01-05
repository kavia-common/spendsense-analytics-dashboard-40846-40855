import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingState from "../components/ui/LoadingState";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";

/**
 * Parses the OAuth `state` parameter that we sent during sign-in.
 * We expect it to be an encoded JSON string.
 */
function parseReturnToFromState(stateValue) {
  try {
    if (!stateValue) return null;
    const decoded = decodeURIComponent(stateValue);
    const obj = JSON.parse(decoded);
    if (obj && typeof obj.returnTo === "string" && obj.returnTo.startsWith("/")) {
      return obj.returnTo;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

// PUBLIC_INTERFACE
export default function AuthCallbackPage() {
  /** OAuth callback page for Supabase Auth redirects. */
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finalizing sign-in…");

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return parseReturnToFromState(params.get("state"));
  }, []);

  useEffect(() => {
    let alive = true;

    async function finalize() {
      try {
        if (!supabase) {
          if (!alive) return;
          setMessage(
            "Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
          );
          // Send back to landing in a moment.
          window.setTimeout(() => navigate("/", { replace: true }), 800);
          return;
        }

        // For PKCE redirect flows, Supabase will handle exchanging the code automatically.
        // We just need to ensure a session is present before we redirect onward.
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          if (!alive) return;
          setMessage("Sign-in failed. Redirecting…");
          window.setTimeout(() => navigate("/", { replace: true }), 800);
          return;
        }

        if (!alive) return;

        if (data?.session?.user) {
          navigate(returnTo || "/dashboard", { replace: true });
          return;
        }

        // Sometimes session may not be immediately available; give it a short moment.
        setMessage("Finishing up…");
        window.setTimeout(async () => {
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData?.session?.user) {
            navigate(returnTo || "/dashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }, 450);
      } catch (_e) {
        if (!alive) return;
        setMessage("Unexpected error. Redirecting…");
        window.setTimeout(() => navigate("/", { replace: true }), 800);
      }
    }

    finalize();

    return () => {
      alive = false;
    };
  }, [navigate, returnTo]);

  return (
    <Layout>
      <h1 className="ss-page-title">Signing you in</h1>
      <LoadingState message={message} />
    </Layout>
  );
}
