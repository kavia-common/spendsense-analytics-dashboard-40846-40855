import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * Simple mock auth provider for UI scaffolding only.
 * TODO: Replace with real authentication (e.g., Supabase/Auth0/custom backend) later.
 */
const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** This is a public component. */
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const value = useMemo(
    () => ({
      isAuthenticated,
      // PUBLIC_INTERFACE
      login: () => {
        /** Mock login. TODO: Implement real login. */
        setIsAuthenticated(true);
      },
      // PUBLIC_INTERFACE
      logout: () => {
        /** Mock logout. TODO: Implement real logout. */
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access mock auth state. */
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}
