import React from "react";
import Layout from "../components/Layout";

// PUBLIC_INTERFACE
export default function InsightsPage() {
  /** Insights page (placeholder). */
  return (
    <Layout>
      <h1 className="ss-page-title">Insights</h1>
      <div className="ss-card">
        <div className="ss-card-body">
          <p className="ss-muted" style={{ margin: 0 }}>
            TODO: Add insight cards, anomaly detection summaries, and recommendations.
          </p>
        </div>
      </div>
    </Layout>
  );
}
