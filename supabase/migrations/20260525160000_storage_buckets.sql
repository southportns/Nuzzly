-- Phase 2: Storage Buckets Setup

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pet-avatars', 'pet-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('review-vouchers', 'review-vouchers', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-avatars' OR bucket_id = 'product-images');

CREATE POLICY "avatars_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pet-avatars' OR bucket_id = 'review-vouchers');

CREATE POLICY "vouchers_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'review-vouchers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vouchers_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-vouchers');
