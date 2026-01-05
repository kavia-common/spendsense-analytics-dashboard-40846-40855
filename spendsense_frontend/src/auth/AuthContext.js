import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { env } from "../config/env";
import { getLogger } from "../lib/logger";

/**
 * Real authentication provider using Supabase Auth (Google OAuth).
 *
 * Exposes:
 * - user: Supabase user (or null)
 * - loading: boolean while session is being resolved
 * - signInWithGoogle: starts OAuth flow
 * - signOut: signs out and clears session
 */
const AuthContext = createContext(null);

const logger = getLogger();

/**
 * Key used to persist the intended route across the OAuth redirect.
 * We do not rely only on the OAuth state param because some deployments/proxies
 * may drop query params unexpectedly.
 */
const RETURN_TO_STORAGE_KEY = "spendsense.auth.returnTo";

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides authentication state and actions to the app. */
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        if (!supabase) {
          // No keys => keep app functional, but unauthenticated.
          if (!alive) return;
          logger.warn(
            "[auth] Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
          );
          setUser(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) logger.warn("[auth] getSession error:", error);

        if (!alive) return;
        setUser(data?.session?.user || null);
        setLoading(false);

        if (data?.session?.user) {
          logger.info("[auth] session resolved: signed in", {
            userId: data.session.user.id,
            email: data.session.user.email,
          });
        } else {
          logger.info("[auth] session resolved: not signed in");
        }
      } catch (e) {
        logger.warn("[auth] init error:", e);
        if (!alive) return;
        setUser(null);
        setLoading(false);
      }
    }

    init();

    // Subscribe to auth state changes and cleanup on unmount.
    let subscription = null;
    try {
      if (supabase) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!alive) return;
          logger.info("[auth] state change:", event, {
            hasSession: Boolean(session),
            userId: session?.user?.id,
          });
          setUser(session?.user || null);
          setLoading(false);
        });
        subscription = data?.subscription || null;
      }
    } catch (e) {
      logger.warn("[auth] onAuthStateChange subscribe error:", e);
    }

    return () => {
      alive = false;
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,

      // PUBLIC_INTERFACE
      signInWithGoogle: async ({ redirectTo, returnTo, state } = {}) => {
        /**
         * Starts Google OAuth via Supabase.
         *
         * redirectTo:
         *   Optional override for the redirect callback URL.
         *   If not provided, we default to `${env.REACT_APP_FRONTEND_URL}/auth/callback`.
         *
         * returnTo:
         *   The intended route inside the SPA (e.g., "/dashboard"). We persist it in
         *   sessionStorage and also encode it into the OAuth `state` for redundancy.
         *
         * state:
         *   Optional raw string state (advanced usage). Prefer `returnTo`.
         */
        if (!supabase) {
          logger.warn(
            "[auth] Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
          );
          return { ok: false, error: new Error("Supabase not configured") };
        }

        // Environment-aware callback URL:
        // - Local dev: env.REACT_APP_FRONTEND_URL should be http://localhost:3000
        // - Preview/prod: env.REACT_APP_FRONTEND_URL should be your deployed URL
        // Using env (instead of window.location.origin) avoids mismatches behind proxies.
        const defaultRedirectTo = `${env.REACT_APP_FRONTEND_URL}/auth/callback`;
        const finalRedirectTo = redirectTo || defaultRedirectTo;

        const safeReturnTo =
          typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/dashboard";

        // Persist returnTo so we can restore even if OAuth state/query params are lost.
        try {
          sessionStorage.setItem(RETURN_TO_STORAGE_KEY, safeReturnTo);
        } catch (_e) {
          // ignore storage failures (private browsing, etc.)
        }

        // Encode returnTo into state as JSON for callback parsing.
        const computedState =
          state ||
          encodeURIComponent(
            JSON.stringify({
              returnTo: safeReturnTo,
              ts: Date.now(),
            })
          );

        logger.info("[auth] initiating Google OAuth", {
          redirectTo: finalRedirectTo,
          returnTo: safeReturnTo,
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: finalRedirectTo,
            // Supabase v2 passes query params through to the callback.
            queryParams: computedState ? { state: computedState } : undefined,
          },
        });

        if (error) {
          logger.error("[auth] signInWithOAuth error:", error);
          return { ok: false, error };
        }

        logger.debug("[auth] signInWithOAuth started (browser will redirect)", {
          hasUrl: Boolean(data?.url),
        });

        // With redirect flow, browser will navigate away. We still return for completeness.
        return { ok: true, data };
      },

      // PUBLIC_INTERFACE
      signOut: async () => {
        /** Signs the current user out. */
        if (!supabase) return { ok: true };
        logger.info("[auth] signing out");
        const { error } = await supabase.auth.signOut();
        if (error) logger.warn("[auth] signOut error:", error);
        return { ok: !error, error };
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access auth state/actions. */
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}
