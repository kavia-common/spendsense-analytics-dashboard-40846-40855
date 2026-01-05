# SpendSense DB Migrations & Seeds (Supabase/PostgreSQL)

This folder contains SQL artifacts to create the SpendSense schema (Supabase/PostgreSQL) and load realistic demo data.

## Contents

- `migrations/20260105_000001_init.sql`  
  Creates:
  - domain: `iso_currency_code`
  - enums: `transaction_type`, `transaction_status`, `budget_period_type`, `alert_rule_type`, `alert_event_status`, `audit_action`
  - helper functions: `public.current_user_id()`, `public.set_updated_at()`
  - tables: `public.user_profiles`, `public.categories`, `public.transactions`, `public.budgets`, `public.budget_categories`, `public.alert_rules`, `public.alert_events`, `public.audit_log`
  - triggers for `updated_at`
  - recommended indexes
  - **RLS placeholders** are included but commented out

- `seeds/20260105_seed_demo.sql`  
  Inserts:
  - 8 global categories
  - 50 demo user profiles (as UUIDs)
  - per-user categories
  - budgets for the last 6 months
  - 3,000 transactions
  - a few alert rules + events
  - sample audit log entries

## Apply via Supabase

### Option A: Supabase SQL Editor (simple)
1. Open your Supabase project → **SQL Editor**
2. Run `migrations/20260105_000001_init.sql`
3. Run `seeds/20260105_seed_demo.sql`

### Option B: Supabase CLI (if your repo uses it)
Supabase CLI expects migrations under `supabase/migrations/`.

1. Copy migration(s) into `supabase/migrations/`
2. Run:
   - `supabase db push`

*(If your project does not use Supabase CLI, Option A or psql are sufficient.)*

## Apply via psql

If you have a `DATABASE_URL` for Postgres:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/20260105_000001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f seeds/20260105_seed_demo.sql
```

## Notes on seed data vs Supabase auth.users

Supabase manages `auth.users`. The seed script generates deterministic UUIDs for demo users and inserts into `public.user_profiles` and other tables referencing those UUIDs.

That means:
- The data is great for analytics demos and local/dev dashboards.
- It does **not** automatically create real authenticated Supabase users.
- If you need the demo users to be able to log in, create corresponding `auth.users` entries via admin tooling (not included here).
"
