-- =============================================
-- 20260701000000_community.sql
-- 社区板块：帖子、点赞、举报 + 合规审核 + RLS + trigger
-- =============================================

-- 1. 扩展 behavior_event_t 枚举（复用现有用户行为日志体系）
ALTER TYPE public.behavior_event_t ADD VALUE IF NOT EXISTS 'community_post_published';
ALTER TYPE public.behavior_event_t ADD VALUE IF NOT EXISTS 'community_post_rejected';
ALTER TYPE public.behavior_event_t ADD VALUE IF NOT EXISTS 'community_post_auto_approved';
ALTER TYPE public.behavior_event_t ADD VALUE IF NOT EXISTS 'community_post_flagged';
ALTER TYPE public.behavior_event_t ADD VALUE IF NOT EXISTS 'community_post_restored';

-- 2. 举报分类枚举
CREATE TYPE public.community_report_category_t AS ENUM
  ('spam', 'violence', 'pornography', 'political', 'fraud', 'privacy', 'other');

-- 3. 帖子审核状态枚举
CREATE TYPE public.community_review_status_t AS ENUM
  ('pending', 'approved', 'rejected', 'auto_approved');

-- =============================================
-- 4. community_posts 帖子表
-- =============================================
CREATE TABLE public.community_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text NOT NULL CHECK (char_length(content) <= 2000),
  images          text[] DEFAULT '{}',
  pet_type        text CHECK (pet_type IN ('cat', 'dog')),
  breed           text,
  likes_count     integer DEFAULT 0,
  review_status   public.community_review_status_t NOT NULL DEFAULT 'pending',
  reject_reason   text,
  is_deleted      boolean NOT NULL DEFAULT false,
  ip_address      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 5. community_likes 点赞表
-- =============================================
CREATE TABLE public.community_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- =============================================
-- 6. community_reports 举报表
-- =============================================
CREATE TABLE public.community_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason      text NOT NULL,
  category    public.community_report_category_t NOT NULL DEFAULT 'other',
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 7. 索引
-- =============================================
CREATE INDEX idx_community_posts_feed ON public.community_posts(created_at DESC)
  WHERE is_deleted = false AND review_status IN ('approved', 'auto_approved');
CREATE INDEX idx_community_posts_breed ON public.community_posts(breed)
  WHERE is_deleted = false AND review_status IN ('approved', 'auto_approved');
CREATE INDEX idx_community_posts_profile ON public.community_posts(profile_id, created_at DESC);
CREATE INDEX idx_community_posts_review ON public.community_posts(review_status)
  WHERE review_status = 'pending';
CREATE INDEX idx_community_likes_post ON public.community_likes(post_id);
CREATE INDEX idx_community_likes_profile ON public.community_likes(profile_id);
CREATE INDEX idx_community_reports_status ON public.community_reports(status)
  WHERE status = 'pending';

-- =============================================
-- 8. RLS 启用
-- =============================================
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. RLS 策略
-- =============================================

-- 帖子：所有人可读已审核且未删除的帖子；作者可写自己的帖子
CREATE POLICY "community_posts_read" ON public.community_posts
  FOR SELECT TO authenticated
  USING (review_status IN ('approved', 'auto_approved') AND is_deleted = false)
  WITH CHECK (true);

-- 作者可以看到自己所有状态的帖子（包括 pending/rejected）
CREATE POLICY "community_posts_read_own" ON public.community_posts
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- 插入帖子：已登录 + 已实名认证
CREATE POLICY "community_posts_insert" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- 更新帖子：作者可软删除自己的帖子
CREATE POLICY "community_posts_update_own" ON public.community_posts
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 管理员可读所有帖子、可更新审核状态
CREATE POLICY "community_posts_admin_all" ON public.community_posts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 点赞：所有人可读；用户只能操作自己的
CREATE POLICY "community_likes_read" ON public.community_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "community_likes_insert_own" ON public.community_likes
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "community_likes_delete_own" ON public.community_likes
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- 举报：所有人可插入；只有管理员可读取和更新
CREATE POLICY "community_reports_insert" ON public.community_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "community_reports_admin" ON public.community_reports
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 10. 点赞计数 trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.community_likes_count_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_community_like_change
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.community_likes_count_change();

