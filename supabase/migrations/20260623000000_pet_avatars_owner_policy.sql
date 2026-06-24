-- Pet Avatars Storage Hardening
-- 背景:20260525160000_storage_buckets.sql 创建了 pet-avatars public bucket,
--      但 INSERT 策略只要求 authenticated,没限制 path 归属 = 任意登录用户可写到任意路径(越权上传覆盖)
-- 本迁移:补 owner 限制(path 第一段必须等于 auth.uid())
--         + 加 UPDATE/DELETE 策略
--         + 加 INSERT 时 pet_owner 二次校验(可选,profile 必须是上传者本人)

-- =============================================
-- 1. 删掉过宽的旧 INSERT 策略
-- =============================================
DROP POLICY IF EXISTS "avatars_insert_auth" ON storage.objects;

-- =============================================
-- 2. 新 INSERT 策略 — 必须写到自己的 folder
--    路径约定:pet-avatars/{profile_id}/{pet_id}.{ext}
-- =============================================
CREATE POLICY "pet_avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pet-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- 3. UPDATE / DELETE — 同样限定 owner
-- =============================================
CREATE POLICY "pet_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pet-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'pet-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pet_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pet-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- 4. 保留公开 SELECT(让公开头像 URL 仍能匿名访问)
--    已有 "avatars_select_public" 策略,无需新增
-- =============================================
