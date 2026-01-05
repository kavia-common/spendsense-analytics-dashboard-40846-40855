import React from "react";

// PUBLIC_INTERFACE
export default function KPICard({ value, label, loading = false }) {
  /**
   * KPI card used in the Dashboard KPI row.
   *
   * Props:
   * - value: string/number (large value shown at top)
   * - label: string (caption under the value)
   * - loading: boolean (renders skeleton state)
   */
  return (
    <div className="ss-kpi-card ss-card" aria-label={label}>
      <div className="ss-card-body ss-kpi-body">
        {loading ? (
          <div className="ss-kpi-skeleton" aria-hidden="true">
            <div className="ss-skel ss-kpi-skel-value" />
            <div className="ss-skel ss-kpi-skel-label" />
          </div>
        ) : (
          <>
            <div className="ss-kpi-value">{value}</div>
            <div className="ss-kpi-label">{label}</div>
          </>
        )}
      </div>
    </div>
  );
}
