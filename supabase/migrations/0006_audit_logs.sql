-- ============================================================
-- 0006_audit_logs.sql
-- Immutable audit trail for AI-assisted email approvals.
--
-- Design principles:
--   • append-only — no UPDATE or DELETE RLS policies exist, so PostgreSQL
--     default-deny blocks any mutation after insert.
--   • user_email / user_role are denormalised so the audit record
--     survives profile changes or user deletion.
--   • cost_avoided_eur is nullable — only populated for demurrage workflows.
--   • edge_fn_response (jsonb) stores the raw Resend API response for
--     reconciliation with Resend webhook events.
-- ============================================================

create table public.audit_logs (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null    default now(),

  -- actor (who approved)
  user_id            uuid        not null    references auth.users(id) on delete set null,
  user_email         text        not null,
  user_role          text        not null,   -- 'manager' | 'customs' | 'trader' | 'viewer'

  -- action classification
  action_type        text        not null,
  -- 'AI_EMAIL_APPROVED'         — email sent successfully
  -- 'AI_EMAIL_SEND_FAILED'      — edge function returned an error
  -- 'AI_EMAIL_REJECTED'         — user dismissed / rejected the draft (future)

  -- linked business objects (nullable — not all workflows have all fields)
  shipment_id        text,                   -- mirrors ocean_shipments.id
  container_number   text,                   -- denormalised for fast audit queries

  -- business context
  cost_avoided_eur   numeric(12, 2),         -- € value saved by early resolution (nullable)
  demurrage_risk     text,                   -- 'critical' | 'warning' | 'none'

  -- email details
  email_recipient    text,
  email_subject      text,
  ai_draft_snapshot  text,                   -- draft at moment of approval (immutable record)
  final_body         text,                   -- body actually sent (may differ if user edited)

  -- delivery outcome
  edge_fn_response   jsonb,                  -- raw Resend API response or error payload
  delivery_status    text        not null    default 'pending',
  -- 'pending' | 'sent' | 'failed'
  resend_message_id  text                    -- Resend message ID for webhook reconciliation
);

-- ── Indexes ────────────────────────────────────────────────────────────────
create index on public.audit_logs (created_at desc);
create index on public.audit_logs (shipment_id) where shipment_id is not null;
create index on public.audit_logs (user_id);
create index on public.audit_logs (delivery_status);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.audit_logs enable row level security;

-- Authenticated staff can read all audit logs
create policy "audit_logs_select"
  on public.audit_logs
  for select
  using (auth.role() = 'authenticated');

-- Authenticated users may only insert rows attributed to themselves
create policy "audit_logs_insert"
  on public.audit_logs
  for insert
  with check (
    auth.role() = 'authenticated'
    and user_id = auth.uid()
  );

-- No UPDATE policy → blocked by PostgreSQL default-deny
-- No DELETE policy → blocked by PostgreSQL default-deny

-- ── Grants ─────────────────────────────────────────────────────────────────
grant select, insert on public.audit_logs to authenticated;
-- anon role intentionally receives NO grant on this table
