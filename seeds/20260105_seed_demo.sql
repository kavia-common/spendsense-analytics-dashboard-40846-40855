-- SpendSense Seed Data: Realistic demo dataset
-- Filename: seeds/20260105_seed_demo.sql
--
-- How to apply:
--   Supabase SQL Editor: run this after running migrations.
--   psql:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f seeds/20260105_seed_demo.sql
--
-- Notes / Assumptions:
-- - This seed script does NOT create auth.users entries (Supabase manages auth schema).
--   Instead, it generates "demo users" as UUIDs and inserts into public tables referencing them.
--   This is suitable for demo/dev analytics, but it won't map to real Supabase-authenticated users
--   unless you also create matching users in auth.users (admin-only).
-- - The script uses deterministic UUIDs via md5 so it can be re-run safely.
-- - It inserts 50 users (profiles), global categories (8), user categories (2 per user),
--   3,000 transactions, budgets for last 6 months, some alert rules/events, and audit log entries.

begin;

-- Ensure required extension exists for gen_random_uuid() in case this seed is run standalone.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Global categories (8 categories)
-- -----------------------------------------------------------------------------
insert into public.categories (id, user_id, name, slug, color, icon, parent_id, is_global, is_deleted)
values
  -- Deterministic IDs for easy referencing in seed logic
  ('11111111-1111-1111-1111-111111111111'::uuid, null, 'Subscriptions', 'subscriptions', '#2563eb', 'repeat', null, true, false),
  ('22222222-2222-2222-2222-222222222222'::uuid, null, 'Groceries', 'groceries', '#16a34a', 'basket', null, true, false),
  ('33333333-3333-3333-3333-333333333333'::uuid, null, 'Dining', 'dining', '#dc2626', 'utensils', null, true, false),
  ('44444444-4444-4444-4444-444444444444'::uuid, null, 'Travel', 'travel', '#f59e0b', 'plane', null, true, false),
  ('55555555-5555-5555-5555-555555555555'::uuid, null, 'Utilities', 'utilities', '#0ea5e9', 'bolt', null, true, false),
  ('66666666-6666-6666-6666-666666666666'::uuid, null, 'Shopping', 'shopping', '#a855f7', 'bag', null, true, false),
  ('77777777-7777-7777-7777-777777777777'::uuid, null, 'Health', 'health', '#22c55e', 'heart', null, true, false),
  ('88888888-8888-8888-8888-888888888888'::uuid, null, 'Other', 'other', '#64748b', 'dots', null, true, false)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 2) Demo users (50) and profiles
-- -----------------------------------------------------------------------------
with demo_users as (
  select
    -- deterministic UUIDs: uuid-like string assembled from md5
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
names as (
  select *
  from (values
    ('Avery'),('Jordan'),('Taylor'),('Morgan'),('Casey'),('Riley'),('Cameron'),('Drew'),('Reese'),('Hayden'),
    ('Parker'),('Quinn'),('Rowan'),('Skyler'),('Finley'),('Emerson'),('Kai'),('Sage'),('Logan'),('Harper')
  ) as t(first_name)
),
timezones as (
  select *
  from (values
    ('America/New_York'),('America/Chicago'),('America/Denver'),('America/Los_Angeles'),
    ('Europe/London'),('Europe/Berlin'),('Asia/Singapore'),('Australia/Sydney')
  ) as t(tz)
),
currencies as (
  select *
  from (values ('USD'),('USD'),('USD'),('USD'),('EUR'),('GBP'),('USD')) as t(cur)
)
insert into public.user_profiles (user_id, display_name, timezone, currency, is_deleted)
select
  du.user_id,
  (select first_name from names offset ((du.user_no - 1) % 20) limit 1) || ' ' ||
  'Demo ' || du.user_no::text as display_name,
  (select tz from timezones offset ((du.user_no - 1) % 8) limit 1) as timezone,
  (select cur::iso_currency_code from currencies offset ((du.user_no - 1) % 7) limit 1) as currency,
  false
from demo_users du
on conflict (user_id) do update
set display_name = excluded.display_name,
    timezone = excluded.timezone,
    currency = excluded.currency,
    is_deleted = false,
    deleted_at = null;

-- -----------------------------------------------------------------------------
-- 3) Per-user categories (2 per user): Coffee + Pets
-- -----------------------------------------------------------------------------
with demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
user_cats as (
  select
    du.user_id,
    -- deterministic ids per user + slug
    (
      substr(md5('spendsense-demo-category-coffee-' || du.user_id::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-category-coffee-' || du.user_id::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-category-coffee-' || du.user_id::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-category-coffee-' || du.user_id::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-category-coffee-' || du.user_id::text), 21, 12)
    )::uuid as coffee_id,
    (
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 21, 12)
    )::uuid as pets_id
  from demo_users du
)
insert into public.categories (id, user_id, name, slug, color, icon, is_global, is_deleted)
select coffee_id, user_id, 'Coffee', 'coffee', '#7c3aed', 'coffee', false, false from user_cats
on conflict do nothing;

with demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id
  from generate_series(1, 50) gs
),
user_cats as (
  select
    du.user_id,
    (
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-category-pets-' || du.user_id::text), 21, 12)
    )::uuid as pets_id
  from demo_users du
)
insert into public.categories (id, user_id, name, slug, color, icon, is_global, is_deleted)
select pets_id, user_id, 'Pets', 'pets', '#f97316', 'paw', false, false from user_cats
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 4) Budgets: last 6 months, per user
--    - one monthly budget row per month (6)
--    - allocations in budget_categories: overall + a few category allocations
-- -----------------------------------------------------------------------------
with months as (
  select
    (date_trunc('month', current_date) - (gs || ' months')::interval)::date as month_start,
    gs as month_offset
  from generate_series(0, 5) gs
),
demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
budget_rows as (
  select
    -- deterministic budget id per user + month
    (
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 21, 12)
    )::uuid as id,
    du.user_id,
    du.user_no,
    m.month_start,
    -- vary monthly overall budget a bit by user + month
    (2200 + ((du.user_no % 9) * 110) + ((m.month_offset % 3) * 60))::numeric(14,2) as overall_limit
  from demo_users du
  cross join months m
)
insert into public.budgets (id, user_id, name, period_type, month_start, currency, is_active, is_deleted)
select
  br.id,
  br.user_id,
  to_char(br.month_start, 'Mon YYYY') || ' Budget' as name,
  'monthly'::budget_period_type,
  br.month_start,
  'USD'::iso_currency_code,
  true,
  false
from budget_rows br
on conflict (id) do update
set name = excluded.name,
    currency = excluded.currency,
    is_active = excluded.is_active,
    is_deleted = false,
    deleted_at = null;

-- overall allocation
with months as (
  select (date_trunc('month', current_date) - (gs || ' months')::interval)::date as month_start
  from generate_series(0, 5) gs
),
demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
budget_rows as (
  select
    (
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 21, 12)
    )::uuid as budget_id,
    du.user_no,
    m.month_start,
    (2200 + ((du.user_no % 9) * 110) + ((extract(month from m.month_start)::int % 3) * 60))::numeric(14,2) as overall_limit
  from demo_users du
  cross join months m
)
insert into public.budget_categories (budget_id, category_id, limit_amount, is_deleted)
select
  br.budget_id,
  null::uuid as category_id,
  br.overall_limit,
  false
from budget_rows br
on conflict (budget_id, category_id) do update
set limit_amount = excluded.limit_amount,
    is_deleted = false,
    deleted_at = null;

