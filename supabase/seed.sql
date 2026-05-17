-- ============================================================
-- seed.sql — demo data for the Altun Logistics dashboard.
--
-- Mirrors the 14 sea-freight shipments + traders from the front-end
-- mock file `src/data/dashboard/oceanFreight.ts`. Run automatically by
-- `supabase db reset`, so a fresh database instantly has a perfect demo
-- environment. Free-time / discharge timestamps are expressed relative
-- to now() so the demurrage clocks stay realistic whenever it is loaded.
-- ============================================================

-- ── Ocean traders (importers / exporters) ───────────────────
insert into public.ocean_traders (id, name, trader_type, contact_name, contact_email)
values
  ('00000000-0000-0000-0000-000000000001', 'Vandenberg Home & Living BV', 'Importer', 'Eline Vandenberg', 'eline@vandenberg-living.nl'),
  ('00000000-0000-0000-0000-000000000002', 'Helios Electronics NV',       'Importer', 'Joris Maes',       'j.maes@helios-electronics.be'),
  ('00000000-0000-0000-0000-000000000003', 'Noord Fresh Produce BV',      'Importer', 'Sanne de Wit',     's.dewit@noordfresh.nl'),
  ('00000000-0000-0000-0000-000000000004', 'Brams Industrial Supplies BV','Importer', 'Peter Brams',      'peter@brams-industrial.be'),
  ('00000000-0000-0000-0000-000000000005', 'Lumen Pharma Logistics BV',   'Importer', 'Marit Joosten',    'm.joosten@lumenpharma.nl'),
  ('00000000-0000-0000-0000-000000000006', 'Delta Machinery Export BV',   'Exporter', 'Tom Hartman',      't.hartman@deltamachinery.nl'),
  ('00000000-0000-0000-0000-000000000007', 'Flandria Food Group NV',      'Exporter', 'Karel Dewulf',     'k.dewulf@flandriafood.be')
on conflict (id) do nothing;

