import React from "react";
import { LineChartPlaceholder, PieChartPlaceholder } from "../charts/ChartPlaceholders";

// PUBLIC_INTERFACE
export default function ChartsContainer({ filters, refreshTick = 0 }) {
  /**
   * Dashboard charts row (2-up) that stacks on small screens.
   *
   * Uses existing placeholder chart components which already provide
   * skeleton loading + empty states.
   */
  return (
    <section className="ss-section" aria-label="Dashboard charts">
      <div className="ss-grid ss-dashboard-charts">
        <div className="ss-col-12 ss-col-6">
          <LineChartPlaceholder
            title="Monthly Spend Trend"
            filters={filters}
            refreshTick={refreshTick}
          />
        </div>
        <div className="ss-col-12 ss-col-6">
          <PieChartPlaceholder
            title="Category Spend Breakdown"
            filters={filters}
            refreshTick={refreshTick}
          />
        </div>
      </div>
    </section>
  );
}
