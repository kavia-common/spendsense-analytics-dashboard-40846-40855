import React from "react";

function ChartShell({ title, children }) {
  return (
    <section className="ss-card ss-chart-placeholder">
      <div className="ss-card-header">
        <h3 className="ss-card-title">{title}</h3>
        <span className="ss-muted" style={{ fontSize: 12 }}>
          Placeholder
        </span>
      </div>
      <div className="ss-card-body">{children}</div>
    </section>
  );
}

// PUBLIC_INTERFACE
export function LineChartPlaceholder({ title = "Line Chart" }) {
  /** Placeholder for a line chart. */
  return (
    <ChartShell title={title}>
      <div className="ss-chart-canvas" role="img" aria-label={`${title} placeholder`}>
        <p className="ss-chart-note">
          TODO: Integrate real charting library (e.g., Recharts/Chart.js) here.
          <br />
          <span className="ss-muted">Responsive container ready.</span>
        </p>
      </div>
    </ChartShell>
  );
}

// PUBLIC_INTERFACE
export function BarChartPlaceholder({ title = "Bar Chart" }) {
  /** Placeholder for a bar chart. */
  return (
    <ChartShell title={title}>
      <div className="ss-chart-canvas" role="img" aria-label={`${title} placeholder`}>
        <p className="ss-chart-note">
          TODO: Integrate real charting library (e.g., Recharts/Chart.js) here.
          <br />
          <span className="ss-muted">Add series + axes later.</span>
        </p>
      </div>
    </ChartShell>
  );
}

// PUBLIC_INTERFACE
export function PieChartPlaceholder({ title = "Pie Chart" }) {
  /** Placeholder for a pie/donut chart. */
  return (
    <ChartShell title={title}>
      <div className="ss-chart-canvas" role="img" aria-label={`${title} placeholder`}>
        <p className="ss-chart-note">
          TODO: Integrate real charting library (e.g., Recharts/Chart.js) here.
          <br />
          <span className="ss-muted">Donut + legend goes here.</span>
        </p>
      </div>
    </ChartShell>
  );
}
