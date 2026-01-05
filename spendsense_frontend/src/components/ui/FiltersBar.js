import React, { useEffect, useMemo, useState } from "react";

/**
 * Normalizes and merges partial filter updates into a single object.
 * Kept local to this file to avoid leaking implementation details.
 */
function mergeFilters(prev, partial) {
  return { ...prev, ...partial };
}

/**
 * Default category options (kept small and consistent with the request).
 */
const DEFAULT_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "travel", label: "Travel" },
  { value: "dining", label: "Dining" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

const DEFAULT_DATE_PRESETS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
];

// PUBLIC_INTERFACE
export default function FiltersBar({
  initialFilters,
  onChange,
  children,
  showSearch = true,
  showCategory = true,
  showDate = true,
  searchPlaceholder = "Search transactions…",
}) {
  /**
   * Reusable filters row for pages.
   *
   * Props:
   * - initialFilters: optional object to seed state
   * - onChange: callback(filtersObject) called on any change
   * - children: optional additional filter controls (composable)
   * - showSearch/showCategory/showDate: toggle built-in controls
   */
  const seeded = useMemo(
    () => ({
      datePreset: "30d",
      dateFrom: "",
      dateTo: "",
      search: "",
      category: "all",
      ...(initialFilters || {}),
    }),
    [initialFilters]
  );

  const [filters, setFilters] = useState(seeded);

  // Keep state aligned if parent changes initialFilters (rare, but safe).
  useEffect(() => {
    setFilters(seeded);
  }, [seeded]);

  // Emit consolidated filters whenever local state changes.
  useEffect(() => {
    if (typeof onChange === "function") onChange(filters);
  }, [filters, onChange]);

  const update = (partial) => setFilters((prev) => mergeFilters(prev, partial));

  return (
    <section className="ss-filters" aria-label="Filters">
      <div className="ss-filters-inner">
        {showDate ? (
          <div className="ss-field">
            <label className="ss-label" htmlFor="ss-date-preset">
              Date range
            </label>
            <div className="ss-control-row">
              <select
                id="ss-date-preset"
                className="ss-select"
                value={filters.datePreset}
                onChange={(e) => update({ datePreset: e.target.value })}
              >
                {DEFAULT_DATE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>

              {filters.datePreset === "custom" ? (
                <div className="ss-control-row ss-control-row-compact" aria-label="Custom date range">
                  <input
                    className="ss-input"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => update({ dateFrom: e.target.value })}
                    aria-label="From date"
                  />
                  <span className="ss-muted" aria-hidden="true">
                    to
                  </span>
                  <input
                    className="ss-input"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => update({ dateTo: e.target.value })}
                    aria-label="To date"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showSearch ? (
          <div className="ss-field ss-field-grow">
            <label className="ss-label" htmlFor="ss-filter-search">
              Search
            </label>
            <div className="ss-input-icon">
              <span className="ss-input-icon-left" aria-hidden="true">
                ⌕
              </span>
              <input
                id="ss-filter-search"
                className="ss-input"
                type="search"
                placeholder={searchPlaceholder}
                value={filters.search}
                onChange={(e) => update({ search: e.target.value })}
                aria-label="Search"
              />
            </div>
          </div>
        ) : null}

        {showCategory ? (
          <div className="ss-field">
            <label className="ss-label" htmlFor="ss-filter-category">
              Category
            </label>
            <select
              id="ss-filter-category"
              className="ss-select"
              value={filters.category}
              onChange={(e) => update({ category: e.target.value })}
              aria-label="Category"
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {children ? <div className="ss-filters-extra">{children}</div> : null}
      </div>

      <div className="ss-filters-actions">
        <button
          type="button"
          className="ss-btn ss-btn-ghost"
          onClick={() =>
            setFilters({
              ...seeded,
              // Keep default preset, but clear any entered custom dates/search/category.
              datePreset: seeded.datePreset || "30d",
              dateFrom: "",
              dateTo: "",
              search: "",
              category: "all",
            })
          }
          aria-label="Clear filters"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