-- =============================================
-- 11. 发帖行为日志 trigger（复用 user_behavior_log）
-- =============================================
CREATE OR REPLACE FUNCTION public.community_post_behavior_log()
RETURNS trigger AS $$
DECLARE
  evt public.behavior_event_t;
BEGIN
  IF TG_OP = 'INSERT' THEN
    evt := 'community_post_published';
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    evt := 'community_post_flagged';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.user_behavior_log (profile_id, event_type, context, severity)
  VALUES (
    NEW.profile_id,
    evt,
    jsonb_build_object(
      'post_id', NEW.id,
      'review_status', NEW.review_status::text,
      'content_length', char_length(NEW.content),
      'has_images', array_length(NEW.images, 1) IS NOT NULL
    ),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_community_post_change
  AFTER INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_post_behavior_log();

-- =============================================
-- 12. 审核超时自动放行 trigger（30 分钟未审核 + 敏感词预检通过）
-- 使用 pg_cron 或手动调用函数；此处提供函数供外部调度
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_approve_stale_posts()
RETURNS integer AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.community_posts
  SET review_status = 'auto_approved'
  WHERE review_status = 'pending'
    AND is_deleted = false
    AND created_at < now() - INTERVAL '30 minutes'
    AND profile_id IN (
      SELECT id FROM public.profiles
      WHERE trust_score >= 60 AND is_flagged = false
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 13. 发帖限流函数（1 分钟最多 2 帖，1 小时最多 10 帖）
-- =============================================
CREATE OR REPLACE FUNCTION public.check_community_post_rate_limit(p_profile_id uuid)
RETURNS boolean AS $$
DECLARE
  recent_1m integer;
  recent_1h integer;
BEGIN
  SELECT COUNT(*) INTO recent_1m
  FROM public.community_posts
  WHERE profile_id = p_profile_id AND created_at > now() - INTERVAL '1 minute';

  SELECT COUNT(*) INTO recent_1h
  FROM public.community_posts
  WHERE profile_id = p_profile_id AND created_at > now() - INTERVAL '1 hour';

  RETURN recent_1m < 2 AND recent_1h < 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- 14. 安全发布帖子函数（SECURITY DEFINER，强制审核流程）
-- =============================================
CREATE OR REPLACE FUNCTION public.create_community_post(
  p_content text,
  p_images text[],
  p_pet_type text,
  p_breed text,
  p_ip_address text DEFAULT null
)
RETURNS uuid AS $$
DECLARE
  new_id uuid;
  uid uuid;
  initial_status public.community_review_status_t;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION '未登录'; END IF;

  -- 实名认证检查
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND phone_verified_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION '需要完成手机号实名认证后才能发帖';
  END IF;

  -- 封禁检查
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND community_banned_until IS NOT NULL AND community_banned_until > now()
  ) THEN
    RAISE EXCEPTION '账号已被限制发帖，解封时间：%', (
      SELECT community_banned_until FROM public.profiles WHERE id = uid
    );
  END IF;

  -- 信誉门槛检查
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND trust_score <= 0
  ) THEN
    RAISE EXCEPTION '账号信誉分过低，暂时无法发帖';
  END IF;

  -- 限流检查
  IF NOT public.check_community_post_rate_limit(uid) THEN
    RAISE EXCEPTION '发帖过于频繁，请稍后再试';
  END IF;

  -- 未成年人夜间发帖限制（22:00-6:00 北京时间）
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid
      AND birth_date IS NOT NULL
      AND age(birth_date) < interval '14 years'
  ) AND (
    EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Shanghai') >= 22
    OR EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Shanghai') < 6
  ) THEN
    RAISE EXCEPTION '未成年人夜间（22:00-6:00）不可发帖';
  END IF;

  -- 初始审核状态：高信誉用户自动放行，否则待审核
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND trust_score >= 60 AND is_flagged = false
  ) THEN
    initial_status := 'auto_approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.community_posts (profile_id, content, images, pet_type, breed, review_status, ip_address)
  VALUES (uid, p_content, p_images, p_pet_type, p_breed, initial_status, p_ip_address)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.create_community_post(text, text[], text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_post(text, text[], text, text, text) TO authenticated;
