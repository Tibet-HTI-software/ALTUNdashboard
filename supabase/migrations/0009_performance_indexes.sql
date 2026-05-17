-- ============================================================
-- 0009_performance_indexes.sql
--
-- Adds B-tree indexes to cover the dashboard's live query paths.
-- Every statement uses CREATE INDEX IF NOT EXISTS — fully idempotent.
--
-- ── What already exists (do NOT re-create) ───────────────────
--   0003: ocean_shipments_phase_idx  (phase)
--         ocean_shipments_pod_idx    (pod)
--         ocean_shipments_customer_idx (customer_id)
--
--   0006: audit_logs (created_at desc)
--         audit_logs (shipment_id) WHERE shipment_id IS NOT NULL
--         audit_logs (user_id)
--         audit_logs (delivery_status)
--
-- ── New indexes added here ────────────────────────────────────
-- ============================================================

-- ── audit_logs ────────────────────────────────────────────────────────────────
--
-- The ShipmentDetailDrawer's PostgREST OR filter:
--   .or(`shipment_id.eq.${sid},container_number.eq.${cn}`)
--   .order('created_at', { ascending: false })
--
-- 1. Partial index on container_number (the missing half of the OR filter).
create index if not exists audit_logs_container_number_idx
  on public.audit_logs (container_number)
  where container_number is not null;

-- 2. Composite covering index for the full OR filter + timestamp sort.
--    PostgREST can bitmap-AND both single-column indexes, but this composite
--    eliminates the heap fetch for the container_number branch and covers the
--    ORDER BY created_at DESC in a single pass.
create index if not exists audit_logs_shipment_container_created_idx
  on public.audit_logs (shipment_id, container_number, created_at desc);

-- ── ocean_shipments ───────────────────────────────────────────────────────────
--
-- 3. container_number — used by global search, audit cross-reference,
--    and the Realtime event payload matcher.
create index if not exists ocean_shipments_container_number_idx
  on public.ocean_shipments (container_number);

-- 4. free_time_expires_at — the core D&D calculation field.
--    Used in range queries: WHERE free_time_expires_at < now() + interval '3 days'
create index if not exists ocean_shipments_free_time_expires_idx
  on public.ocean_shipments (free_time_expires_at);

-- 5. Partial index on customs_block — fast retrieval of held containers.
--    NULL rows (no hold) are excluded to keep the index compact.
create index if not exists ocean_shipments_customs_block_idx
  on public.ocean_shipments (customs_block)
  where customs_block is not null;

-- 6. Composite (phase, free_time_expires_at) for the Demurrage Risk Board.
--    Query pattern: WHERE phase != 'Delivered' ORDER BY free_time_expires_at ASC.
--    Partial exclusion removes Delivered rows from the index entirely.
create index if not exists ocean_shipments_active_fte_idx
  on public.ocean_shipments (phase, free_time_expires_at)
  where phase != 'Delivered';

-- 7. updated_at DESC — supports change-ordered queries and realtime
--    channel snapshot ordering.
create index if not exists ocean_shipments_updated_at_idx
  on public.ocean_shipments (updated_at desc);

-- ── automation_logs ───────────────────────────────────────────────────────────
--
-- 8. shipment_id FK — 0003 created the composite (workflow, created_at) index
--    but omitted an index on the FK column itself.  Any JOIN or filter on
--    shipment_id does a sequential scan without this.
create index if not exists automation_logs_shipment_id_idx
  on public.automation_logs (shipment_id)
  where shipment_id is not null;
