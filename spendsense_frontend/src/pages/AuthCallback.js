import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingState from "../components/ui/LoadingState";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";
import { getLogger } from "../lib/logger";

const logger = getLogger();

/**
 * Storage key shared with AuthContext so we can restore the original route.
 */
const RETURN_TO_STORAGE_KEY = "spendsense.auth.returnTo";

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

/**
 * Reads the stored returnTo value, ensuring it's a safe in-app route.
 */
function readReturnToFromStorage() {
  try {
    const v = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    if (typeof v === "string" && v.startsWith("/")) return v;
    return null;
  } catch (_e) {
    return null;
  }
}

function clearReturnToStorage() {
  try {
    sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  } catch (_e) {
    // ignore
  }
}

// PUBLIC_INTERFACE
export default function AuthCallbackPage() {
  /** OAuth callback page for Supabase Auth redirects. */
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finalizing sign-in…");
  const [details, setDetails] = useState("");

  const computedReturnTo = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const fromState = parseReturnToFromState(params.get("state"));
    const fromStorage = readReturnToFromStorage();
    return fromState || fromStorage || "/dashboard";
  }, []);

  const urlError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    // Supabase may include error params depending on provider/flow.
    const error = params.get("error") || params.get("error_code");
    const desc = params.get("error_description");
    if (!error && !desc) return null;
    return { error, desc };
  }, []);

  useEffect(() => {
    let alive = true;

    async function finalize() {
      try {
        logger.info("[auth-callback] entered", {
          path: window.location.pathname,
          hasQuery: window.location.search.length > 0,
          returnTo: computedReturnTo,
        });

        if (urlError) {
          logger.warn("[auth-callback] url error received", urlError);
          if (!alive) return;
          setMessage("Sign-in failed.");
          setDetails(urlError.desc || urlError.error || "Unknown OAuth error.");
          clearReturnToStorage();
          window.setTimeout(() => navigate("/", { replace: true }), 1400);
          return;
        }

        if (!supabase) {
          logger.warn("[auth-callback] supabase not configured");
          if (!alive) return;
          setMessage(
            "Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
          );
          setDetails("Missing frontend Supabase configuration.");
          window.setTimeout(() => navigate("/", { replace: true }), 1600);
          return;
        }

        // For PKCE redirect flows, Supabase exchanges the code automatically.
        // We ensure a session exists before redirecting onward.
        setMessage("Finalizing sign-in…");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          logger.error("[auth-callback] getSession error", error);
          if (!alive) return;
          setMessage("Sign-in failed.");
          setDetails(error.message || "Could not finalize session.");
          clearReturnToStorage();
          window.setTimeout(() => navigate("/", { replace: true }), 1400);
          return;
        }

        if (!alive) return;

        if (data?.session?.user) {
          logger.info("[auth-callback] session present; redirecting", {
            userId: data.session.user.id,
            returnTo: computedReturnTo,
          });
          clearReturnToStorage();
          navigate(computedReturnTo, { replace: true });
          return;
        }

        // Sometimes session may not be immediately available; give it a short moment.
        logger.warn("[auth-callback] session missing; retrying shortly");
        setMessage("Finishing up…");
        window.setTimeout(async () => {
          const { data: retryData, error: retryError } = await supabase.auth.getSession();
          if (retryError) logger.error("[auth-callback] retry getSession error", retryError);

          if (retryData?.session?.user) {
            logger.info("[auth-callback] session available after retry; redirecting", {
              userId: retryData.session.user.id,
              returnTo: computedReturnTo,
            });
            clearReturnToStorage();
            navigate(computedReturnTo, { replace: true });
          } else {
            logger.warn("[auth-callback] no session after retry; sending to landing");
            clearReturnToStorage();
            navigate("/", { replace: true });
          }
        }, 650);
      } catch (e) {
        logger.error("[auth-callback] unexpected error", e);
        if (!alive) return;
        setMessage("Unexpected error. Redirecting…");
        setDetails(e?.message ? String(e.message) : "");
        clearReturnToStorage();
        window.setTimeout(() => navigate("/", { replace: true }), 1400);
      }
    }

    finalize();

    return () => {
      alive = false;
    };
  }, [navigate, computedReturnTo, urlError]);

  return (
    <Layout>
      <h1 className="ss-page-title">Signing you in</h1>
      <LoadingState message={message} />
      {details ? (
        <p className="ss-muted" style={{ marginTop: 10 }}>
          {details}
        </p>
      ) : null}
    </Layout>
  );
}
