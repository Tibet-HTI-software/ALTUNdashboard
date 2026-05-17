-- ============================================================
-- 0004_relax_rls_for_demo.sql
-- Relax SELECT policies on ocean freight tables to allow
-- anonymous / demo-bypass reads. The demo bypass does not
-- produce a real Supabase JWT, so auth.role() = 'anon'.
-- Write policies remain gated to ceo/planner as before.
-- ============================================================

-- ocean_shipments: allow anon + authenticated reads
drop policy if exists ocean_shipments_read on public.ocean_shipments;
create policy ocean_shipments_read on public.ocean_shipments
  for select using (true);

-- ocean_traders: allow anon + authenticated reads
drop policy if exists ocean_traders_read on public.ocean_traders;
create policy ocean_traders_read on public.ocean_traders
  for select using (true);

-- automation_logs: allow anon + authenticated reads
drop policy if exists automation_logs_read on public.automation_logs;
create policy automation_logs_read on public.automation_logs
  for select using (true);
