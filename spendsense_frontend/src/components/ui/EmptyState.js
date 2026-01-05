import React from "react";

// PUBLIC_INTERFACE
export default function EmptyState({
  title = "Nothing to show",
  message = "Try adjusting your filters or check back later.",
  icon,
  actionLabel,
  onAction,
}) {
  /**
   * Empty state panel for cards, tables, and charts.
   *
   * Props:
   * - title/message: primary text
   * - icon: optional React node; falls back to a simple placeholder glyph
   * - actionLabel/onAction: optional CTA button
   */
  return (
    <div className="ss-empty" role="status" aria-live="polite">
      <div className="ss-empty-illustration" aria-hidden="true">
        {icon || <span className="ss-empty-glyph">◎</span>}
      </div>
      <div className="ss-empty-content">
        <h3 className="ss-empty-title">{title}</h3>
        <p className="ss-empty-message">{message}</p>
        {actionLabel && typeof onAction === "function" ? (
          <button type="button" className="ss-btn ss-btn-primary" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
