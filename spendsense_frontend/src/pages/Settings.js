import React from "react";
import Layout from "../components/Layout";

// PUBLIC_INTERFACE
export default function SettingsPage() {
  /** Settings page (placeholder). */
  return (
    <Layout>
      <h1 className="ss-page-title">Settings</h1>
      <div className="ss-card">
        <div className="ss-card-body">
          <p className="ss-muted" style={{ margin: 0 }}>
            TODO: Add profile settings, theme settings, and integrations.
          </p>
        </div>
      </div>
    </Layout>
  );
}