-- category allocations: subscriptions, groceries, dining, travel, utilities
with months as (
  select (date_trunc('month', current_date) - (gs || ' months')::interval)::date as month_start
  from generate_series(0, 5) gs
),
demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
budget_ids as (
  select
    du.user_id,
    du.user_no,
    m.month_start,
    (
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-budget-' || du.user_id::text || '-' || m.month_start::text), 21, 12)
    )::uuid as budget_id
  from demo_users du
  cross join months m
),
allocs as (
  select
    b.budget_id,
    -- use the deterministic global category UUIDs
    c.category_id,
    -- vary allocations slightly by user to avoid uniform data
    (c.base + ((b.user_no % 6) * c.jitter))::numeric(14,2) as limit_amount
  from budget_ids b
  cross join (values
    ('11111111-1111-1111-1111-111111111111'::uuid, 160.00::numeric, 8.00::numeric),  -- subscriptions
    ('22222222-2222-2222-2222-222222222222'::uuid, 520.00::numeric, 20.00::numeric), -- groceries
    ('33333333-3333-3333-3333-333333333333'::uuid, 320.00::numeric, 14.00::numeric), -- dining
    ('44444444-4444-4444-4444-444444444444'::uuid, 260.00::numeric, 16.00::numeric), -- travel
    ('55555555-5555-5555-5555-555555555555'::uuid, 220.00::numeric, 10.00::numeric)  -- utilities
  ) as c(category_id, base, jitter)
)
insert into public.budget_categories (budget_id, category_id, limit_amount, is_deleted)
select a.budget_id, a.category_id, a.limit_amount, false
from allocs a
on conflict (budget_id, category_id) do update
set limit_amount = excluded.limit_amount,
    is_deleted = false,
    deleted_at = null;

