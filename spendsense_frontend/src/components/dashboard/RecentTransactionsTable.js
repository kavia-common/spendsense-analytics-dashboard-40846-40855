import React from "react";
import { Link } from "react-router-dom";
import LoadingState from "../ui/LoadingState";
import EmptyState from "../ui/EmptyState";

/**
 * Formats a signed amount as a money-like string without depending on currency context.
 * Dashboard spec needs a clean table; real formatting can be swapped later.
 */
function formatAmount(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount ?? "");
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(2)}`;
}

// PUBLIC_INTERFACE
export default function RecentTransactionsTable({
  loading = false,
  transactions = [],
  maxRows = 5,
  viewAllTo = "/transactions",
}) {
  /**
   * Recent transactions table used on Dashboard.
   *
   * States:
   * - Loading: skeleton rows
   * - Empty: spec message prompting CSV upload
   *
   * Props:
   * - transactions: array of { id, date, merchant, category, amount }
   * - maxRows: number of rows to display
   * - viewAllTo: route to the Transactions page
   */
  const rows = (transactions || []).slice(0, maxRows);

  return (
    <section className="ss-card" aria-label="Recent transactions">
      <div className="ss-card-header">
        <h2 className="ss-card-title">Recent Transactions</h2>
        <Link className="ss-link" to={viewAllTo} aria-label="View all transactions">
          View all
        </Link>
      </div>

      <div className="ss-card-body">
        {loading ? (
          <LoadingState variant="table" message="Loading transactions…" rows={5} />
        ) : !rows.length ? (
          <EmptyState
            title="No transactions yet"
            message="No transactions yet. Upload a CSV to get started."
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
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td style={{ fontWeight: 800, color: "var(--ss-text)" }}>{t.merchant}</td>
                    <td className="ss-muted">{t.category}</td>
                    <td style={{ fontWeight: 900 }}>{formatAmount(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
