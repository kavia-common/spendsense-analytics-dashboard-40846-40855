import React from "react";

// PUBLIC_INTERFACE
export default function LoadingState({
  message = "Loading…",
  variant = "card",
  rows = 6,
}) {
  /**
   * Loading state UI using skeleton blocks.
   *
   * Props:
   * - message: assistive text under the skeleton
   * - variant: "card" | "table"
   * - rows: number of skeleton rows for table variant
   */
  if (variant === "table") {
    return (
      <div className="ss-loading" role="status" aria-live="polite">
        <div className="ss-loading-table" aria-hidden="true">
          {Array.from({ length: rows }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="ss-skel-row" key={i}>
              <div className="ss-skel ss-skel-sm" />
              <div className="ss-skel ss-skel-md" />
              <div className="ss-skel ss-skel-md" />
              <div className="ss-skel ss-skel-lg" />
            </div>
          ))}
        </div>
        <p className="ss-loading-message">{message}</p>
      </div>
    );
  }

  return (
    <div className="ss-loading" role="status" aria-live="polite">
      <div className="ss-loading-card" aria-hidden="true">
        <div className="ss-skel ss-skel-title" />
        <div className="ss-skel ss-skel-line" />
        <div className="ss-skel ss-skel-line" />
        <div className="ss-skel ss-skel-block" />
      </div>
      <p className="ss-loading-message">{message}</p>
    </div>
  );
}
