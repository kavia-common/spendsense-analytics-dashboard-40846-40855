import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import FiltersBar from "../components/ui/FiltersBar";
import LoadingState from "../components/ui/LoadingState";
import EmptyState from "../components/ui/EmptyState";
import InlineBanner from "../components/ui/InlineBanner";
import BaseCurrencySelect from "../components/ui/BaseCurrencySelect";
import {
  BarChartPlaceholder,
  LineChartPlaceholder,
  PieChartPlaceholder,
} from "../components/charts/ChartPlaceholders";
import { createRealtimeClient } from "../lib/realtime";
import { useCurrency } from "../currency/CurrencyContext";
import { formatMoney, formatOriginalMoney } from "../lib/money";
import { analyticsClient } from "../lib/backend/analyticsClient";
import { isApiError } from "../lib/apiClient";
import { isFeatureEnabled } from "../lib/featureFlags";

const MOCK_KPIS = [
  // Mock KPIs are modeled as if they could arrive in various currencies.
  // The UI will normalize to the user-selected base currency.
  { key: "total", label: "Total Spend", amount: 2418.2, currency: "USD" },
  { key: "avg", label: "Avg / Day", amount: 80.61, currency: "USD" },
  { key: "subs", label: "Subscriptions", amount: 129.99, currency: "USD" },
];

function mockFetchKpis(filters) {
  const query = (filters?.search || "").trim().toLowerCase();
  if (query.includes("empty") || query.includes("none")) return [];
  return MOCK_KPIS;
}

/**
 * @param {any} err
 * @returns {string}
 */
function formatKpiError(err) {
  if (isApiError(err)) {
    const suffix = err.requestId ? ` (request: ${err.requestId})` : "";
    return `${err.message}${suffix}`;
  }
  return "We couldn't load KPIs from the analytics service. Please try again.";
}

