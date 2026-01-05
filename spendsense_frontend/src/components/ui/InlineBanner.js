import React from "react";

// PUBLIC_INTERFACE
export default function InlineBanner({ tone = "warning", title, message, right }) {
  /** Inline, non-blocking banner for small warnings/errors/info. */
  const stylesByTone = {
    warning: {
      border: "rgba(245, 158, 11, 0.45)",
      bg: "rgba(245, 158, 11, 0.08)",
      dot: "rgba(245, 158, 11, 0.95)",
    },
    error: {
      border: "rgba(220, 38, 38, 0.40)",
      bg: "rgba(220, 38, 38, 0.07)",
      dot: "rgba(220, 38, 38, 0.90)",
    },
    info: {
      border: "rgba(37, 99, 235, 0.35)",
      bg: "rgba(37, 99, 235, 0.07)",
      dot: "rgba(37, 99, 235, 0.85)",
    },
  };

  const s = stylesByTone[tone] || stylesByTone.warning;

  return (
    <div
      role="status"
      aria-live="polite"
      className="ss-card"
      style={{
        borderColor: s.border,
        background: s.bg,
        boxShadow: "none",
      }}
    >
      <div
        className="ss-card-body"
        style={{
          padding: 12,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: s.dot,
              marginTop: 5,
              flex: "0 0 auto",
            }}
          />
          <div>
            {title ? (
              <div style={{ fontWeight: 900, fontSize: 13, color: "var(--ss-text)" }}>{title}</div>
            ) : null}
            {message ? (
              <div className="ss-muted" style={{ fontSize: 13, marginTop: title ? 2 : 0 }}>
                {message}
              </div>
            ) : null}
          </div>
        </div>

        {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
      </div>
    </div>
  );
}