-- -----------------------------------------------------------------------------
-- 5) Transactions: 3,000 across 50 users and 8 categories over ~180 days
-- -----------------------------------------------------------------------------
with demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
tx as (
  select
    gs as seq,
    du.user_id,
    du.user_no,
    -- spread across last ~180 days; use deterministic offset by seq
    (now() - ((gs % 180) || ' days')::interval - ((gs % 24) || ' hours')::interval)::timestamptz as occurred_at,
    -- posted 0-2 days later for some
    case when (gs % 5) = 0 then null
         else (now() - ((gs % 180) || ' days')::interval + ((gs % 2) || ' days')::interval)::timestamptz
    end as posted_at,
    -- types: mostly expense, some income, rare transfer
    case
      when (gs % 47) = 0 then 'transfer'::transaction_type
      when (gs % 13) = 0 then 'income'::transaction_type
      else 'expense'::transaction_type
    end as type,
    case
      when (gs % 19) = 0 then 'pending'::transaction_status
      when (gs % 101) = 0 then 'cancelled'::transaction_status
      else 'cleared'::transaction_status
    end as status,
    -- category distribution: weighted by modulo; transfers often uncategorized
    case
      when (gs % 47) = 0 then null::uuid
      when (gs % 20) = 0 then '44444444-4444-4444-4444-444444444444'::uuid -- travel
      when (gs % 17) = 0 then '66666666-6666-6666-6666-666666666666'::uuid -- shopping
      when (gs % 11) = 0 then '11111111-1111-1111-1111-111111111111'::uuid -- subscriptions
      when (gs % 9)  = 0 then '55555555-5555-5555-5555-555555555555'::uuid -- utilities
      when (gs % 7)  = 0 then '77777777-7777-7777-7777-777777777777'::uuid -- health
      when (gs % 5)  = 0 then '33333333-3333-3333-3333-333333333333'::uuid -- dining
      else '22222222-2222-2222-2222-222222222222'::uuid -- groceries
    end as category_id,
    -- merchant patterns by category (simple but realistic-ish)
    case
      when (gs % 47) = 0 then 'Internal Transfer'
      when (gs % 20) = 0 then (case when (gs % 40) = 0 then 'Delta Airlines' else 'Uber' end)
      when (gs % 17) = 0 then (case when (gs % 34) = 0 then 'Amazon' else 'Target' end)
      when (gs % 11) = 0 then (case when (gs % 22) = 0 then 'Netflix' else 'Spotify' end)
      when (gs % 9)  = 0 then (case when (gs % 18) = 0 then 'Electric Utility' else 'Water Utility' end)
      when (gs % 7)  = 0 then (case when (gs % 14) = 0 then 'CVS Pharmacy' else 'City Clinic' end)
      when (gs % 5)  = 0 then (case when (gs % 10) = 0 then 'Local Cafe' else 'DoorDash' end)
      else (case when (gs % 12) = 0 then 'Whole Foods' else 'Grocery Market' end)
    end as merchant,
    case
      when (gs % 47) = 0 then 'Balance move between accounts'
      when (gs % 13) = 0 then 'Payroll deposit'
      else 'Card purchase'
    end as description,
    -- amount logic:
    -- - income positive, expense negative, transfer either sign
    case
      when (gs % 47) = 0 then
        (case when (gs % 94) = 0 then 500.00 else -500.00 end)::numeric(14,2)
      when (gs % 13) = 0 then
        (2000 + ((gs % 7) * 250))::numeric(14,2)
      else
        (-1 * (
          case
            when (gs % 20) = 0 then (80 + (gs % 500))        -- travel can be large
            when (gs % 17) = 0 then (25 + (gs % 250))        -- shopping
            when (gs % 11) = 0 then (8 + (gs % 40))          -- subs
            when (gs % 9)  = 0 then (45 + (gs % 120))        -- utilities
            when (gs % 7)  = 0 then (15 + (gs % 180))        -- health
            when (gs % 5)  = 0 then (6 + (gs % 70))          -- dining
            else (10 + (gs % 160))                           -- groceries
          end
        ))::numeric(14,2)
    end as amount,
    'USD'::iso_currency_code as currency,
    -- deterministic external id for some rows, used with source for dedupe index
    case when (gs % 6) = 0 then 'ext-' || gs::text else null end as external_id,
    case when (gs % 6) = 0 then (case when (gs % 12) = 0 then 'plaid' else 'csv_import' end) else null end as source,
    -- deterministic transfer group id for transfer rows
    case when (gs % 47) = 0 then
      (
        substr(md5('spendsense-demo-transfer-group-' || gs::text), 1, 8) || '-' ||
        substr(md5('spendsense-demo-transfer-group-' || gs::text), 9, 4) || '-' ||
        substr(md5('spendsense-demo-transfer-group-' || gs::text), 13, 4) || '-' ||
        substr(md5('spendsense-demo-transfer-group-' || gs::text), 17, 4) || '-' ||
        substr(md5('spendsense-demo-transfer-group-' || gs::text), 21, 12)
      )::uuid
    else null::uuid end as transfer_group_id,
    case when (gs % 19) = 0 then 'Awaiting settlement' else null end as pending_reason,
    -- deterministic transaction id
    (
      substr(md5('spendsense-demo-tx-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-tx-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-tx-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-tx-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-tx-' || gs::text), 21, 12)
    )::uuid as id
  from generate_series(1, 3000) gs
  join demo_users du on du.user_no = ((gs - 1) % 50) + 1
)
insert into public.transactions (
  id,
  user_id,
  occurred_at,
  posted_at,
  type,
  status,
  amount,
  currency,
  merchant,
  description,
  category_id,
  external_id,
  source,
  transfer_group_id,
  pending_reason,
  is_deleted
)
select
  t.id,
  t.user_id,
  t.occurred_at,
  t.posted_at,
  t.type,
  t.status,
  t.amount,
  t.currency,
  t.merchant,
  t.description,
  t.category_id,
  t.external_id,
  t.source,
  t.transfer_group_id,
  t.pending_reason,
  false
from tx t
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 6) Alert rules + alert events (a few per some users)
-- -----------------------------------------------------------------------------
with demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
rules as (
  select
    du.user_id,
    du.user_no,
    (
      substr(md5('spendsense-demo-rule-large-' || du.user_id::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || du.user_id::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || du.user_id::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || du.user_id::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || du.user_id::text), 21, 12)
    )::uuid as rule_id
  from demo_users du
  where du.user_no in (1, 2, 3, 10, 20)
)
insert into public.alert_rules (id, user_id, name, rule_type, params, is_enabled, is_deleted)
select
  r.rule_id,
  r.user_id,
  'Large transaction over $250',
  'large_transaction'::alert_rule_type,
  '{"threshold": 250.00}'::jsonb,
  true,
  false
