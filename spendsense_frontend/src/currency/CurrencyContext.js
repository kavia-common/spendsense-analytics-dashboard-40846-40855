import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getConverter } from "../lib/exchangeRates";
import { logDebug } from "../lib/logger";

const CurrencyContext = createContext(null);

function normalizeCurrency(code) {
  return (code || "").trim().toUpperCase();
}

function getEnvDefaultBase() {
  return normalizeCurrency(process.env.REACT_APP_BASE_CURRENCY || "USD");
}

function getStoredBaseCurrency() {
  try {
    const v = window.localStorage.getItem("baseCurrency");
    return v ? normalizeCurrency(v) : null;
  } catch (_e) {
    return null;
  }
}

function setStoredBaseCurrency(code) {
  try {
    window.localStorage.setItem("baseCurrency", code);
  } catch (_e) {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function CurrencyProvider({ children }) {
  /** Provides base currency selection + fx converter for the app. */
  const [baseCurrency, setBaseCurrency] = useState(() => {
    return getStoredBaseCurrency() || getEnvDefaultBase();
  });

  // Create a converter function per base currency.
  const converter = useMemo(() => getConverter(baseCurrency), [baseCurrency]);

  // Reflect selection to localStorage.
  useEffect(() => {
    const normalized = normalizeCurrency(baseCurrency) || getEnvDefaultBase();
    setStoredBaseCurrency(normalized);
  }, [baseCurrency]);

  // Poll the converter meta periodically so banners/status can update after background refresh.
  const [fxMeta, setFxMeta] = useState(() => (typeof converter.meta === "function" ? converter.meta() : null));

  useEffect(() => {
    let alive = true;

    function refreshMeta() {
      if (!alive) return;
      if (typeof converter.meta === "function") {
        const m = converter.meta();
        setFxMeta(m);
        logDebug("[fx] meta", m);
      }
    }

    refreshMeta();
    const t = window.setInterval(refreshMeta, 1500);

    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [converter]);

  const value = useMemo(
    () => ({
      baseCurrency,

      // PUBLIC_INTERFACE
      setBaseCurrency: (next) => {
        /** Sets the user's selected base currency (persisted to localStorage). */
        setBaseCurrency(normalizeCurrency(next) || getEnvDefaultBase());
      },

      // PUBLIC_INTERFACE
      convert: (amount, fromCurrency) => {
        /** Convert amount from fromCurrency to the selected base currency using cached rates. */
        return converter(amount, fromCurrency);
      },

      fxMeta,
    }),
    [baseCurrency, converter, fxMeta]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// PUBLIC_INTERFACE
export function useCurrency() {
  /** Hook to access base currency selection + conversion helpers. */
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within <CurrencyProvider />");
  return ctx;
}
