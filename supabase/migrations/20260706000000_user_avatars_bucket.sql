-- =============================================
-- 20260706000000_user_avatars_bucket.sql
-- 用户资料头像存储桶（user-avatars）
-- 背景:iOS 端编辑资料上传头像调用了 supabase.storage.from('avatars'),
--      但历史上没有创建过这个 bucket,导致上传一直 Bucket not found。
--      宠物头像用 pet-avatars,这里把用户/资料头像独立出来。
-- =============================================

-- 1. 创建公开 bucket:5MB,仅 jpeg/png/webp/gif
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 公开读(头像 URL 走匿名访问,跟 pet-avatars 一致)
DROP POLICY IF EXISTS "user_avatars_select_public" ON storage.objects;
CREATE POLICY "user_avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

-- 3. INSERT:必须写到自己的 folder
--    路径约定:user-avatars/{auth.uid()}/avatar.{ext}
DROP POLICY IF EXISTS "user_avatars_insert_own" ON storage.objects;
CREATE POLICY "user_avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. UPDATE:owner 才能覆盖自己的头像
DROP POLICY IF EXISTS "user_avatars_update_own" ON storage.objects;
CREATE POLICY "user_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. DELETE:owner 才能删
DROP POLICY IF EXISTS "user_avatars_delete_own" ON storage.objects;
CREATE POLICY "user_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
