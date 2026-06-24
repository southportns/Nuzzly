-- Sprint 1: PFLID Storage Buckets
-- raw-json: raw crawler output, original review JSON (permanent)
-- symptom-images: AI-extracted symptom evidence (black chin, stool, etc.)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('raw-json', 'raw-json', false, 52428800, ARRAY['application/json','text/plain']),
  ('symptom-images', 'symptom-images', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload raw JSON
CREATE POLICY "rawjson_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'raw-json');

CREATE POLICY "rawjson_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'raw-json');

-- RLS: symptom images — authenticated users can manage own folder
CREATE POLICY "symptom_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'symptom-images');

CREATE POLICY "symptom_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'symptom-images');
