import React from "react";
import Layout from "../components/Layout";
import {
  BarChartPlaceholder,
  LineChartPlaceholder,
  PieChartPlaceholder,
} from "../components/charts/ChartPlaceholders";

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Dashboard overview page (scaffolding). */
  return (
    <Layout>
      <h1 className="ss-page-title">Dashboard</h1>

      <div className="ss-grid">
        <div className="ss-col-12 ss-col-4">
          <LineChartPlaceholder title="Spending Trend" />
        </div>
        <div className="ss-col-12 ss-col-4">
          <BarChartPlaceholder title="Category Breakdown" />
        </div>
        <div className="ss-col-12 ss-col-4">
          <PieChartPlaceholder title="Budget Allocation" />
        </div>
      </div>
    </Layout>
  );
}
