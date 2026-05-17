-- ============================================================
-- 0007_enable_realtime.sql
-- Enables Supabase Realtime for the ocean_shipments table so the
-- useRealtimeShipments hook receives postgres_changes events.
--
-- What this does:
--   Adds public.ocean_shipments to the supabase_realtime publication.
--   This allows the Supabase Realtime server to emit INSERT / UPDATE / DELETE
--   events to connected clients whenever a row changes.
--
-- Why not in 0003?
--   Realtime is an operational concern separate from the schema definition.
--   Keeping it here makes it easy to enable / disable without touching the
--   table DDL.
--
-- Idempotency:
--   The DO block checks pg_publication_tables first so re-running the
--   migration never throws "relation already in publication" errors.
--
-- REPLICA IDENTITY note:
--   Default REPLICA IDENTITY (primary key) is sufficient.
--   The hook re-fetches the full table via PostgREST on each event rather
--   than relying on the payload's new/old row — so we don't need FULL.
-- ============================================================

DO $$
BEGIN
  -- supabase_realtime publication is created automatically by the
  -- Supabase platform. Guard against it not existing in local dev
  -- environments that don't run the full Supabase stack.
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname    = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename  = 'ocean_shipments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ocean_shipments;
    END IF;
  END IF;
END $$;
