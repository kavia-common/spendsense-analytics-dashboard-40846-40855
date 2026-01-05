import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import FiltersBar from "../components/ui/FiltersBar";
import LoadingState from "../components/ui/LoadingState";
import EmptyState from "../components/ui/EmptyState";

const MOCK_TRANSACTIONS = [
  { id: "t1", date: "2026-01-02", merchant: "Netflix", category: "subscriptions", amount: -15.49 },
  { id: "t2", date: "2026-01-01", merchant: "Delta Airlines", category: "travel", amount: -420.0 },
  { id: "t3", date: "2025-12-30", merchant: "Local Cafe", category: "dining", amount: -12.75 },
  { id: "t4", date: "2025-12-29", merchant: "Electric Utility", category: "utilities", amount: -86.21 },
  { id: "t5", date: "2025-12-27", merchant: "Spotify", category: "subscriptions", amount: -11.99 },
  { id: "t6", date: "2025-12-25", merchant: "Grocery Market", category: "other", amount: -64.33 },
];

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(2)}`;
}

function computePresetRange(preset) {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);

  if (preset === "7d") start.setUTCDate(start.getUTCDate() - 7);
  if (preset === "30d") start.setUTCDate(start.getUTCDate() - 30);
  if (preset === "ytd") start.setUTCMonth(0, 1);

  const toIso = (d) => d.toISOString().slice(0, 10);
  return { from: toIso(start), to: toIso(end) };
}

function inDateRange(txDate, filters) {
  const { datePreset, dateFrom, dateTo } = filters || {};
  const d = txDate;

  let from = "";
  let to = "";

  if (datePreset === "custom") {
    from = dateFrom || "";
    to = dateTo || "";
  } else {
    const r = computePresetRange(datePreset || "30d");
    from = r.from;
    to = r.to;
  }

  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function applyFilters(transactions, filters) {
  const q = (filters?.search || "").trim().toLowerCase();
  const category = filters?.category || "all";

  return transactions
    .filter((t) => inDateRange(t.date, filters))
    .filter((t) => (category === "all" ? true : t.category === category))
    .filter((t) => {
      if (!q) return true;
      return (
        t.merchant.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.date.includes(q)
      );
    });
}

function CategoryPill({ category }) {
  const cls = `ss-pill ss-pill-${category}`;
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  return (
    <span className={cls}>
      <span className="ss-pill-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

// PUBLIC_INTERFACE
export default function TransactionsPage() {
  /** Transactions page with filters + loading/empty states (mock data). */
  const [filters, setFilters] = useState({
    datePreset: "30d",
    dateFrom: "",
    dateTo: "",
    search: "",
    category: "all",
  });

  const [state, setState] = useState({ loading: true, data: [] });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: [] });

    const delay = 900 + Math.round(Math.random() * 300);
    const t = window.setTimeout(() => {
      if (!alive) return;
      // Simulate fetch, then apply client-side filtering.
      const filtered = applyFilters(MOCK_TRANSACTIONS, filters);
      setState({ loading: false, data: filtered });
    }, delay);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [filters.datePreset, filters.dateFrom, filters.dateTo, filters.search, filters.category]);

  const total = useMemo(() => {
    if (!state.data?.length) return 0;
    return state.data.reduce((acc, t) => acc + t.amount, 0);
  }, [state.data]);

  return (
    <Layout>
      <h1 className="ss-page-title">Transactions</h1>
      <p className="ss-page-subtitle">
        Browse and search your activity • Total shown: <strong>{formatMoney(total)}</strong>
      </p>

      <FiltersBar initialFilters={filters} onChange={(next) => setFilters(next)} />

      <div className="ss-card" aria-label="Transactions table">
        <div className="ss-card-header">
          <h2 className="ss-card-title">Recent transactions</h2>
          <span className="ss-muted" style={{ fontSize: 12 }}>
            {state.loading ? "Loading" : `${state.data.length} result(s)`}
          </span>
        </div>

        <div className="ss-card-body">
          {state.loading ? (
            <LoadingState variant="table" message="Loading transactions…" rows={7} />
          ) : !state.data?.length ? (
            <EmptyState
              title="No transactions found"
              message="No results match your filters. Try a broader date range or clear search."
              actionLabel="Clear filters"
              onAction={() => setFilters((prev) => ({ ...prev, search: "", category: "all" }))}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ss-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Merchant</th>
                    <th scope="col">Category</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td style={{ fontWeight: 800, color: "var(--ss-text)" }}>{t.merchant}</td>
                      <td>
                        <CategoryPill category={t.category} />
                      </td>
                      <td style={{ fontWeight: 900, color: t.amount < 0 ? "var(--ss-text)" : "var(--ss-success)" }}>
                        {formatMoney(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
