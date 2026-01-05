import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import SidebarNav from "../components/SidebarNav";
import KPICard from "../components/dashboard/KPICard";
import ChartsContainer from "../components/dashboard/ChartsContainer";
import RecentTransactionsTable from "../components/dashboard/RecentTransactionsTable";
import InlineBanner from "../components/ui/InlineBanner";
import { createRealtimeClient } from "../lib/realtime";
import { analyticsClient } from "../lib/backend/analyticsClient";
import { isApiError } from "../lib/apiClient";
import { isFeatureEnabled } from "../lib/featureFlags";

function shouldDebug() {
  const lvl = (process.env.REACT_APP_LOG_LEVEL || "").trim().toLowerCase();
  return ["debug", "trace"].includes(lvl);
}

/**
 * Minimal mock transaction sample for the Dashboard table.
 * Note: We intentionally allow an empty-state path (0 rows) per spec.
 */
const MOCK_RECENT_TX = [
  { id: "t1", date: "2026-01-02", merchant: "Netflix", category: "Subscriptions", amount: -15.49 },
  { id: "t2", date: "2026-01-01", merchant: "Delta Airlines", category: "Travel", amount: -420.0 },
  { id: "t3", date: "2025-12-30", merchant: "Local Cafe", category: "Dining", amount: -12.75 },
  { id: "t4", date: "2025-12-29", merchant: "Electric Utility", category: "Utilities", amount: -86.21 },
  { id: "t5", date: "2025-12-27", merchant: "Spotify", category: "Subscriptions", amount: -11.99 },
  { id: "t6", date: "2025-12-25", merchant: "Grocery Market", category: "Groceries", amount: -64.33 },
];

function mockFetchDashboard({ emptyTransactions = false } = {}) {
  return {
    kpis: {
      totalSpend: "$2,418.20",
      budgetUsed: "62%",
      overspendRisk: "74",
      activeAlerts: "3",
    },
    recentTransactions: emptyTransactions ? [] : MOCK_RECENT_TX,
  };
}

/**
 * @param {any} err
 * @returns {string}
 */
function formatDashboardError(err) {
  if (isApiError(err)) {
    const suffix = err.requestId ? ` (request: ${err.requestId})` : "";
    return `${err.message}${suffix}`;
  }
  return "We couldn't load dashboard data. Please try again.";
}

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Dashboard overview page: KPI cards, charts, and recent transactions preview. */
  const [filters] = useState({
    // Chart placeholders accept a filters object; keep it stable and minimal here.
    datePreset: "30d",
    dateFrom: "",
    dateTo: "",
    search: "",
    category: "all",
  });

  const [state, setState] = useState({
    loading: true,
    kpis: null,
    recentTransactions: [],
    error: "",
  });

  // A simple "tick" that forces charts to re-run their simulated fetch logic.
  const [transactionsRefreshTick, setTransactionsRefreshTick] = useState(0);

  // Keep a stable realtime client instance per mount.
  const realtimeRef = useRef(null);

  useEffect(() => {
    // Initialize realtime client once.
    realtimeRef.current = createRealtimeClient();

    // Subscribe to transaction inserts. On insert: trigger a lightweight refresh tick.
    const ok = realtimeRef.current.subscribeToTransactions((inserted) => {
      if (shouldDebug()) console.debug("[dashboard] transaction insert received", inserted);
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

  useEffect(() => {
    let alive = true;

    async function run() {
      setState((prev) => ({ ...prev, loading: true, error: "" }));

      const useLive = isFeatureEnabled("analytics_api");

      if (!useLive) {
        // UI scaffold: deliver KPIs reliably, but allow table empty state via initial empty array.
        const delay = 650 + Math.round(Math.random() * 250);
        const t = window.setTimeout(() => {
          if (!alive) return;
          const data = mockFetchDashboard({ emptyTransactions: true });
          setState({
            loading: false,
            kpis: data.kpis,
            recentTransactions: data.recentTransactions,
            error: "",
          });
        }, delay);

        return () => window.clearTimeout(t);
      }

      try {
        // Live KPIs exist in analyticsClient; transactions listing may not.
        const resp = await analyticsClient.getKPIs({ ...filters });

        const list = Array.isArray(resp) ? resp : resp?.kpis || [];
        // Project to the four KPIs required by the spec; fall back if backend differs.
        const kpis = {
          totalSpend: list?.[0]?.value || "$2,418.20",
          budgetUsed: list?.[1]?.value || "62%",
          overspendRisk: list?.[2]?.value || "74",
          activeAlerts: list?.[3]?.value || "3",
        };

        if (!alive) return;

        // Keep recent tx empty until a real endpoint exists (spec requires empty state support).
        setState({
          loading: false,
          kpis,
          recentTransactions: [],
          error: "",
        });
      } catch (e) {
        if (!alive) return;

        // Non-breaking fallback for KPIs; keep transactions empty to surface the empty state UX.
        const data = mockFetchDashboard({ emptyTransactions: true });
        setState({
          loading: false,
          kpis: data.kpis,
          recentTransactions: data.recentTransactions,
          error: formatDashboardError(e),
        });
      }
    }

    const cleanupPromise = run();

    return () => {
      alive = false;
      if (typeof cleanupPromise === "function") cleanupPromise();
    };
  }, [filters, transactionsRefreshTick]);

  const kpiCards = useMemo(
    () => [
      { key: "totalSpend", label: "Total Spend (this month)", value: state.kpis?.totalSpend },
      { key: "budgetUsed", label: "Budget Used (%)", value: state.kpis?.budgetUsed },
      { key: "overspendRisk", label: "Overspend Risk Score", value: state.kpis?.overspendRisk },
      { key: "activeAlerts", label: "Active Alerts Count", value: state.kpis?.activeAlerts },
    ],
    [state.kpis]
  );

  return (
    <Layout>
      {/* Layout decision: keep the app shell (sidebar + main content) inside the centered container
          provided by Layout, and center the main column via .ss-content max-width. */}
      <div className="ss-shell">
        <SidebarNav />

        <div className="ss-content" aria-label="Dashboard content">
          <header className="ss-page-header">
            <h1 className="ss-page-title">Dashboard</h1>
            <p className="ss-page-subtitle">Overview of your spending and risk insights</p>
          </header>

          {state.error ? (
            <div style={{ marginBottom: 14 }}>
              <InlineBanner tone="warning" title="Analytics service unavailable" message={state.error} />
            </div>
          ) : null}

          {/* KPI row: 4 cards in a row on desktop, 2-up / 1-up responsively via grid helpers */}
          <section className="ss-section" aria-label="Key performance indicators">
            <div className="ss-grid ss-dashboard-kpis">
              {kpiCards.map((kpi) => (
                <div key={kpi.key} className="ss-col-12 ss-col-6 ss-col-3">
                  <KPICard loading={state.loading} value={kpi.value} label={kpi.label} />
                </div>
              ))}
            </div>
          </section>

          {/* Charts row: 2 charts side-by-side; chart placeholders provide spinner/loading UI */}
          <ChartsContainer filters={filters} refreshTick={transactionsRefreshTick} />

          {/* Recent transactions table: max 5 rows + View all link, with required empty state message */}
          <section className="ss-section">
            <RecentTransactionsTable
              loading={state.loading}
              transactions={state.recentTransactions}
              maxRows={5}
              viewAllTo="/transactions"
            />
          </section>
        </div>
      </div>
    </Layout>
  );
}
