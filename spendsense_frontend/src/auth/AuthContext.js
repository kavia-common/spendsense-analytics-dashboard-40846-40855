import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

function getLogLevel() {
  return (process.env.REACT_APP_LOG_LEVEL || "").trim().toLowerCase();
}

function warnLog(...args) {
  const lvl = getLogLevel();
  if (lvl !== "silent") console.warn(...args);
}

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
          setUser(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) warnLog("[auth] getSession error:", error);

        if (!alive) return;
        setUser(data?.session?.user || null);
        setLoading(false);
      } catch (e) {
        warnLog("[auth] init error:", e);
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
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!alive) return;
          setUser(session?.user || null);
          setLoading(false);
        });
        subscription = data?.subscription || null;
      }
    } catch (e) {
      warnLog("[auth] onAuthStateChange subscribe error:", e);
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
      signInWithGoogle: async ({ redirectTo, state } = {}) => {
        /**
         * Starts Google OAuth via Supabase.
         *
         * redirectTo: optional override for the redirect callback URL
         * state: optional string passed through the OAuth flow (we use it for "returnTo")
         */
        if (!supabase) {
          warnLog(
            "[auth] Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
          );
          return { ok: false, error: new Error("Supabase not configured") };
        }

        // Default callback route inside this SPA.
        const fallbackRedirectTo = `${window.location.origin}/auth/callback`;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectTo || fallbackRedirectTo,
            // Supabase v2 supports passing arbitrary query params through the OAuth flow.
            // We'll encode our desired returnTo as `state`.
            queryParams: state ? { state } : undefined,
          },
        });

        if (error) {
          warnLog("[auth] signInWithOAuth error:", error);
          return { ok: false, error };
        }

        // With redirect flow, browser will navigate away. We still return for completeness.
        return { ok: true, data };
      },

      // PUBLIC_INTERFACE
      signOut: async () => {
        /** Signs the current user out. */
        if (!supabase) return { ok: true };
        const { error } = await supabase.auth.signOut();
        if (error) warnLog("[auth] signOut error:", error);
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
