import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import FiltersBar from "../components/ui/FiltersBar";
import LoadingState from "../components/ui/LoadingState";
import EmptyState from "../components/ui/EmptyState";
import {
  BarChartPlaceholder,
  LineChartPlaceholder,
  PieChartPlaceholder,
} from "../components/charts/ChartPlaceholders";

const MOCK_KPIS = [
  { key: "total", label: "Total Spend", value: "$2,418.20" },
  { key: "avg", label: "Avg / Day", value: "$80.61" },
  { key: "subs", label: "Subscriptions", value: "$129.99" },
];

function mockFetchKpis(filters) {
  const query = (filters?.search || "").trim().toLowerCase();
  if (query.includes("empty") || query.includes("none")) return [];
  return MOCK_KPIS;
}

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Dashboard overview page with filters + loading/empty state demos. */
  const [filters, setFilters] = useState({
    datePreset: "30d",
    dateFrom: "",
    dateTo: "",
    search: "",
    category: "all",
  });

  const [kpisState, setKpisState] = useState({ loading: true, data: [] });

  useEffect(() => {
    let alive = true;
    setKpisState({ loading: true, data: [] });

    const delay = 850 + Math.round(Math.random() * 300);
    const t = window.setTimeout(() => {
      if (!alive) return;
      setKpisState({ loading: false, data: mockFetchKpis(filters) });
    }, delay);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [filters.datePreset, filters.dateFrom, filters.dateTo, filters.search, filters.category]);

  const subtitle = useMemo(() => {
    const categoryLabel = filters.category === "all" ? "All categories" : filters.category;
    return `Overview • ${categoryLabel}`;
  }, [filters.category]);

  return (
    <Layout>
      <h1 className="ss-page-title">Dashboard</h1>
      <p className="ss-page-subtitle">{subtitle}</p>

      <FiltersBar
        initialFilters={filters}
        onChange={(next) => setFilters(next)}
      />

      <div className="ss-grid" style={{ marginBottom: 14 }}>
        <div className="ss-col-12">
          <section className="ss-card" aria-label="Key performance indicators">
            <div className="ss-card-header">
              <h2 className="ss-card-title">Key metrics</h2>
              <span className="ss-muted" style={{ fontSize: 12 }}>
                Mock data
              </span>
            </div>
            <div className="ss-card-body">
              {kpisState.loading ? (
                <LoadingState message="Loading KPIs…" />
              ) : !kpisState.data?.length ? (
                <EmptyState
                  title="No KPIs available"
                  message="Try clearing your search or adjusting the date range."
                  actionLabel="Clear filters"
                  onAction={() =>
                    setFilters((prev) => ({ ...prev, search: "", category: "all" }))
                  }
                />
              ) : (
                <div className="ss-grid" style={{ gap: 10 }}>
                  {kpisState.data.map((kpi) => (
                    <div key={kpi.key} className="ss-col-12 ss-col-4">
                      <div className="ss-card" style={{ boxShadow: "none" }}>
                        <div className="ss-card-body" style={{ padding: 14 }}>
                          <div className="ss-muted" style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            {kpi.label}
                          </div>
                          <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>
                            {kpi.value}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="ss-grid">
        <div className="ss-col-12 ss-col-4">
          <LineChartPlaceholder title="Spending Trend" filters={filters} />
        </div>
        <div className="ss-col-12 ss-col-4">
          <BarChartPlaceholder title="Category Breakdown" filters={filters} />
        </div>
        <div className="ss-col-12 ss-col-4">
          <PieChartPlaceholder title="Budget Allocation" filters={filters} />
        </div>
      </div>
    </Layout>
  );
}
