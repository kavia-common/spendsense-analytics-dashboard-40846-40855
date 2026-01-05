-- SpendSense Supabase Migration: Initial schema
-- Filename: migrations/20260105_000001_init.sql
--
-- How to apply (Supabase):
--   Option A) Supabase SQL Editor:
--     Paste the file contents and run.
--   Option B) Supabase CLI (if your repo uses it):
--     Place this under supabase/migrations/ and run:
--       supabase db push
--   Option C) psql:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/20260105_000001_init.sql
--
-- Notes:
-- - This migration is designed to be safe to re-run where feasible:
--   * CREATE EXTENSION IF NOT EXISTS
--   * DO blocks for domain/enum creation if not exists
--   * CREATE TABLE IF NOT EXISTS
--   * CREATE INDEX IF NOT EXISTS
-- - Some objects are not fully idempotent in vanilla Postgres (e.g., triggers without IF NOT EXISTS).
--   We use DO blocks to create triggers only if missing.
-- - RLS is provided as commented placeholders. Enable/tune per your needs.

begin;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Domain and Enums
-- -----------------------------------------------------------------------------
do $$
begin
  -- Domain for ISO currency code (3 uppercase letters)
  if not exists (select 1 from pg_type where typname = 'iso_currency_code') then
    create domain iso_currency_code as text
      check (value ~ '^[A-Z]{3}$');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('income', 'expense', 'transfer');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type transaction_status as enum ('pending', 'cleared', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'budget_period_type') then
    create type budget_period_type as enum ('monthly', 'custom');
  end if;

  if not exists (select 1 from pg_type where typname = 'alert_rule_type') then
    create type alert_rule_type as enum ('spend_over_budget', 'large_transaction', 'merchant_pattern');
  end if;

  if not exists (select 1 from pg_type where typname = 'alert_event_status') then
    create type alert_event_status as enum ('open', 'acknowledged', 'dismissed');
  end if;

  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type audit_action as enum ('insert', 'update', 'delete', 'read');
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------
-- Convenience function for RLS policies
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

-- Trigger function to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- 1) user_profiles (maps 1:1 to auth.users)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  currency iso_currency_code not null default 'USD',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_deleted boolean not null default false,
  deleted_at timestamptz
);

-- 2) categories (global + personal categories)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),

  -- When user_id is null, the category is global.
  user_id uuid references auth.users(id) on delete cascade,

  name text not null,
  slug text not null,
  color text,
  icon text,

  parent_id uuid references public.categories(id) on delete set null,

  is_global boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_global_consistency
    check (
      (is_global = true and user_id is null)
      or
      (is_global = false and user_id is not null)
    ),

  constraint categories_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- 3) transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  occurred_at timestamptz not null,
  posted_at timestamptz,

  type transaction_type not null,
  status transaction_status not null default 'cleared',

  amount numeric(14,2) not null,
  currency iso_currency_code not null default 'USD',

  merchant text,
  description text,

  category_id uuid references public.categories(id) on delete set null,

  -- Optional support for imported banking feeds
  external_id text,
  source text,

  -- Optional grouping to tie both legs of a transfer
  transfer_group_id uuid,

  pending_reason text,

  is_deleted boolean not null default false,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint transactions_amount_nonzero
    check (amount <> 0),

  constraint transactions_posted_at_after_occurred_at
    check (posted_at is null or posted_at >= occurred_at)
);

-- 4) budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,

  period_type budget_period_type not null,

  -- Monthly budgets use month_start (first day of month).
  -- Custom budgets use start_date/end_date.
  month_start date,
  start_date date,
  end_date date,

  currency iso_currency_code not null default 'USD',

  is_active boolean not null default true,

  is_deleted boolean not null default false,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budgets_period_fields
    check (
      (period_type = 'monthly' and month_start is not null and start_date is null and end_date is null)
      or
      (period_type = 'custom' and month_start is null and start_date is not null and end_date is not null and end_date >= start_date)
    )
);

-- 5) budget_categories
create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),

  budget_id uuid not null references public.budgets(id) on delete cascade,

  -- category_id null means "overall budget" allocation.
  category_id uuid references public.categories(id) on delete set null,

  limit_amount numeric(14,2) not null check (limit_amount > 0),

  is_deleted boolean not null default false,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_categories_unique_per_budget
    unique (budget_id, category_id)
);

-- 6) alert_rules
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  rule_type alert_rule_type not null,

  budget_id uuid references public.budgets(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,

  params jsonb not null default '{}'::jsonb,

  is_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_deleted boolean not null default false,
  deleted_at timestamptz
);