function shouldDebug() {
  const lvl = (process.env.REACT_APP_LOG_LEVEL || "").trim().toLowerCase();
  return ["debug", "trace"].includes(lvl);
}

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Dashboard overview page with filters + loading/empty state demos. */
  const { baseCurrency, convert, fxMeta } = useCurrency();

  const [filters, setFilters] = useState({
    datePreset: "30d",
    dateFrom: "",
    dateTo: "",
    search: "",
    category: "all",
  });

  const [kpisState, setKpisState] = useState({ loading: true, data: [], error: "" });

  // A simple "tick" that forces mocked KPIs/charts to re-run their simulated fetch logic.
  const [transactionsRefreshTick, setTransactionsRefreshTick] = useState(0);

  // Keep a stable realtime client instance per mount.
  const realtimeRef = useRef(null);

  useEffect(() => {
    // Initialize client once.
    realtimeRef.current = createRealtimeClient();

    // Subscribe to transaction inserts. On insert: trigger a lightweight refresh tick.
    const ok = realtimeRef.current.subscribeToTransactions((inserted) => {
      if (shouldDebug()) console.debug("[dashboard] transaction insert received", inserted);

      // For this UI scaffold, we refetch/recompute mocked data.
      // In a real implementation, we could optimistically merge inserted tx into state.
      setTransactionsRefreshTick((t) => t + 1);
    });

    if (shouldDebug()) console.debug("[dashboard] realtime subscription started:", ok);

    return () => {
      // Cleanup to avoid memory leaks when navigating away.
      const rt = realtimeRef.current;
      realtimeRef.current = null;
      if (rt && typeof rt.unsubscribe === "function") {
        rt.unsubscribe();
      }
      if (shouldDebug()) console.debug("[dashboard] realtime subscription cleaned up");
    };
  }, []);

  const filtersKey = useMemo(
    () =>
      [
        filters?.datePreset || "",
        filters?.dateFrom || "",
        filters?.dateTo || "",
        filters?.search || "",
        filters?.category || "",
      ].join("|"),
    [filters]
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      setKpisState({ loading: true, data: [], error: "" });

      // Feature flag to keep non-breaking existing mock behavior.
      const useLive = isFeatureEnabled("analytics_api");

      if (!useLive) {
        // Keep the original UX delay for consistency with the UI scaffold.
        const delay = 850 + Math.round(Math.random() * 300);
        const t = window.setTimeout(() => {
          if (!alive) return;
          setKpisState({ loading: false, data: mockFetchKpis(filters), error: "" });
        }, delay);

        return () => window.clearTimeout(t);
      }

      try {
        const resp = await analyticsClient.getKPIs({
          ...filters,
          baseCurrency,
        });

        // Expect { kpis: [...] } but tolerate backend returning raw array during early iterations.
        const list = Array.isArray(resp) ? resp : resp?.kpis || [];
        if (!alive) return;

        setKpisState({ loading: false, data: list, error: "" });
      } catch (e) {
        if (!alive) return;

        // Non-breaking fallback: if analytics endpoint isn't available yet, show mock data.
        // (Backend note in task: analytics endpoints will be added later.)
        const fallback = mockFetchKpis(filters);
        setKpisState({
          loading: false,
          data: fallback,
          error: formatKpiError(e),
        });
      }
    }

    const cleanupPromise = run();

    return () => {
      alive = false;
      // If mock branch returned a cleanup fn, run it.
      if (typeof cleanupPromise === "function") cleanupPromise();
    };
  }, [filtersKey, transactionsRefreshTick, filters, baseCurrency]);

  const subtitle = useMemo(() => {
    const categoryLabel = filters.category === "all" ? "All categories" : filters.category;
    return `Overview • ${categoryLabel}`;
  }, [filters.category]);

  return (
    <Layout>
      <h1 className="ss-page-title">Dashboard</h1>
      <p className="ss-page-subtitle">{subtitle}</p>

      <FiltersBar initialFilters={filters} onChange={(next) => setFilters(next)}>
        <BaseCurrencySelect />
      </FiltersBar>

      {!fxMeta?.hasRates ? (
        <div style={{ marginBottom: 14 }}>
          <InlineBanner
            tone={fxMeta?.lastErrorAt ? "warning" : "info"}
            title="Currency conversion running in passthrough mode"
            message={
              process.env.REACT_APP_EXCHANGE_RATES_API_URL
                ? "Exchange rates are unavailable right now. Showing original amounts until rates are fetched."
                : "No exchange rates API is configured. Set REACT_APP_EXCHANGE_RATES_API_URL to enable conversion."
            }
          />
        </div>
      ) : fxMeta?.lastErrorAt ? (
        <div style={{ marginBottom: 14 }}>
          <InlineBanner
            tone="warning"
            title="Exchange rates temporarily unavailable"
            message="Using last known rates. Amounts may be slightly outdated."
          />
        </div>
      ) : null}

      <div className="ss-grid" style={{ marginBottom: 14 }}>
        <div className="ss-col-12">
          <section className="ss-card" aria-label="Key performance indicators">
            <div className="ss-card-header">
              <h2 className="ss-card-title">Key metrics</h2>
              <span className="ss-muted" style={{ fontSize: 12 }}>
                {isFeatureEnabled("analytics_api") ? "Live (analytics-api)" : "Mock data"} • Base: {baseCurrency}
              </span>
            </div>
            <div className="ss-card-body">
              {kpisState.error ? (
                <div style={{ marginBottom: 10 }}>
                  <InlineBanner tone="warning" title="Analytics service unavailable" message={kpisState.error} />
                </div>
              ) : null}

              {kpisState.loading ? (
                <LoadingState message="Loading KPIs…" />
              ) : !kpisState.data?.length ? (
                <EmptyState
                  title="No KPIs available"
                  message="Try clearing your search or adjusting the date range."
                  actionLabel="Clear filters"
                  onAction={() => setFilters((prev) => ({ ...prev, search: "", category: "all" }))}
                />
              ) : (
                <div className="ss-grid" style={{ gap: 10 }}>
                  {kpisState.data.map((kpi) => {
                    const normalized = convert(kpi.amount, kpi.currency);
                    const primary = formatMoney(normalized, baseCurrency);
                    const secondary = formatOriginalMoney(kpi.amount, kpi.currency);

                    return (
                      <div key={kpi.key} className="ss-col-12 ss-col-4">
                        <div className="ss-card" style={{ boxShadow: "none" }}>
                          <div className="ss-card-body" style={{ padding: 14 }}>
                            <div
                              className="ss-muted"
                              style={{
                                fontSize: 12,
                                fontWeight: 900,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                              }}
                            >
                              {kpi.label}
                            </div>

                            <div
                              title={`Original: ${secondary}`}
                              style={{
                                marginTop: 8,
                                fontSize: 22,
                                fontWeight: 900,
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {primary}
                            </div>

                            {kpi.currency !== baseCurrency ? (
                              <div className="ss-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                {secondary}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="ss-grid">
        <div className="ss-col-12 ss-col-4">
          <LineChartPlaceholder
            title="Spending Trend"
            filters={filters}
            refreshTick={transactionsRefreshTick}
          />
        </div>
        <div className="ss-col-12 ss-col-4">
          <BarChartPlaceholder
            title="Category Breakdown"
            filters={filters}
            refreshTick={transactionsRefreshTick}
          />
        </div>
        <div className="ss-col-12 ss-col-4">
          <PieChartPlaceholder
            title="Budget Allocation"
            filters={filters}
            refreshTick={transactionsRefreshTick}
          />
        </div>
      </div>
    </Layout>
  );
}
