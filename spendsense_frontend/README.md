# SpendSense Frontend (React)

A lightweight React UI for the SpendSense analytics dashboard (Dashboard, Transactions, Insights, Alerts, Settings).

## Development

```bash
npm install
npm start
```

## Realtime dashboard updates (Supabase)

The Dashboard page can refresh automatically when a new row is inserted into the `public.transactions` table.

### 1) Configure Supabase keys

Set **either** runtime window variables **or** CRA environment variables.

#### Option A: CRA env vars (recommended)

Add these to your frontend environment:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Optional logging control:

- `REACT_APP_LOG_LEVEL` = `silent` | `info` | `debug` | `trace`

Notes:
- Logging for realtime is guarded by `REACT_APP_LOG_LEVEL` (use `debug` to see detailed payloads in the console).
- The code also supports `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` if you inject configuration at runtime.

### 2) Enable Realtime for `public.transactions`

In Supabase:

1. Go to **Database → Replication** (or **Realtime** settings depending on UI).
2. Ensure **Realtime** is enabled for your project.
3. Add the `public.transactions` table to the publication used by Realtime (often `supabase_realtime`).
4. Confirm inserts are broadcast:
   - event: `INSERT`
   - schema: `public`
   - table: `transactions`

### 3) Verify

1. Open the dashboard.
2. Insert a new transaction row into `public.transactions` (SQL editor, your backend, etc.).
3. The Dashboard should visibly re-run its mocked "fetch" logic:
   - KPI card loading state briefly appears again
   - chart placeholders reload (because `refreshTick` increments)

### Troubleshooting

- If no Supabase keys are configured, the app runs in **no-op realtime mode** (no crash, just no live updates).
- If you have RLS enabled on `public.transactions`, ensure the user represented by the anon key (or the logged-in user if you later add auth) has permission to receive changes as configured for your project.
