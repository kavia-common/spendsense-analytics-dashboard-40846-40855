# SpendSense Frontend (React)

A lightweight React UI for the SpendSense analytics dashboard (Dashboard, Transactions, Insights, Alerts, Settings).

## Development

```bash
npm install
npm start
```

## Centralized environment config

This frontend provides a centralized environment module at:

- `src/config/env.js` (export: `env`)

It reads CRA environment variables (prefixed with `REACT_APP_`), performs basic validation/type coercion, and exports a **frozen** config object.

### Required env vars (validated)

- `REACT_APP_API_BASE` (optional if `REACT_APP_BACKEND_URL` is set; used as primary base)
- `REACT_APP_BACKEND_URL` (http/https absolute URL)
- `REACT_APP_FRONTEND_URL` (http/https absolute URL)
- `REACT_APP_WS_URL` (ws/wss absolute URL)
- `REACT_APP_NODE_ENV` (defaults to `development`)
- `REACT_APP_ENABLE_SOURCE_MAPS` (boolean-ish string)
- `REACT_APP_PORT` (number-ish string)
- `REACT_APP_TRUST_PROXY` (boolean-ish string)
- `REACT_APP_LOG_LEVEL` (defaults to `info`)
- `REACT_APP_HEALTHCHECK_PATH` (defaults to `/health`)
- `REACT_APP_FEATURE_FLAGS` (JSON or CSV; defaults to `{}`)
- `REACT_APP_EXPERIMENTS_ENABLED` (boolean-ish string; defaults to `false`)

Notes:
- URL fields are checked for basic validity (absolute URLs only).
- The module will **never log secrets**. It may log a **redacted** summary only when `REACT_APP_LOG_LEVEL` is `debug` or `trace`.

Usage:

```js
import { env } from "./config/env";

console.log(env.REACT_APP_BACKEND_URL);
```

## API client wrapper

A fetch-based API client wrapper is available at:

- `src/lib/apiClient.js` (export: `createApiClient(env)`)

Features:
- Base URL from `env.REACT_APP_API_BASE` (fallback: `env.REACT_APP_BACKEND_URL`)
- JSON headers by default
- Optional `Authorization: Bearer <token>` from Supabase session **when Supabase is configured**
- Timeout via `AbortController` (default `10s`)
- Retries with exponential backoff + jitter:
  - `GET`/`HEAD`: retry on `429` and `5xx` + network errors (default `3` attempts)
  - `POST`/`PUT`/`PATCH`/`DELETE`: retry only on `429` (respects `Retry-After`), to avoid duplicate side effects
- Structured errors thrown as `ApiError`:
  - `{ status, code, message, details, requestId, isNetworkError }`
  - Parses `application/problem+json` when present
- Simple middleware hook system:
  - `beforeRequest(req)` / `afterResponse(res, req)` / `onError(err, req)` arrays

### Example usage

See `src/lib/exampleApi.js` for ready-to-copy examples.

```js
import { env } from "./config/env";
import { createApiClient, isApiError } from "./lib/apiClient";

const api = createApiClient(env);

async function loadSummary() {
  try {
    const data = await api.get("/summary", { query: { period: "30d" } });
    return data;
  } catch (err) {
    if (isApiError(err)) {
      // structured error
      console.warn(err.status, err.code, err.requestId, err.message);
    }
    throw err;
  }
}
```

## Logging

`src/lib/logger.js` supports levels:

- `silent` | `error` | `warn` | `info` | `debug` | `trace`

Default is `info` if unset/unknown.

## Exchange rates / Base currency normalization

This UI can normalize displayed monetary values into a **selected base currency** using an external exchange rates API.

### Environment variables

Configure these as CRA env vars:

- `REACT_APP_BASE_CURRENCY` (optional, default: `USD`)
- `REACT_APP_EXCHANGE_RATES_API_URL` (optional)
- `REACT_APP_EXCHANGE_RATES_API_KEY` (optional; only if your provider requires it)

Behavior:
- If exchange rate configuration is missing or the provider is unreachable, the app shows a **small inline warning** and falls back to **passthrough mode** (no conversion).
- The latest known rates are cached **in-memory for 12 hours** (per base currency) and refreshed in the background.

### Provider examples

**No-key provider (default-compatible):**

```bash
REACT_APP_EXCHANGE_RATES_API_URL=https://api.exchangerate.host/latest
REACT_APP_BASE_CURRENCY=USD
```

**Keyed provider (example only):**
(Some providers accept Bearer auth; check your provider docs.)

```bash
REACT_APP_EXCHANGE_RATES_API_URL=https://YOUR_PROVIDER.example.com/latest
REACT_APP_EXCHANGE_RATES_API_KEY=YOUR_API_KEY
REACT_APP_BASE_CURRENCY=USD
```

## Authentication (Google OAuth via Supabase)

This app uses **Supabase Auth** with the **Google** provider.

### 1) Required environment variables

Configure these as CRA env vars:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Optional logging control:

- `REACT_APP_LOG_LEVEL` = `silent` | `error` | `warn` | `info` | `debug` | `trace`

Notes:
- The code also supports `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` if you inject configuration at runtime.
- Do not hardcode secrets in the repository.

### 2) Enable Google provider in Supabase

In your Supabase project:

1. Go to **Authentication → Providers → Google**.
2. Enable Google.
3. Add your Google OAuth client ID/secret in Supabase.
4. Add redirect URLs:
   - Local dev: `http://localhost:3000/auth/callback`
   - Deployed: `https://YOUR_DOMAIN/auth/callback`

### 3) App routing behavior

- Public (no auth): `/` (Landing page with “Continue with Google”)
- OAuth callback: `/auth/callback`
- Protected:
  - `/dashboard`
  - `/transactions`
  - `/insights`
  - `/alerts`
  - `/settings`

Unauthenticated users trying to access protected routes will be redirected to `/`.

## Realtime dashboard updates (Supabase)

The Dashboard page can refresh automatically when a new row is inserted into the `public.transactions` table.

### 1) Configure Supabase keys

Set **either** runtime window variables **or** CRA environment variables.

#### Option A: CRA env vars (recommended)

Add these to your frontend environment:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Optional logging control:

- `REACT_APP_LOG_LEVEL` = `silent` | `error` | `warn` | `info` | `debug` | `trace`

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
