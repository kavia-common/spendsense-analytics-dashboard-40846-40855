import React, { useMemo } from "react";
import { useCurrency } from "../../currency/CurrencyContext";

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "INR", label: "INR — Indian Rupee" },
];

// PUBLIC_INTERFACE
export default function BaseCurrencySelect({ label = "Base currency", compact = false }) {
  /** Base currency selector that persists via CurrencyContext/localStorage. */
  const { baseCurrency, setBaseCurrency } = useCurrency();

  const options = useMemo(() => {
    // Ensure env-provided base currency is present, even if not in list.
    const envDefault = (process.env.REACT_APP_BASE_CURRENCY || "USD").trim().toUpperCase();
    const base = baseCurrency || envDefault;
    const has = CURRENCIES.some((c) => c.code === base);
    if (has) return CURRENCIES;
    return [{ code: base, label: `${base} — Base` }, ...CURRENCIES];
  }, [baseCurrency]);

  return (
    <div className="ss-field" style={compact ? { minWidth: 180 } : undefined}>
      <label className="ss-label" htmlFor="ss-base-currency">
        {label}
      </label>
      <select
        id="ss-base-currency"
        className="ss-select"
        value={baseCurrency}
        onChange={(e) => setBaseCurrency(e.target.value)}
        aria-label="Base currency"
      >
        {options.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
