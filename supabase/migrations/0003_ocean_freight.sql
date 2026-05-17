-- ============================================================
-- 0003_ocean_freight.sql
-- Ocean Freight domain schema: ocean_traders, ocean_shipments,
-- automation_logs.
--
-- Uses separate table names (ocean_traders, ocean_shipments) to avoid
-- conflicts with the general logistics schema in 0001_initial_schema.sql.
-- The oceanFreight.api.ts queries ocean_shipments directly.
--
-- Row Level Security maps to the dashboard RoleContext. The active role
-- is read from the JWT claim `user_role` (one of: ceo, planner, customs,
-- service). Until real auth is wired the app runs on mock data, so this
-- schema is forward-looking — applying it is safe and additive.
-- ============================================================

-- ── Enum types ───────────────────────────────────────────────
do $$ begin
  create type shipment_direction as enum ('Import', 'Export');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shipment_phase as enum (
    'Booked', 'In Transit', 'Discharged',
    'Customs Hold', 'Released', 'Delivered'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type trader_type as enum ('Importer', 'Exporter');
exception when duplicate_object then null; end $$;

-- ── Ocean traders (importers / exporters) ────────────────────
-- Separate from 0001's `customers` table to avoid schema collision.
create table if not exists public.ocean_traders (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  trader_type   trader_type not null,
  contact_name  text,
  contact_email text,
  contact_phone text,
  created_at    timestamptz not null default now()
);

-- ── Ocean Shipments (with Demurrage & Detention free-time columns) ──
create table if not exists public.ocean_shipments (
  id                     text primary key,                 -- ALT-OF-2026-####
  bl_number              text not null,
  container_number       text not null,
  container_type         text not null,
  direction              shipment_direction not null,
  carrier                text not null,
  vessel                 text not null,
  voyage                 text not null,
  pol                    text not null,                    -- port of loading
  pod                    text not null,                    -- port of discharge
  terminal               text not null,
  customer_id            uuid references public.ocean_traders (id) on delete set null,
  trader                 text not null,
  trader_contact         text,
  trader_email           text,
  phase                  shipment_phase not null default 'Booked',
  etd                    date,
  eta                    date,
  discharged_at          timestamptz,
  -- Demurrage & Detention free-time tracking
  free_days_total        integer not null default 5,
  free_time_expires_at   timestamptz,
  demurrage_rate_per_day numeric(10, 2) not null default 0,
  customs_block          text,
  teu                    integer not null default 1,
  weight_kg              integer not null default 0,
  commodity              text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists ocean_shipments_phase_idx    on public.ocean_shipments (phase);
create index if not exists ocean_shipments_pod_idx      on public.ocean_shipments (pod);
create index if not exists ocean_shipments_customer_idx on public.ocean_shipments (customer_id);

-- ── Automation logs (workflow run history) ───────────────────
create table if not exists public.automation_logs (
  id          uuid primary key default gen_random_uuid(),
  workflow    text not null,                                -- docs | delay | email
  shipment_id text references public.ocean_shipments (id) on delete cascade,
  level       text not null default 'info',                 -- info | warning | error
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists automation_logs_workflow_idx
  on public.automation_logs (workflow, created_at desc);

-- ── Role helper ──────────────────────────────────────────────
-- Reads the dashboard role from the JWT. Returns 'service' when absent.
create or replace function public.get_dashboard_role()
returns text
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
    'service'
  );
$$;

-- ── Row Level Security ───────────────────────────────────────
alter table public.ocean_traders    enable row level security;
alter table public.ocean_shipments  enable row level security;
alter table public.automation_logs  enable row level security;

-- Ocean traders: every authenticated staff member may read.
drop policy if exists ocean_traders_read on public.ocean_traders;
create policy ocean_traders_read on public.ocean_traders
  for select using (auth.role() = 'authenticated');

-- Ocean shipments: all staff read; only CEO + Planner may update/insert.
drop policy if exists ocean_shipments_read on public.ocean_shipments;
create policy ocean_shipments_read on public.ocean_shipments
  for select using (auth.role() = 'authenticated');

drop policy if exists ocean_shipments_write on public.ocean_shipments;
create policy ocean_shipments_write on public.ocean_shipments
  for update using (public.get_dashboard_role() in ('ceo', 'planner'))
  with check (public.get_dashboard_role() in ('ceo', 'planner'));

drop policy if exists ocean_shipments_insert on public.ocean_shipments;
create policy ocean_shipments_insert on public.ocean_shipments
  for insert with check (public.get_dashboard_role() in ('ceo', 'planner'));

-- Automation logs: all staff read; any authenticated worker may append.
drop policy if exists automation_logs_read on public.automation_logs;
create policy automation_logs_read on public.automation_logs
  for select using (auth.role() = 'authenticated');

drop policy if exists automation_logs_insert on public.automation_logs;
create policy automation_logs_insert on public.automation_logs
  for insert with check (auth.role() = 'authenticated');

-- ── updated_at trigger ───────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ocean_shipments_touch on public.ocean_shipments;
create trigger ocean_shipments_touch
  before update on public.ocean_shipments
  for each row execute function public.touch_updated_at();