from rules r
on conflict (id) do update
set name = excluded.name,
    rule_type = excluded.rule_type,
    params = excluded.params,
    is_enabled = true,
    is_deleted = false,
    deleted_at = null;

-- Create a handful of alert events referencing actual transactions (largest expenses per user)
with interesting_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id
  from generate_series(1, 50) gs
  where gs in (1, 2, 3, 10, 20)
),
rule_ids as (
  select
    iu.user_id,
    (
      substr(md5('spendsense-demo-rule-large-' || iu.user_id::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || iu.user_id::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || iu.user_id::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || iu.user_id::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-rule-large-' || iu.user_id::text), 21, 12)
    )::uuid as rule_id
  from interesting_users iu
),
top_spend as (
  select
    t.user_id,
    t.id as transaction_id,
    abs(t.amount)::numeric(14,2) as abs_amount,
    t.merchant,
    row_number() over (partition by t.user_id order by abs(t.amount) desc) as rn
  from public.transactions t
  join interesting_users iu on iu.user_id = t.user_id
  where t.type = 'expense' and t.status <> 'cancelled' and t.is_deleted = false
),
events as (
  select
    r.user_id,
    r.rule_id,
    ts.transaction_id,
    ts.abs_amount,
    ts.merchant,
    -- deterministic event id per transaction
    (
      substr(md5('spendsense-demo-alert-event-' || ts.transaction_id::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-alert-event-' || ts.transaction_id::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-alert-event-' || ts.transaction_id::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-alert-event-' || ts.transaction_id::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-alert-event-' || ts.transaction_id::text), 21, 12)
    )::uuid as event_id
  from rule_ids r
  join top_spend ts on ts.user_id = r.user_id and ts.rn <= 2
)
insert into public.alert_events (
  id, user_id, rule_id, transaction_id, status, title, message, context, triggered_at, is_deleted
)
select
  e.event_id,
  e.user_id,
  e.rule_id,
  e.transaction_id,
  case when (e.abs_amount > 600) then 'open'::alert_event_status else 'acknowledged'::alert_event_status end,
  'Large transaction detected',
  'A transaction exceeded your configured threshold.',
  jsonb_build_object(
    'threshold', 250.00,
    'amount', e.abs_amount,
    'merchant', e.merchant
  ),
  now() - interval '2 days',
  false
from events e
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 7) Audit log entries (sample)
-- -----------------------------------------------------------------------------
with demo_users as (
  select
    (
      substr(md5('spendsense-demo-user-' || gs::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-user-' || gs::text), 21, 12)
    )::uuid as user_id,
    gs as user_no
  from generate_series(1, 50) gs
),
samples as (
  select
    du.user_id,
    du.user_no,
    (
      substr(md5('spendsense-demo-audit-' || du.user_id::text), 1, 8) || '-' ||
      substr(md5('spendsense-demo-audit-' || du.user_id::text), 9, 4) || '-' ||
      substr(md5('spendsense-demo-audit-' || du.user_id::text), 13, 4) || '-' ||
      substr(md5('spendsense-demo-audit-' || du.user_id::text), 17, 4) || '-' ||
      substr(md5('spendsense-demo-audit-' || du.user_id::text), 21, 12)
    )::uuid as request_id
  from demo_users du
  where du.user_no in (1, 2, 3, 10, 20)
)
insert into public.audit_log (
  user_id, action, table_name, row_id, request_id, ip, user_agent, before_data, after_data, created_at
)
select
  s.user_id,
  'insert'::audit_action,
  'transactions',
  t.id,
  s.request_id,
  '127.0.0.1'::inet,
  'SpendSenseSeed/1.0',
  null,
  jsonb_build_object(
    'id', t.id,
    'amount', t.amount,
    'merchant', t.merchant,
    'occurred_at', t.occurred_at
  ),
  now() - interval '1 day'
from samples s
join lateral (
  select id, amount, merchant, occurred_at
  from public.transactions
  where user_id = s.user_id and is_deleted = false
  order by occurred_at desc
  limit 1
) t on true;

commit;
