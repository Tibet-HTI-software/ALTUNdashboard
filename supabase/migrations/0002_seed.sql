-- =====================================================================
-- Altun Logistics Dashboard — seed data
-- =====================================================================
-- Run after 0001_initial_schema.sql. Inserts realistic, safe demo data
-- mirroring the current static fixtures in src/data/dashboard/*.
--
-- Profiles are NOT seeded here because rows in `profiles` reference
-- `auth.users(id)` which Supabase creates only via the auth flow. Create
-- staff users in Supabase Auth dashboard first, then `insert into profiles`
-- linked by `id`. See docs/supabase-setup.md for the exact steps.
-- =====================================================================

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
insert into customers (reference, company, contact, country, route_focus, active_shipments, last_activity, status) values
  ('CUST-0142', 'Demir Industrial Trading',     'Mehmet Demir',    'Turkey',      'Antwerp ↔ Istanbul', 5, '2026-05-08', 'Active'),
  ('CUST-0143', 'Karlsruhe Maschinenbau GmbH',  'Anna Becker',     'Germany',     'Antwerp → Karlsruhe', 2, '2026-05-07', 'Active'),
  ('CUST-0144', 'BeneluxFresh BV',              'Sanne de Vries',  'Netherlands', 'Mersin → Rotterdam', 3, '2026-05-06', 'Active'),
  ('CUST-0145', 'Polimer Plastik San.',         'Selim Yıldız',    'Turkey',      'Izmir → Antwerp',    1, '2026-05-04', 'Active'),
  ('CUST-0146', 'Egean Trade House',            'Deniz Kaya',      'Turkey',      'Antwerp → Izmir',    2, '2026-05-03', 'Active'),
  ('CUST-0147', 'Anatolia Steel Co.',           'Cem Aydın',       'Turkey',      'Antwerp → Bursa',    1, '2026-05-02', 'Onboarding'),
  ('CUST-0148', 'Italmoda Tessile SRL',         'Giulia Romano',   'Italy',       'Milan → Antwerp',    2, '2026-04-30', 'Active'),
  ('CUST-0149', 'Pirene Distribution',          'Camille Laurent', 'France',      'Antwerp → Lyon',     0, '2026-04-28', 'On Hold');

-- ---------------------------------------------------------------------
-- shipments
-- ---------------------------------------------------------------------
insert into shipments (reference, customer_id, origin, destination, mode, container, status, priority, etd, eta, weight_kg, notes) values
  ('AL-2026-1042', (select id from customers where reference = 'CUST-0142'), 'Antwerp, BE',  'Istanbul, TR', 'Sea',  'FCL',          'In Transit',         'High',   '2026-05-04', '2026-05-12', 18000, 'Vessel ETA confirmed by carrier.'),
  ('AL-2026-1043', (select id from customers where reference = 'CUST-0143'), 'Antwerp, BE',  'Hamburg, DE',  'Road', 'FCL',          'Booked',             'Normal', '2026-05-08', '2026-05-09',  9000, null),
  ('AL-2026-1044', (select id from customers where reference = 'CUST-0144'), 'Mersin, TR',   'Rotterdam, NL','Sea',  'Reefer',       'In Transit',         'Urgent', '2026-05-02', '2026-05-10', 14000, 'Temperature log required at origin.'),
  ('AL-2026-1045', (select id from customers where reference = 'CUST-0142'), 'Antwerp, BE',  'Istanbul, TR', 'Sea',  'FCL',          'Customs Clearance',  'High',   '2026-05-01', '2026-05-09', 17500, 'Insurance Certificate pending.'),
  ('AL-2026-1046', (select id from customers where reference = 'CUST-0145'), 'Izmir, TR',    'Antwerp, BE',  'Sea',  'LCL',          'In Transit',         'Normal', '2026-04-30', '2026-05-08',  6500, null),
  ('AL-2026-1047', (select id from customers where reference = 'CUST-0146'), 'Antwerp, BE',  'Izmir, TR',    'Sea',  'FCL',          'At Warehouse',       'Normal', '2026-05-05', '2026-05-13', 17000, null),
  ('AL-2026-1048', (select id from customers where reference = 'CUST-0142'), 'Antwerp, BE',  'Istanbul, TR', 'Sea',  'FCL',          'Delayed',            'Urgent', '2026-04-28', '2026-05-09', 18500, 'Customs inspection extended past SLA.'),
  ('AL-2026-1049', (select id from customers where reference = 'CUST-0147'), 'Antwerp, BE',  'Bursa, TR',    'Sea',  'Flat-rack',    'Booked',             'High',   '2026-05-10', '2026-05-18', 24000, 'Out-of-gauge — lashing plan required.'),
  ('AL-2026-1050', (select id from customers where reference = 'CUST-0148'), 'Milan, IT',    'Antwerp, BE',  'Rail', 'FCL',          'Delivered',          'Low',    '2026-04-22', '2026-04-29', 11000, null),
  ('AL-2026-1051', (select id from customers where reference = 'CUST-0149'), 'Antwerp, BE',  'Lyon, FR',     'Road', 'LCL',          'Delivered',          'Low',    '2026-04-20', '2026-04-23',  3000, null);

-- ---------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------
insert into quotes (
  reference, customer_id, customer_name, contact_name, contact_email, contact_phone,
  direction, container, gauge, goods_description, hs_code,
  gross_weight_kg, net_weight_kg, port_of_loading, port_of_destination, incoterm,
  insurance, vgm_required,
  loading_address, loading_postal_code, loading_city, loading_country,
  delivery_address, delivery_postal_code, delivery_city, delivery_country,
  urgency, status, requested_at, notes
) values
  ('Q-2026-0512', (select id from customers where reference='CUST-0142'), 'Demir Industrial Trading', 'Mehmet Demir',    'ops@demirindustrial.example',  '+90 212 555 0142',
   'Export', '40ft High Cube (HC)',     null,            'Industrial parts and assembly components',                  '8479.89', 18000, 17200, 'Antwerp, BE',          'Istanbul Ambarli, TR', 'FOB',
   true, true, 'Industriepark 12, Hall B', '2030', 'Antwerp', 'Belgium', 'Demir Industrial Park, Building 4', '34480', 'Istanbul', 'Turkey',
   'High', 'New', '2026-05-08', 'Customer requested vessel cut-off confirmation before booking.'),

  ('Q-2026-0511', (select id from customers where reference='CUST-0143'), 'Karlsruhe Maschinenbau GmbH', 'Anna Becker', 'logistics@kmb.example',         '+49 721 555 0188',
   'Export', '40ft Standard (DV)',      null,            'Machinery components and spare parts',                       '8466.93',  9000,  8500, 'Antwerp, BE',          'Hamburg, DE',           'DAP',
   false, true, 'Havenlaan 88',                '2030', 'Antwerp', 'Belgium', 'Industriestraße 14',               '76131', 'Karlsruhe', 'Germany',
   'Normal', 'Reviewing', '2026-05-07', null),

  ('Q-2026-0510', (select id from customers where reference='CUST-0144'), 'BeneluxFresh BV',           'Sanne de Vries',  'planning@beneluxfresh.example', '+31 10 555 0166',
   'Import', '40ft Reefer HC',          null,            'Perishable produce, +2°C / +4°C',                            '0805.10', 14000, 13200, 'Mersin, TR',           'Rotterdam, NL',         'CIF',
   true, true, 'Mersin Free Zone, Block 7',  '33020', 'Mersin', 'Turkey',  'Coldstore Maasvlakte 21',          '3199',  'Rotterdam', 'Netherlands',
   'Urgent', 'Sent', '2026-05-06', 'Temperature log and pre-cool confirmation required at origin.'),

  ('Q-2026-0509', (select id from customers where reference='CUST-0145'), 'Polimer Plastik San.',      'Selim Yıldız',    'export@polimerplastik.example', '+90 232 555 0123',
   'Import', '20ft Standard (DV)',      null,            'HDPE plastic granules in 25 kg bags',                        '3901.20',  6500,  6300, 'Izmir Aliaga, TR',     'Antwerp, BE',           'CFR',
   false, true, 'Aliaga OSB, 4. Cadde 9',     '35800', 'Izmir', 'Turkey',  'Noorderlaan 200',                  '2030',  'Antwerp', 'Belgium',
   'Normal', 'Approved', '2026-05-04', null),

  ('Q-2026-0508', (select id from customers where reference='CUST-0146'), 'Egean Trade House',         'Deniz Kaya',      'trade@egean.example',           '+90 232 555 0177',
   'Export', '40ft Standard (DV)',      null,            'Mixed consumer goods (consolidated)',                        '9999.00', 17000, 16100, 'Antwerp, BE',          'Izmir Aliaga, TR',      'DDP',
   true, true, 'Logistic Park 4, Dock 22',   '2030', 'Antwerp', 'Belgium', 'Egean Distribution Center',         '35370', 'Izmir', 'Turkey',
   'Normal', 'Reviewing', '2026-05-03', null),

  ('Q-2026-0507', (select id from customers where reference='CUST-0147'), 'Anatolia Steel Co.',        'Cem Aydın',       'export@anatoliasteel.example',  '+90 224 555 0192',
   'Export', 'Flat Rack 40ft',          'Out of Gauge',  'Long steel beams, oversized',                                '7216.32', 24000, 23500, 'Antwerp, BE',          'Gemlik, TR',            'FCA',
   true, true, 'Heavy Cargo Terminal, Quay 9','2030', 'Antwerp', 'Belgium', 'Anatolia Steel Plant, Gate 3',     '16600', 'Bursa', 'Turkey',
   'High', 'Sent', '2026-05-02', 'Out-of-gauge — lashing plan and stowage approval required.'),

  ('Q-2026-0506', (select id from customers where reference='CUST-0148'), 'Italmoda Tessile SRL',      'Giulia Romano',   'export@italmoda.example',       '+39 02 555 0144',
   'Import', '40ft Standard (DV)',      null,            'Textile rolls and finished garments',                        '5407.42', 11000, 10400, 'Milan rail terminal, IT', 'Antwerp, BE',         'DAP',
   true, false, 'Via Lombardia 14',           '20100', 'Milan', 'Italy',   'Antwerp Distribution Hub C',       '2030',  'Antwerp', 'Belgium',
   'Low', 'Approved', '2026-04-30', null),

  ('Q-2026-0505', (select id from customers where reference='CUST-0149'), 'Pirene Distribution',       'Camille Laurent', 'ops@pirene.example',            '+33 4 78 555 0102',
   'Export', '20ft Standard (DV)',      null,            'Retail goods, mixed pallets',                                '9999.00',  3000,  2700, 'Antwerp, BE',          'Lyon road hub, FR',     'EXW',
   false, false, 'Ring Logistics Antwerp 3',  '2030', 'Antwerp', 'Belgium', 'Pirene DC Lyon Sud',               '69800', 'Lyon', 'France',
   'Low', 'Rejected', '2026-04-28', 'Customer postponed — retry mid-quarter.');

-- ---------------------------------------------------------------------
-- customs_files + documents
-- ---------------------------------------------------------------------
insert into customs_files (reference, shipment_id, customer_id, stage, priority, due_date) values
  ('CF-2026-0231', (select id from shipments where reference='AL-2026-1045'), (select id from customers where reference='CUST-0142'), 'Submitted',    'Urgent', '2026-05-09'),
  ('CF-2026-0232', (select id from shipments where reference='AL-2026-1042'), (select id from customers where reference='CUST-0142'), 'Pre-clearance','High',   '2026-05-10'),
  ('CF-2026-0233', (select id from shipments where reference='AL-2026-1048'), (select id from customers where reference='CUST-0142'), 'Inspection',  'Urgent', '2026-05-09'),
  ('CF-2026-0234', (select id from shipments where reference='AL-2026-1046'), (select id from customers where reference='CUST-0145'), 'Released',    'Normal', '2026-05-04');

insert into documents (customs_file_id, type, status) values
  ((select id from customs_files where reference='CF-2026-0231'), 'Commercial Invoice',    'Approved'),
  ((select id from customs_files where reference='CF-2026-0231'), 'Packing List',          'Approved'),
  ((select id from customs_files where reference='CF-2026-0231'), 'Bill of Lading',        'In Review'),
  ((select id from customs_files where reference='CF-2026-0231'), 'Insurance Certificate', 'Pending'),
  ((select id from customs_files where reference='CF-2026-0232'), 'Commercial Invoice',    'Pending'),
  ((select id from customs_files where reference='CF-2026-0232'), 'Packing List',          'Pending'),
  ((select id from customs_files where reference='CF-2026-0233'), 'Customs Declaration',   'In Review'),
  ((select id from customs_files where reference='CF-2026-0233'), 'CMR',                   'Approved'),
  ((select id from customs_files where reference='CF-2026-0234'), 'Customs Declaration',   'Approved'),
  ((select id from customs_files where reference='CF-2026-0234'), 'Bill of Lading',        'Approved');

-- ---------------------------------------------------------------------
-- warehouse_zones + handling_jobs
-- ---------------------------------------------------------------------
insert into warehouse_zones (reference, name, capacity, used) values
  ('ZONE-A', 'Zone A — Dry Storage',     520, 410),
  ('ZONE-B', 'Zone B — Bulk Holding',    480, 360),
  ('ZONE-C', 'Zone C — Reefer',          200, 184),
  ('ZONE-D', 'Zone D — High-value',      160,  92),
  ('ZONE-E', 'Zone E — Cross-dock',      300, 145);

insert into handling_jobs (reference, type, shipment_id, zone_id, status, scheduled_for) values
  ('JOB-7821', 'Inbound',    (select id from shipments where reference='AL-2026-1046'), (select id from warehouse_zones where reference='ZONE-A'), 'Completed',  '2026-05-08T09:00:00Z'),
  ('JOB-7822', 'Outbound',   (select id from shipments where reference='AL-2026-1047'), (select id from warehouse_zones where reference='ZONE-E'), 'Scheduled',  '2026-05-09T13:30:00Z'),
  ('JOB-7823', 'Cross-dock', (select id from shipments where reference='AL-2026-1042'), (select id from warehouse_zones where reference='ZONE-E'), 'In Progress','2026-05-08T15:00:00Z'),
  ('JOB-7824', 'Picking',    (select id from shipments where reference='AL-2026-1050'), (select id from warehouse_zones where reference='ZONE-A'), 'Completed',  '2026-04-29T08:00:00Z'),
  ('JOB-7825', 'Inbound',    null,                                                       (select id from warehouse_zones where reference='ZONE-C'), 'Delayed',    '2026-05-09T07:00:00Z');

-- ---------------------------------------------------------------------
-- team_tasks
-- ---------------------------------------------------------------------
insert into team_tasks (reference, title, owner_label, due, priority, related_kind, related_ref, status) values
  ('T-9012', 'Confirm vessel ETA with carrier for AL-2026-1042', 'Freight Forwarding', '2026-05-08', 'High',   'shipment', 'AL-2026-1042', 'In Progress'),
  ('T-9013', 'Resubmit customs declaration for AL-2026-1048',   'Customs',            '2026-05-09', 'Urgent', 'shipment', 'AL-2026-1048', 'Open'),
  ('T-9014', 'Send rate sheet to Egean Trade House',            'Sales',              '2026-05-08', 'Normal', 'quote',    'Q-2026-0508',  'Open'),
  ('T-9015', 'Reefer temperature audit — Zone C',               'Operations',         '2026-05-08', 'High',   'zone',     'ZONE-C',       'In Progress'),
  ('T-9016', 'Onboard Anatolia Steel Co. — KYC docs',           'Sales',              '2026-05-12', 'Normal', 'customer', 'CUST-0147',    'Open'),
  ('T-9017', 'Approve quote Q-2026-0512',                       'Sales',              '2026-05-09', 'High',   'quote',    'Q-2026-0512',  'Open');

-- ---------------------------------------------------------------------
-- automation_workflows + automation_events
-- ---------------------------------------------------------------------
insert into automation_workflows (reference, name, category, description, inputs, outputs, status, runs_today) values
  ('wf-doc-check',     'Document Completeness Check', 'Documents',     'Reviews customs files and highlights missing or incomplete documents before submission.',
    '["Shipment","Customer","Document checklist"]'::jsonb,
    '["Missing documents","Risk level","Suggested next action"]'::jsonb,
    'Active', 38),
  ('wf-delay-risk',    'Delay Risk Detection',        'Risk',          'Flags shipments that may miss ETA based on customs stage, warehouse status, carrier updates, and priority.',
    '["Shipment status","ETA","Customs stage","Warehouse alerts"]'::jsonb,
    '["Delay risk score","Reason","Recommended action"]'::jsonb,
    'Active', 24),
  ('wf-quote-prep',    'Quote Preparation Assistant', 'Quotes',        'Prepares quote responses from the request: import/export direction, container type, goods, port pair, and Incoterm.',
    '["Direction (Import/Export)","Container type + gauge","Goods + HS code","Port of loading / destination","Incoterm","Insurance + VGM"]'::jsonb,
    '["Suggested service","Required documents per Incoterm","Internal checklist"]'::jsonb,
    'Active', 9),
  ('wf-email-draft',   'Email Response Assistant',    'Communication', 'Summarizes incoming customer emails and prepares a professional reply draft for staff review before sending.',
    '["Incoming email","Sender","Subject","Shipment / quote reference","Tone / urgency"]'::jsonb,
    '["Email summary","Suggested reply","Recommended next action"]'::jsonb,
    'Active', 17),
  ('wf-daily-summary', 'Daily Operations Summary',    'Operations',    'Creates a morning summary of delayed shipments, urgent customs files, warehouse warnings, and open quotes.',
    '["Shipments","Customs files","Warehouse alerts","Tasks"]'::jsonb,
    '["Daily action list for operations team"]'::jsonb,
    'Active', 1),
  ('wf-task-rules',    'Task Automation Rules',       'Tasks',         'Turns operational events into staff tasks automatically — missing documents, delays, approved quotes, capacity alerts.',
    '["Operational events","Rule conditions","Owner mapping"]'::jsonb,
    '["Created tasks","Routed notifications"]'::jsonb,
    'Active', 22);

insert into automation_events (workflow_id, kind, message, detail, related_ref, at) values
  ((select id from automation_workflows where reference='wf-doc-check'),    'document-check',  'Customs file CF-2026-0231 checked',                  '1 document still pending — Insurance Certificate',                                       'CF-2026-0231', now() - interval '2 minutes'),
  ((select id from automation_workflows where reference='wf-delay-risk'),   'risk-flag',       'Shipment AL-2026-1048 flagged as delay risk',        'Customs inspection extended past SLA window',                                            'AL-2026-1048', now() - interval '14 minutes'),
  ((select id from automation_workflows where reference='wf-quote-prep'),   'quote-prepared',  'Quote Q-2026-0512 prepared for review',              'Export · 40HC · FOB · Antwerp → Istanbul Ambarli · Insurance: Yes · VGM: Yes',           'Q-2026-0512',  now() - interval '31 minutes'),
  ((select id from automation_workflows where reference='wf-email-draft'),  'email-draft',     'Incoming email summarized and reply draft prepared', 'Demir Industrial Trading — ETA update request for AL-2026-1048',                          'AL-2026-1048', now() - interval '48 minutes'),
  ((select id from automation_workflows where reference='wf-task-rules'),   'warehouse-route', 'Warehouse Zone C capacity warning routed',           'Routed to Operations — 92% occupancy',                                                    'ZONE-C',       now() - interval '1 hour'),
  ((select id from automation_workflows where reference='wf-task-rules'),   'task-created',    'Task created for Customs',                           'Follow up on CMR document for AL-2026-1041',                                              'AL-2026-1041', now() - interval '1 hour');

-- ---------------------------------------------------------------------
-- dashboard_settings (org defaults)
-- ---------------------------------------------------------------------
insert into dashboard_settings (scope, user_id, key, value) values
  ('org', null, 'company',          '{"name":"Altun Logistics NV","address":"Paul Smekensplein 4 bus 301, 2000 Antwerpen, Belgium","operationsContact":"info@altunlogistics.be","vatNumber":""}'::jsonb),
  ('org', null, 'notifications',    '{"dailyDigest":true,"customsSlaAlerts":true,"etaShift":true,"quotes":true,"quoteApproved":true,"warehouseCapacity":false}'::jsonb),
  ('org', null, 'documentWorkflow', '{"blockOnMissingDocs":true,"autoCompletenessCheck":true,"showCrossTradeLane":true,"hideDeliveredShipments":false}'::jsonb);
