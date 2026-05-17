-- 0008_storage_bucket.sql
--
-- Creates the `shipment-documents` Supabase Storage bucket and the RLS
-- policies that allow authenticated operators to upload documents and
-- generate signed download URLs.
--
-- Bucket layout:
--   shipment-documents/{shipment_id}/{docCode}.pdf
--   e.g. shipment-documents/shp_001/BL.pdf
--
-- All policies are idempotent (guarded by DO $$ blocks).

-- ── Bucket ────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'shipment-documents',
  'shipment-documents',
  false,                  -- private; access via signed URLs only
  10485760,               -- 10 MB per file
  ARRAY[
    'application/pdf',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies on storage.objects ──────────────────────────────────────────

-- SELECT — authenticated users can read / generate signed URLs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'storage'
      AND  tablename  = 'objects'
      AND  policyname = 'Authenticated read shipment-documents'
  ) THEN
    CREATE POLICY "Authenticated read shipment-documents"
      ON storage.objects
      FOR SELECT
      TO  authenticated
      USING (bucket_id = 'shipment-documents');
  END IF;
END $$;

-- INSERT — authenticated users can upload new documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'storage'
      AND  tablename  = 'objects'
      AND  policyname = 'Authenticated insert shipment-documents'
  ) THEN
    CREATE POLICY "Authenticated insert shipment-documents"
      ON storage.objects
      FOR INSERT
      TO  authenticated
      WITH CHECK (bucket_id = 'shipment-documents');
  END IF;
END $$;

-- UPDATE — authenticated users can overwrite (upsert) existing documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'storage'
      AND  tablename  = 'objects'
      AND  policyname = 'Authenticated update shipment-documents'
  ) THEN
    CREATE POLICY "Authenticated update shipment-documents"
      ON storage.objects
      FOR UPDATE
      TO  authenticated
      USING     (bucket_id = 'shipment-documents')
      WITH CHECK (bucket_id = 'shipment-documents');
  END IF;
END $$;
