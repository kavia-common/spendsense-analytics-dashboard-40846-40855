import React, { useEffect, useMemo, useState } from "react";
import EmptyState from "../ui/EmptyState";
import LoadingState from "../ui/LoadingState";

function ChartShell({ title, children, statusPill }) {
  return (
    <section className="ss-card ss-chart-placeholder">
      <div className="ss-card-header">
        <h3 className="ss-card-title">{title}</h3>
        {statusPill || (
          <span className="ss-muted" style={{ fontSize: 12 }}>
            Placeholder
          </span>
        )}
      </div>
      <div className="ss-card-body">{children}</div>
    </section>
  );
}

/**
 * Small, deterministic mock: based on filter values, sometimes return empty.
 * This is a UI/UX demo only (no backend).
 */
function mockChartData(filters) {
  const query = (filters?.search || "").trim().toLowerCase();
  const category = filters?.category || "all";

  // Force empty for certain searches to demo EmptyState.
  if (query.includes("empty") || query.includes("none")) return [];

  // Simple demo: if a specific category is selected, arbitrarily empty one chart.
  if (category === "travel") return [];

  // Otherwise return some "data exists" marker.
  return [1, 2, 3];
}

function useMockLoading(filters, refreshTick = 0) {
  const [state, setState] = useState({ loading: true, data: [] });

  // Memoize a stable key to satisfy exhaustive-deps without depending on the full object identity.
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
    setState({ loading: true, data: [] });

    const delay = 800 + Math.round(Math.random() * 400);
    const t = window.setTimeout(() => {
      if (!alive) return;
      setState({ loading: false, data: mockChartData(filters) });
    }, delay);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [filtersKey, refreshTick, filters]);

  return state;
}

// PUBLIC_INTERFACE
export function LineChartPlaceholder({ title = "Line Chart", filters, refreshTick = 0 }) {
  /** Placeholder for a line chart with loading + empty states. */
  const { loading, data } = useMockLoading(filters, refreshTick);

  const statusPill = useMemo(() => {
    if (loading) return <span className="ss-muted" style={{ fontSize: 12 }}>Loading</span>;
    if (!data?.length) return <span className="ss-muted" style={{ fontSize: 12 }}>No data</span>;
    return <span className="ss-muted" style={{ fontSize: 12 }}>Ready</span>;
  }, [loading, data]);

  return (
    <ChartShell title={title} statusPill={statusPill}>
      {loading ? (
        <LoadingState message="Loading chart…" />
      ) : !data?.length ? (
        <EmptyState
          title="No chart data"
          message="We couldn't find data for the selected filters. Try broadening your date range."
        />
      ) : (
        <div className="ss-chart-canvas" role="img" aria-label={`${title} placeholder`}>
          <p className="ss-chart-note">
            TODO: Integrate real charting library (e.g., Recharts/Chart.js) here.
            <br />
            <span className="ss-muted">Responsive container ready.</span>
          </p>
        </div>
      )}
    </ChartShell>
  );
}

// PUBLIC_INTERFACE
export function BarChartPlaceholder({ title = "Bar Chart", filters, refreshTick = 0 }) {
  /** Placeholder for a bar chart with loading + empty states. */
  const { loading, data } = useMockLoading(filters, refreshTick);

  return (
    <ChartShell
      title={title}
      statusPill={
        <span className="ss-muted" style={{ fontSize: 12 }}>
          {loading ? "Loading" : data?.length ? "Ready" : "No data"}
        </span>
      }
    >
      {loading ? (
        <LoadingState message="Loading chart…" />
      ) : !data?.length ? (
        <EmptyState
          title="Nothing to chart"
          message="No categories matched the current filters."
        />
      ) : (
        <div className="ss-chart-canvas" role="img" aria-label={`${title} placeholder`}>
          <p className="ss-chart-note">
            TODO: Integrate real charting library (e.g., Recharts/Chart.js) here.
            <br />
            <span className="ss-muted">Add series + axes later.</span>
          </p>
        </div>
      )}
    </ChartShell>
  );
}

// PUBLIC_INTERFACE
export function PieChartPlaceholder({ title = "Pie Chart", filters, refreshTick = 0 }) {
  /** Placeholder for a pie/donut chart with loading + empty states. */
  const { loading, data } = useMockLoading(filters, refreshTick);

  return (
    <ChartShell
      title={title}
      statusPill={
        <span className="ss-muted" style={{ fontSize: 12 }}>
          {loading ? "Loading" : data?.length ? "Ready" : "No data"}
        </span>
      }
    >
      {loading ? (
        <LoadingState message="Loading chart…" />
      ) : !data?.length ? (
        <EmptyState
          title="No allocation data"
          message="Try changing category or date range to see budget allocation."
        />
      ) : (
        <div className="ss-chart-canvas" role="img" aria-label={`${title} placeholder`}>
          <p className="ss-chart-note">
            TODO: Integrate real charting library (e.g., Recharts/Chart.js) here.
            <br />
            <span className="ss-muted">Donut + legend goes here.</span>
          </p>
        </div>
      )}
    </ChartShell>
  );
}
