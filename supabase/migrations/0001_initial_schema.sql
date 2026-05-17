-- =====================================================================
-- Altun Logistics Dashboard — initial Supabase schema
-- =====================================================================
-- Targets a clean Supabase project. Run this file in the SQL Editor (or
-- via `supabase db push`). Idempotent guards are used where reasonable so
-- a partial re-run does not crash, but a clean project is preferred.
--
-- Conventions:
--   * Primary keys are uuid (`gen_random_uuid()`).
--   * Public-facing reference codes (AL-2026-1042, Q-2026-0512, …) live in
--     a separate `reference` column with a unique index. Keeps the URLs
--     stable while the canonical id stays opaque.
--   * Every table has `created_at` and `updated_at`. `updated_at` is kept
--     fresh by `set_updated_at()` triggers.
--   * RLS is enabled on every table. The bootstrap policy lets any
--     authenticated user `SELECT`; mutations are gated to the user's
--     `profiles.role` via the `has_role(...)` helper. Tighten further in
--     follow-up migrations once auth is fully wired.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum (
    'admin', 'ceo', 'operations', 'customs', 'sales', 'warehouse', 'viewer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type customer_status as enum ('Active', 'Onboarding', 'Inactive', 'On Hold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shipment_status as enum (
    'Booked', 'In Transit', 'Customs Clearance', 'At Warehouse', 'Delivered', 'Delayed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type transport_mode as enum ('Sea', 'Road', 'Rail');
exception when duplicate_object then null; end $$;

do $$ begin
  create type container_type as enum (
    'FCL', 'LCL', 'Reefer', 'Open Top', 'Flat-rack', 'Tank', 'Flexi Tank', 'Project Cargo'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority_level as enum ('Low', 'Normal', 'High', 'Urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quote_status as enum ('New', 'Reviewing', 'Sent', 'Approved', 'Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quote_direction as enum ('Import', 'Export');
exception when duplicate_object then null; end $$;

do $$ begin
  create type container_kind as enum (
    '20ft Standard (DV)', '40ft Standard (DV)', '40ft High Cube (HC)', '45ft High Cube',
    '20ft Reefer', '40ft Reefer HC',
    'Open Top 20ft', 'Open Top 40ft', 'Flat Rack 20ft', 'Flat Rack 40ft',
    'Hard Top', 'Platform'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type container_gauge as enum ('In Gauge', 'Out of Gauge');
exception when duplicate_object then null; end $$;

do $$ begin
  create type incoterm as enum ('EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status as enum ('Pending', 'In Review', 'Approved', 'Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_type as enum (
    'Commercial Invoice', 'Packing List', 'Bill of Lading', 'CMR',
    'Customs Declaration', 'Insurance Certificate'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type customs_stage as enum ('Pre-clearance', 'Submitted', 'Inspection', 'Released');
exception when duplicate_object then null; end $$;

do $$ begin
  create type handling_job_type as enum ('Inbound', 'Outbound', 'Cross-dock', 'Picking');
exception when duplicate_object then null; end $$;

do $$ begin
  create type handling_job_status as enum ('Scheduled', 'In Progress', 'Completed', 'Delayed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('Open', 'In Progress', 'Done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type automation_category as enum (
    'Documents', 'Risk', 'Quotes', 'Communication', 'Operations', 'Tasks'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type automation_status as enum ('Active', 'Draft', 'Paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type automation_event_kind as enum (
    'document-check', 'risk-flag', 'quote-prepared',
    'email-draft', 'warehouse-route', 'task-created'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Returns true if the current authenticated user has any of the given roles.
-- NOTE: plpgsql used (not sql) so the body is not validated at creation time,
-- allowing forward-reference to the profiles table defined below.
create or replace function has_role(roles user_role[]) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid()
      and role = any(roles)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  role        user_role not null default 'viewer',
  department  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
create table if not exists customers (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,                 -- e.g. CUST-0142
  company           text not null,
  contact           text not null,
  country           text not null,
  route_focus       text not null,
  active_shipments  integer not null default 0,
  last_activity     date,
  status            customer_status not null default 'Onboarding',
  owner_id          uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists customers_status_idx on customers(status);
create index if not exists customers_country_idx on customers(country);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- shipments
-- ---------------------------------------------------------------------
create table if not exists shipments (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,                   -- e.g. AL-2026-1042
  customer_id     uuid not null references customers(id) on delete restrict,
  origin          text not null,
  destination     text not null,
  mode            transport_mode not null,
  container       container_type not null,
  status          shipment_status not null default 'Booked',
  priority        priority_level not null default 'Normal',
  etd             date,
  eta             date,
  assigned_to     uuid references profiles(id) on delete set null,
  weight_kg       integer not null default 0,
  progress        numeric(3,2),                           -- 0.00 .. 1.00
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists shipments_status_idx     on shipments(status);
create index if not exists shipments_priority_idx   on shipments(priority);
create index if not exists shipments_eta_idx        on shipments(eta);
create index if not exists shipments_customer_idx   on shipments(customer_id);

create trigger shipments_set_updated_at
  before update on shipments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- shipment_events  (append-only timeline)
-- ---------------------------------------------------------------------
create table if not exists shipment_events (
  id           uuid primary key default gen_random_uuid(),
  shipment_id  uuid not null references shipments(id) on delete cascade,
  kind         text not null,
  message      text not null,
  actor_id     uuid references profiles(id) on delete set null,
  at           timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists shipment_events_shipment_idx on shipment_events(shipment_id, at desc);

-- ---------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------
create table if not exists quotes (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,             -- e.g. Q-2026-0512
  customer_id           uuid references customers(id) on delete set null,
  customer_name         text not null,                    -- snapshot — survives customer rename
  contact_name          text,
  contact_email         text,
  contact_phone         text,
  direction             quote_direction not null,
  container             container_kind not null,
  gauge                 container_gauge,
  goods_description     text not null,
  hs_code               text,
  gross_weight_kg       integer not null,
  net_weight_kg         integer not null,
  port_of_loading       text not null,
  port_of_destination   text not null,
  incoterm              incoterm not null,
  insurance             boolean not null default false,
  vgm_required          boolean not null default true,
  loading_address       text not null,
  loading_postal_code   text not null,
  loading_city          text not null,
  loading_country       text not null,
  delivery_address      text not null,
  delivery_postal_code  text not null,
  delivery_city         text not null,
  delivery_country      text not null,
  urgency               priority_level not null default 'Normal',
  status                quote_status not null default 'New',
  requested_at          date not null default current_date,
  assigned_to           uuid references profiles(id) on delete set null,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists quotes_status_idx       on quotes(status);
create index if not exists quotes_requested_at_idx on quotes(requested_at);
create index if not exists quotes_customer_idx     on quotes(customer_id);

create trigger quotes_set_updated_at
  before update on quotes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- customs_files
-- ---------------------------------------------------------------------
create table if not exists customs_files (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,                    -- e.g. CF-2026-0231
  shipment_id   uuid not null references shipments(id) on delete restrict,
  customer_id   uuid references customers(id) on delete set null,
  stage         customs_stage not null default 'Pre-clearance',
  priority      priority_level not null default 'Normal',
  owner_id      uuid references profiles(id) on delete set null,
  due_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists customs_files_shipment_idx on customs_files(shipment_id);
create index if not exists customs_files_stage_idx    on customs_files(stage);

create trigger customs_files_set_updated_at
  before update on customs_files
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- documents  (children of customs_files)
-- ---------------------------------------------------------------------
create table if not exists documents (
  id              uuid primary key default gen_random_uuid(),
  customs_file_id uuid not null references customs_files(id) on delete cascade,
  type            document_type not null,
  status          document_status not null default 'Pending',
  file_url        text,                                  -- Supabase Storage path
  uploaded_by     uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (customs_file_id, type)
);

create index if not exists documents_status_idx on documents(status);

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- warehouse_zones
-- ---------------------------------------------------------------------
create table if not exists warehouse_zones (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique,                      -- e.g. ZONE-A
  name        text not null,
  capacity    integer not null,
  used        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger warehouse_zones_set_updated_at
  before update on warehouse_zones
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- handling_jobs
-- ---------------------------------------------------------------------
create table if not exists handling_jobs (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,                  -- e.g. JOB-7825
  type            handling_job_type not null,
  shipment_id     uuid references shipments(id) on delete set null,
  zone_id         uuid references warehouse_zones(id) on delete set null,
  status          handling_job_status not null default 'Scheduled',
  staff_id        uuid references profiles(id) on delete set null,
  scheduled_for   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists handling_jobs_status_idx on handling_jobs(status);

create trigger handling_jobs_set_updated_at
  before update on handling_jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- team_tasks
-- ---------------------------------------------------------------------
create table if not exists team_tasks (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,                    -- e.g. T-9012
  title         text not null,
  owner_id      uuid references profiles(id) on delete set null,
  owner_label   text,                                    -- fallback when no profile linked
  due           date,
  priority      priority_level not null default 'Normal',
  related_kind  text,                                    -- 'shipment' | 'quote' | 'customs' | …
  related_ref   text,                                    -- public reference, e.g. AL-2026-1042
  status        task_status not null default 'Open',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists team_tasks_status_idx on team_tasks(status);
create index if not exists team_tasks_due_idx    on team_tasks(due);

create trigger team_tasks_set_updated_at
  before update on team_tasks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- automation_workflows + automation_events
-- ---------------------------------------------------------------------
create table if not exists automation_workflows (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique,                     -- e.g. wf-doc-check
  name         text not null,
  category     automation_category not null,
  description  text not null,
  inputs       jsonb not null default '[]'::jsonb,
  outputs      jsonb not null default '[]'::jsonb,
  status       automation_status not null default 'Active',
  runs_today   integer not null default 0,
  last_run_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger automation_workflows_set_updated_at
  before update on automation_workflows
  for each row execute function set_updated_at();

create table if not exists automation_events (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid references automation_workflows(id) on delete set null,
  kind         automation_event_kind not null,
  message      text not null,
  detail       text,
  related_ref  text,
  at           timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists automation_events_at_idx on automation_events(at desc);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  table_name  text not null,
  record_id   uuid,
  action      text not null,                             -- 'insert' | 'update' | 'delete'
  before_row  jsonb,
  after_row   jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_table_idx on audit_logs(table_name, created_at desc);

-- ---------------------------------------------------------------------
-- dashboard_settings
-- ---------------------------------------------------------------------
create table if not exists dashboard_settings (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null check (scope in ('org', 'user')),
  user_id     uuid references profiles(id) on delete cascade,
  key         text not null,
  value       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (scope, user_id, key)
);

create trigger dashboard_settings_set_updated_at
  before update on dashboard_settings
  for each row execute function set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
-- Bootstrap policy: any authenticated user can read; mutations gated to
-- staff roles. Tighten per-table later (e.g. customer-scoped views).

alter table profiles            enable row level security;
alter table customers           enable row level security;
alter table shipments           enable row level security;
alter table shipment_events     enable row level security;
alter table quotes              enable row level security;
alter table customs_files       enable row level security;
alter table documents           enable row level security;
alter table warehouse_zones     enable row level security;
alter table handling_jobs       enable row level security;
alter table team_tasks          enable row level security;
alter table automation_workflows enable row level security;
alter table automation_events   enable row level security;
alter table notifications       enable row level security;
alter table audit_logs          enable row level security;
alter table dashboard_settings  enable row level security;

-- profiles: every user sees their own profile + admins see all.
create policy profiles_self_select on profiles
  for select using (
    auth.uid() = id
    or has_role(array['admin','ceo']::user_role[])
  );

create policy profiles_self_update on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_admin_all on profiles
  for all using (has_role(array['admin']::user_role[]))
  with check (has_role(array['admin']::user_role[]));

-- Generic helper macro (Postgres has no macros — repeat the policy bodies).
-- Authenticated read, role-gated write. Roles per domain match the
-- recommendation in docs/backend-ready-dashboard.md.

-- customers
create policy customers_read     on customers     for select using (auth.role() = 'authenticated');
create policy customers_write    on customers     for insert with check (has_role(array['admin','sales']::user_role[]));
create policy customers_modify   on customers     for update using (has_role(array['admin','sales']::user_role[])) with check (has_role(array['admin','sales']::user_role[]));
create policy customers_delete   on customers     for delete using (has_role(array['admin']::user_role[]));

-- shipments
create policy shipments_read     on shipments     for select using (auth.role() = 'authenticated');
create policy shipments_write    on shipments     for insert with check (has_role(array['admin','operations','sales']::user_role[]));
create policy shipments_modify   on shipments     for update using (has_role(array['admin','operations']::user_role[])) with check (has_role(array['admin','operations']::user_role[]));
create policy shipments_delete   on shipments     for delete using (has_role(array['admin']::user_role[]));

-- shipment_events (append-only)
create policy shipment_events_read  on shipment_events for select using (auth.role() = 'authenticated');
create policy shipment_events_write on shipment_events for insert with check (has_role(array['admin','operations','customs','warehouse']::user_role[]));

-- quotes
create policy quotes_read     on quotes     for select using (auth.role() = 'authenticated');
create policy quotes_write    on quotes     for insert with check (has_role(array['admin','sales']::user_role[]));
create policy quotes_modify   on quotes     for update using (has_role(array['admin','sales']::user_role[])) with check (has_role(array['admin','sales']::user_role[]));
create policy quotes_delete   on quotes     for delete using (has_role(array['admin']::user_role[]));

-- customs_files + documents
create policy customs_files_read   on customs_files for select using (auth.role() = 'authenticated');
create policy customs_files_write  on customs_files for insert with check (has_role(array['admin','customs']::user_role[]));
create policy customs_files_modify on customs_files for update using (has_role(array['admin','customs']::user_role[])) with check (has_role(array['admin','customs']::user_role[]));

create policy documents_read   on documents for select using (auth.role() = 'authenticated');
create policy documents_write  on documents for insert with check (has_role(array['admin','customs']::user_role[]));
create policy documents_modify on documents for update using (has_role(array['admin','customs']::user_role[])) with check (has_role(array['admin','customs']::user_role[]));

-- warehouse + handling jobs
create policy warehouse_zones_read   on warehouse_zones for select using (auth.role() = 'authenticated');
create policy warehouse_zones_modify on warehouse_zones for update using (has_role(array['admin','warehouse','operations']::user_role[])) with check (has_role(array['admin','warehouse','operations']::user_role[]));

create policy handling_jobs_read    on handling_jobs for select using (auth.role() = 'authenticated');
create policy handling_jobs_write   on handling_jobs for insert with check (has_role(array['admin','warehouse','operations']::user_role[]));
create policy handling_jobs_modify  on handling_jobs for update using (has_role(array['admin','warehouse','operations']::user_role[])) with check (has_role(array['admin','warehouse','operations']::user_role[]));

-- team_tasks
create policy team_tasks_read    on team_tasks for select using (auth.role() = 'authenticated');
create policy team_tasks_write   on team_tasks for insert with check (has_role(array['admin','operations','customs','sales','warehouse']::user_role[]));
create policy team_tasks_modify  on team_tasks for update using (has_role(array['admin','operations','customs','sales','warehouse']::user_role[])) with check (has_role(array['admin','operations','customs','sales','warehouse']::user_role[]));

-- automation
create policy automation_workflows_read   on automation_workflows for select using (auth.role() = 'authenticated');
create policy automation_workflows_modify on automation_workflows for update using (has_role(array['admin','operations']::user_role[])) with check (has_role(array['admin','operations']::user_role[]));

create policy automation_events_read  on automation_events for select using (auth.role() = 'authenticated');
create policy automation_events_write on automation_events for insert with check (has_role(array['admin','operations']::user_role[]));

-- notifications: each user sees only their own.
create policy notifications_read on notifications
  for select using (auth.uid() = user_id or has_role(array['admin']::user_role[]));
create policy notifications_write on notifications
  for insert with check (has_role(array['admin','operations','customs','sales','warehouse']::user_role[]));
create policy notifications_update_own on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audit_logs: read-only for admins, append-only for service role.
create policy audit_logs_read on audit_logs
  for select using (has_role(array['admin','ceo']::user_role[]));
-- Inserts intentionally restricted to the service_role (no policy here).

-- dashboard_settings
-- Org-scope settings are admin-only. User-scope rows are owned by the user.
create policy settings_read on dashboard_settings
  for select using (
    auth.role() = 'authenticated' and (
      scope = 'org'
      or (scope = 'user' and user_id = auth.uid())
    )
  );

create policy settings_user_write on dashboard_settings
  for insert with check (scope = 'user' and user_id = auth.uid());

create policy settings_user_update on dashboard_settings
  for update using (scope = 'user' and user_id = auth.uid())
  with check (scope = 'user' and user_id = auth.uid());

create policy settings_org_admin on dashboard_settings
  for all using (scope = 'org' and has_role(array['admin']::user_role[]))
  with check (scope = 'org' and has_role(array['admin']::user_role[]));
