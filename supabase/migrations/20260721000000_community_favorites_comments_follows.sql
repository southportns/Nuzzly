-- =============================================
-- 20260721000000_community_favorites_comments_follows.sql
-- 社区扩展：收藏、评论、关注 + 计数列 + RLS + trigger
-- =============================================

-- 1. 在 community_posts 上补充收藏数和评论数
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

-- =============================================
-- 2. community_favorites 收藏表
-- =============================================
CREATE TABLE IF NOT EXISTS public.community_favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- =============================================
-- 3. community_comments 评论表
-- =============================================
CREATE TABLE IF NOT EXISTS public.community_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) <= 2000),
  is_deleted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 4. community_follows 关注表
-- =============================================
CREATE TABLE IF NOT EXISTS public.community_follows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- =============================================
-- 5. 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_community_favorites_post     ON public.community_favorites(post_id);
CREATE INDEX IF NOT EXISTS idx_community_favorites_profile  ON public.community_favorites(profile_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post      ON public.community_comments(post_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_community_comments_profile   ON public.community_comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_follower   ON public.community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following  ON public.community_follows(following_id);

-- =============================================
-- 6. RLS 启用
-- =============================================
ALTER TABLE public.community_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. RLS 策略
-- =============================================

-- 收藏：所有人可读；用户只能操作自己的
DROP POLICY IF EXISTS "community_favorites_read" ON public.community_favorites;
CREATE POLICY "community_favorites_read" ON public.community_favorites
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "community_favorites_insert_own" ON public.community_favorites;
CREATE POLICY "community_favorites_insert_own" ON public.community_favorites
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "community_favorites_delete_own" ON public.community_favorites;
CREATE POLICY "community_favorites_delete_own" ON public.community_favorites
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- 评论：已审核帖子下未删除的评论可读；作者可读自己的；用户只能写自己的
DROP POLICY IF EXISTS "community_comments_read" ON public.community_comments;
CREATE POLICY "community_comments_read" ON public.community_comments
  FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.community_posts
      WHERE id = community_comments.post_id
        AND is_deleted = false
        AND review_status IN ('approved', 'auto_approved')
    )
  );

DROP POLICY IF EXISTS "community_comments_read_own" ON public.community_comments;
CREATE POLICY "community_comments_read_own" ON public.community_comments
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "community_comments_insert_own" ON public.community_comments;
CREATE POLICY "community_comments_insert_own" ON public.community_comments
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "community_comments_update_own" ON public.community_comments;
CREATE POLICY "community_comments_update_own" ON public.community_comments
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "community_comments_delete_own" ON public.community_comments;
CREATE POLICY "community_comments_delete_own" ON public.community_comments
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- 关注：所有人可读；用户只能操作自己的
DROP POLICY IF EXISTS "community_follows_read" ON public.community_follows;
CREATE POLICY "community_follows_read" ON public.community_follows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "community_follows_insert_own" ON public.community_follows;
CREATE POLICY "community_follows_insert_own" ON public.community_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "community_follows_delete_own" ON public.community_follows;
CREATE POLICY "community_follows_delete_own" ON public.community_follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- 管理员对上述三张表拥有全部权限
DROP POLICY IF EXISTS "community_favorites_admin_all" ON public.community_favorites;
CREATE POLICY "community_favorites_admin_all" ON public.community_favorites
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "community_comments_admin_all" ON public.community_comments;
CREATE POLICY "community_comments_admin_all" ON public.community_comments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "community_follows_admin_all" ON public.community_follows;
CREATE POLICY "community_follows_admin_all" ON public.community_follows
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 8. 收藏计数 trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.community_favorites_count_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET favorites_count = favorites_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_community_favorite_change ON public.community_favorites;
CREATE TRIGGER after_community_favorite_change
  AFTER INSERT OR DELETE ON public.community_favorites
  FOR EACH ROW EXECUTE FUNCTION public.community_favorites_count_change();

-- =============================================
-- 9. 评论计数 trigger（insert / delete / 软删除状态变更）
-- =============================================
CREATE OR REPLACE FUNCTION public.community_comments_count_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = NEW.post_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_community_comment_change ON public.community_comments;
CREATE TRIGGER after_community_comment_change
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_comments_count_change();