-- 7) alert_events
create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  rule_id uuid references public.alert_rules(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,

  status alert_event_status not null default 'open',

  title text not null,
  message text,

  context jsonb not null default '{}'::jsonb,

  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  dismissed_at timestamptz,

  created_at timestamptz not null default now(),

  is_deleted boolean not null default false,
  deleted_at timestamptz,

  constraint alert_events_status_timestamps
    check (
      (status = 'open' and acknowledged_at is null and dismissed_at is null)
      or
      (status = 'acknowledged' and acknowledged_at is not null and dismissed_at is null)
      or
      (status = 'dismissed' and dismissed_at is not null)
    )
);

-- 8) audit_log
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),

  -- Who performed the action (nullable for service/background jobs)
  user_id uuid references auth.users(id) on delete set null,

  action audit_action not null,

  table_name text not null,
  row_id uuid,

  request_id uuid,
  ip inet,
  user_agent text,

  before_data jsonb,
  after_data jsonb,

  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Triggers (created idempotently)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_user_profiles_set_updated_at'
  ) then
    create trigger trg_user_profiles_set_updated_at
    before update on public.user_profiles
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_categories_set_updated_at'
  ) then
    create trigger trg_categories_set_updated_at
    before update on public.categories
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_transactions_set_updated_at'
  ) then
    create trigger trg_transactions_set_updated_at
    before update on public.transactions
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_budgets_set_updated_at'
  ) then
    create trigger trg_budgets_set_updated_at
    before update on public.budgets
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_budget_categories_set_updated_at'
  ) then
    create trigger trg_budget_categories_set_updated_at
    before update on public.budget_categories
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_alert_rules_set_updated_at'
  ) then
    create trigger trg_alert_rules_set_updated_at
    before update on public.alert_rules
    for each row execute function public.set_updated_at();
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- Uniqueness / indexes
-- -----------------------------------------------------------------------------

-- Categories uniqueness (ignore soft-deleted rows)
create unique index if not exists ux_categories_user_slug
on public.categories (user_id, slug)
where is_deleted = false;

create unique index if not exists ux_categories_global_slug
on public.categories (slug)
where is_global = true and is_deleted = false;

-- Transactions import de-duplication helper
create unique index if not exists ux_transactions_user_source_external_id
on public.transactions (user_id, source, external_id)
where external_id is not null and is_deleted = false;

-- Suggested performance indexes from schema doc
create index if not exists ix_transactions_user_occurred_at
on public.transactions (user_id, occurred_at desc)
where is_deleted = false;

create index if not exists ix_transactions_user_category_occurred_at
on public.transactions (user_id, category_id, occurred_at desc)
where is_deleted = false;

create index if not exists ix_transactions_user_status
on public.transactions (user_id, status)
where is_deleted = false;

create index if not exists ix_budgets_user_active
on public.budgets (user_id, is_active)
where is_deleted = false;

create index if not exists ix_budget_categories_budget
on public.budget_categories (budget_id)
where is_deleted = false;

create index if not exists ix_alert_rules_user_enabled
on public.alert_rules (user_id, is_enabled)
where is_deleted = false;

create index if not exists ix_alert_events_user_status_triggered_at
on public.alert_events (user_id, status, triggered_at desc)
where is_deleted = false;

-- Audit log lookup indexes
create index if not exists ix_audit_log_user_created_at
on public.audit_log (user_id, created_at desc);

create index if not exists ix_audit_log_table_row
on public.audit_log (table_name, row_id);

-- -----------------------------------------------------------------------------
-- RLS placeholders (commented out)
-- -----------------------------------------------------------------------------
-- IMPORTANT:
-- Enable RLS and create policies based on your auth model.
-- In Supabase, service role bypasses RLS; end-users must be granted policies.
--
-- -- Enable RLS
-- alter table public.user_profiles enable row level security;
-- alter table public.categories enable row level security;
-- alter table public.transactions enable row level security;
-- alter table public.budgets enable row level security;
-- alter table public.budget_categories enable row level security;
-- alter table public.alert_rules enable row level security;
-- alter table public.alert_events enable row level security;
-- alter table public.audit_log enable row level security;
--
-- -- Example policies (see schema spec for full set)
-- -- create policy "Transactions: select own"
-- -- on public.transactions for select
-- -- using (user_id = public.current_user_id() and is_deleted = false);

commit;
