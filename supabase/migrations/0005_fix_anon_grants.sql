-- ============================================================
-- 0005_fix_anon_grants.sql
-- Explicitly grant anon role SELECT + schema usage, and
-- create named permissive policies scoped to the anon role.
-- ============================================================

-- Explicit schema + table grants for the anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.ocean_shipments TO anon;
GRANT SELECT ON public.ocean_traders TO anon;
GRANT SELECT ON public.automation_logs TO anon;

-- ocean_shipments: named permissive anon read policy
DROP POLICY IF EXISTS "Allow public read access" ON public.ocean_shipments;
CREATE POLICY "Allow public read access" ON public.ocean_shipments
  AS PERMISSIVE FOR SELECT TO anon USING (true);

-- ocean_traders: named permissive anon read policy
DROP POLICY IF EXISTS "Allow public read access" ON public.ocean_traders;
CREATE POLICY "Allow public read access" ON public.ocean_traders
  AS PERMISSIVE FOR SELECT TO anon USING (true);

-- automation_logs: named permissive anon read policy
DROP POLICY IF EXISTS "Allow public read access" ON public.automation_logs;
CREATE POLICY "Allow public read access" ON public.automation_logs
  AS PERMISSIVE FOR SELECT TO anon USING (true);