-- ── Ocean Shipments ──────────────────────────────────────────
insert into public.ocean_shipments (
  id, bl_number, container_number, container_type, direction, carrier,
  vessel, voyage, pol, pod, terminal, customer_id, trader, trader_contact,
  trader_email, phase, etd, eta, discharged_at, free_days_total,
  free_time_expires_at, demurrage_rate_per_day, customs_block, teu,
  weight_kg, commodity
) values
  ('ALT-OF-2026-0418','MAEU583920147','MSKU7841920','40ft High-Cube','Import','Maersk',
   'Maersk Sentosa','508W','Shanghai','Rotterdam','APM Terminals Maasvlakte II',
   '00000000-0000-0000-0000-000000000001','Vandenberg Home & Living BV','Eline Vandenberg',
   'eline@vandenberg-living.nl','Customs Hold',current_date - 31,current_date - 2,
   now() - interval '60 hours',4,now() - interval '36 hours',185,
   'Missing Commercial Invoice',2,18420,'Rattan furniture & home decor'),

  ('ALT-OF-2026-0421','MSCU9920481773','MSCU8492019','40ft Dry','Import','MSC',
   'MSC Loreto','FE412A','Ningbo','Antwerp','MSC PSA European Terminal',
   '00000000-0000-0000-0000-000000000002','Helios Electronics NV','Joris Maes',
   'j.maes@helios-electronics.be','Discharged',current_date - 28,current_date - 1,
   now() - interval '15 hours',5,now() + interval '9 hours',210,
   null,2,21560,'Consumer electronics & accessories'),

  ('ALT-OF-2026-0423','CMAU4471209856','CMAU6610337','20ft Reefer','Import','CMA CGM',
   'CMA CGM Bougainville','0MX3W','Valencia','Rotterdam','Rotterdam World Gateway',
   '00000000-0000-0000-0000-000000000003','Noord Fresh Produce BV','Sanne de Wit',
   's.dewit@noordfresh.nl','Customs Hold',current_date - 12,current_date - 1,
   now() - interval '20 hours',3,now() + interval '19 hours',320,
   'Phytosanitary Certificate Missing',1,12880,'Chilled citrus fruit'),

  ('ALT-OF-2026-0426','HLCUSHA2204517','HLXU8123094','40ft Dry','Import','Hapag-Lloyd',
   'Hapag Berlin Express','229E','Qingdao','Antwerp','DP World Antwerp Gateway',
   '00000000-0000-0000-0000-000000000004','Brams Industrial Supplies BV','Peter Brams',
   'peter@brams-industrial.be','Discharged',current_date - 26,current_date - 2,
   now() - interval '30 hours',5,now() + interval '41 hours',175,
   null,2,24010,'Steel fasteners & fittings'),

  ('ALT-OF-2026-0429','ONEYSHA51820930','ONEU2934817','40ft Reefer','Import','ONE',
   'ONE Olympus','041W','Shanghai','Rotterdam','ECT Delta Terminal',
   '00000000-0000-0000-0000-000000000005','Lumen Pharma Logistics BV','Marit Joosten',
   'm.joosten@lumenpharma.nl','Customs Hold',current_date - 30,current_date - 3,
   now() - interval '50 hours',4,now() + interval '62 hours',295,
   'Certificate of Origin Hold',2,16740,'Temperature-controlled pharmaceuticals'),

  ('ALT-OF-2026-0431','EGLV142600318841','EGHU9047712','40ft High-Cube','Import','Evergreen',
   'Ever Govern','1184-051E','Kaohsiung','Rotterdam','APM Terminals Maasvlakte II',
   '00000000-0000-0000-0000-000000000002','Helios Electronics NV','Joris Maes',
   'j.maes@helios-electronics.be','In Transit',current_date - 9,current_date + 13,
   null,5,now() + interval '140 hours',210,
   null,2,19980,'LED lighting modules'),

  ('ALT-OF-2026-0434','MAEU583991022','MRKU5582910','20ft Dry','Export','Maersk',
   'Maersk Kowloon','512E','Rotterdam','Singapore','APM Terminals Maasvlakte II',
   '00000000-0000-0000-0000-000000000006','Delta Machinery Export BV','Tom Hartman',
   't.hartman@deltamachinery.nl','Booked',current_date + 6,current_date + 34,
   null,7,now() + interval '720 hours',160,
   'Incomplete Bill of Lading',1,9450,'Precision machinery parts'),

  ('ALT-OF-2026-0436','CMAU4471330017','CMAU7781450','40ft Dry','Export','CMA CGM',
   'CMA CGM Jacques Saade','0CX9E','Antwerp','New York','MSC PSA European Terminal',
   '00000000-0000-0000-0000-000000000007','Flandria Food Group NV','Karel Dewulf',
   'k.dewulf@flandriafood.be','In Transit',current_date - 7,current_date + 5,
   null,6,now() + interval '600 hours',190,
   null,2,22300,'Packaged confectionery'),

  ('ALT-OF-2026-0438','MSCU9931200548','MEDU3398721','20ft Dry','Export','MSC',
   'MSC Ambra','FE551E','Rotterdam','Shanghai','ECT Delta Terminal',
   '00000000-0000-0000-0000-000000000006','Delta Machinery Export BV','Tom Hartman',
   't.hartman@deltamachinery.nl','Released',current_date - 3,current_date + 27,
   null,7,now() + interval '540 hours',160,
   null,1,8870,'Hydraulic components'),

  ('ALT-OF-2026-0440','HLCUSHA2240881','HLBU7740921','40ft Dry','Import','Hapag-Lloyd',
   'Hapag Rome Express','233E','Busan','Rotterdam','Rotterdam World Gateway',
   '00000000-0000-0000-0000-000000000001','Vandenberg Home & Living BV','Eline Vandenberg',
   'eline@vandenberg-living.nl','Delivered',current_date - 44,current_date - 14,
   now() - interval '300 hours',5,now() - interval '220 hours',175,
   null,2,20140,'Textile & soft furnishings'),

  ('ALT-OF-2026-0442','ONEYSHA51877104','ONEU3120954','40ft Dry','Import','ONE',
   'ONE Hangzhou Bay','047W','Yantian','Antwerp','DP World Antwerp Gateway',
   '00000000-0000-0000-0000-000000000004','Brams Industrial Supplies BV','Peter Brams',
   'peter@brams-industrial.be','In Transit',current_date - 5,current_date + 18,
   null,5,now() + interval '900 hours',175,
   null,2,23110,'Power tools & equipment'),

  ('ALT-OF-2026-0444','MAEU584100923','MSKU8890214','20ft Reefer','Import','Maersk',
   'Maersk Sentosa','508W','Cartagena','Rotterdam','ECT Delta Terminal',
   '00000000-0000-0000-0000-000000000003','Noord Fresh Produce BV','Sanne de Wit',
   's.dewit@noordfresh.nl','Discharged',current_date - 16,current_date - 1,
   now() - interval '10 hours',3,now() + interval '52 hours',320,
   null,1,11460,'Chilled avocados'),

  ('ALT-OF-2026-0446','MSCU9942011887','MEDU4471203','40ft High-Cube','Import','MSC',
   'MSC Loreto','FE412A','Tanjung Pelepas','Antwerp','MSC PSA European Terminal',
   '00000000-0000-0000-0000-000000000002','Helios Electronics NV','Joris Maes',
   'j.maes@helios-electronics.be','Customs Hold',current_date - 29,current_date - 2,
   now() - interval '44 hours',5,now() + interval '30 hours',210,
   'Packing List Discrepancy',2,17890,'Networking hardware'),

  ('ALT-OF-2026-0448','EGLV142600412290','EITU1209845','40ft Dry','Import','Evergreen',
   'Ever Govern','1184-051E','Laem Chabang','Rotterdam','Rotterdam World Gateway',
   '00000000-0000-0000-0000-000000000007','Flandria Food Group NV','Karel Dewulf',
   'k.dewulf@flandriafood.be','Customs Hold',current_date - 33,current_date - 2,
   now() - interval '66 hours',4,now() + interval '80 hours',190,
   'Pending Duty Payment',2,19230,'Canned food goods')
on conflict (id) do nothing;

-- ── Automation logs (sample workflow run history) ───────────
insert into public.automation_logs (workflow, shipment_id, level, message)
values
  ('docs',  'ALT-OF-2026-0418','warning','Commercial Invoice missing — exporter notified by AI.'),
  ('docs',  'ALT-OF-2026-0423','warning','Phytosanitary Certificate missing — escalated as urgent.'),
  ('delay', 'ALT-OF-2026-0418','error',  'Free time expired — demurrage now accruing at EUR 185/day.'),
  ('delay', 'ALT-OF-2026-0421','warning','Under 24h free time left — collection recommended.'),
  ('email', 'ALT-OF-2026-0429','info',   'AI drafted a demurrage-query reply for Lumen Pharma.'),
  ('email', 'ALT-OF-2026-0442','info',   'AI drafted a status-update reply for Brams Industrial.');
