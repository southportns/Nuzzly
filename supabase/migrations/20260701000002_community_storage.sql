-- =============================================
-- 20260701000002_community_storage.sql
-- 社区板块：community-posts Storage bucket + RLS
-- =============================================

-- 创建社区帖子图片存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('community-posts', 'community-posts', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 所有人可读社区帖子图片（公开内容）
CREATE POLICY "community_posts_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-posts');

-- 已登录用户可上传到自己的文件夹
CREATE POLICY "community_posts_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 用户可删除自己上传的图片
CREATE POLICY "community_posts_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
