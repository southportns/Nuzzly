-- =============================================
-- 20260722000000_community_security_hardening.sql
-- 社区安全加固: public_profiles view + third_party_audit_log + 评论审核 + 举报限流 + RPC 强化
-- =============================================

-- 0. 确保 pgcrypto 扩展可用(digest 函数用于计算 content sha256 hash)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- 1. public_profiles view —— 隔离 profiles 表敏感字段
--    暴露: id, username, display_name, avatar_url, bio, trust_score, user_number, created_at
--    隐藏: phone_verified_at, birth_date, community_banned_until, is_admin, is_flagged, flag_reason
-- =============================================
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  bio,
  trust_score,
  user_number,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- =============================================
-- 2. third_party_audit_log 表 —— 第三方审核调用日志
-- =============================================
CREATE TABLE IF NOT EXISTS public.third_party_audit_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  audit_type           text NOT NULL CHECK (audit_type IN ('text', 'image')),
  provider             text NOT NULL DEFAULT 'local',
  request_payload_hash text NOT NULL,
  response_label       text,
  response_passed      boolean NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_third_party_audit_log_profile
  ON public.third_party_audit_log(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_third_party_audit_log_hash
  ON public.third_party_audit_log(request_payload_hash);

ALTER TABLE public.third_party_audit_log ENABLE ROW LEVEL SECURITY;

-- 用户只能读自己的审核日志
DROP POLICY IF EXISTS "third_party_audit_log_read_own" ON public.third_party_audit_log;
CREATE POLICY "third_party_audit_log_read_own" ON public.third_party_audit_log
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- 管理员可读所有日志
DROP POLICY IF EXISTS "third_party_audit_log_admin_all" ON public.third_party_audit_log;
CREATE POLICY "third_party_audit_log_admin_all" ON public.third_party_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 注: 插入仅限 service_role (WriteGateway / 后端 API),anon 和 authenticated 均无权限
REVOKE ALL ON public.third_party_audit_log FROM anon, authenticated;
GRANT SELECT ON public.third_party_audit_log TO authenticated;

-- =============================================
-- 3. community_comments 增加审核状态字段
-- =============================================
ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS review_status public.community_review_status_t NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ip_address text;

-- 评论审核状态索引(管理员审核工作流)
CREATE INDEX IF NOT EXISTS idx_community_comments_review
  ON public.community_comments(review_status)
  WHERE review_status = 'pending';

-- =============================================
-- 4. community_reports 限流 —— 同一用户对同一帖子只能举报一次
-- =============================================
-- 删除已存在的重复举报(保留最早一条)
DELETE FROM public.community_reports a
USING public.community_reports b
WHERE a.id > b.id AND a.reporter_id = b.reporter_id AND a.post_id = b.post_id;

DROP INDEX IF EXISTS idx_community_reports_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reports_unique
  ON public.community_reports(reporter_id, post_id);

-- =============================================
-- 5. 评论审核状态枚举展示策略更新
--    RLS: 已审核通过的评论 + 帖子已审核的 + 自己的评论可见
-- =============================================
DROP POLICY IF EXISTS "community_comments_read" ON public.community_comments;
CREATE POLICY "community_comments_read" ON public.community_comments
  FOR SELECT TO authenticated
  USING (
    is_deleted = false
    AND review_status IN ('approved', 'auto_approved')
    AND EXISTS (
      SELECT 1 FROM public.community_posts
      WHERE id = community_comments.post_id
        AND is_deleted = false
        AND review_status IN ('approved', 'auto_approved')
    )
  );

-- 撤销直接 INSERT 权限,改走 RPC
REVOKE INSERT ON public.community_comments FROM authenticated;

-- =============================================
-- 6. 升级 create_community_post RPC —— 接收 audit_token + IP,强制验证审核
-- =============================================
CREATE OR REPLACE FUNCTION public.create_community_post(
  p_content text,
  p_images text[],
  p_pet_type text,
  p_breed text,
  p_audit_token uuid,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_id uuid;
  uid uuid;
  initial_status public.community_review_status_t;
  audit_row public.third_party_audit_log%ROWTYPE;
  payload_hash text;
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
    RAISE EXCEPTION '账号已被限制发帖，解封时间：%',
      (SELECT community_banned_until FROM public.profiles WHERE id = uid);
  END IF;

  -- 信誉门槛
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND trust_score <= 0
  ) THEN
    RAISE EXCEPTION '账号信誉分过低，暂时无法发帖';
  END IF;

  -- 限流
  IF NOT public.check_community_post_rate_limit(uid) THEN
    RAISE EXCEPTION '发帖过于频繁，请稍后再试';
  END IF;

  -- 未成年夜间保护
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

  -- 强制验证 audit_token
  -- 计算 content 的 sha256 与 audit_log 中的 hash 比对,确保审核的内容与发布的内容一致
  payload_hash := encode(digest(p_content, 'sha256'), 'hex');

  SELECT * INTO audit_row
  FROM public.third_party_audit_log
  WHERE id = p_audit_token
    AND profile_id = uid
    AND audit_type = 'text'
    AND request_payload_hash = payload_hash
    AND created_at > now() - INTERVAL '10 minutes';

  IF NOT FOUND THEN
    RAISE EXCEPTION '内容审核凭证无效或已过期，请重新提交';
  END IF;

  IF audit_row.response_passed = false THEN
    RAISE EXCEPTION '内容审核未通过';
  END IF;

  -- 初始审核状态:高信誉用户自动放行,否则待审核
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

-- 重新授权(覆盖旧签名)
REVOKE ALL ON FUNCTION public.create_community_post(text, text[], text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_post(text, text[], text, text, uuid, text) TO authenticated;

-- 删除旧签名的函数(避免参数歧义)
DROP FUNCTION IF EXISTS public.create_community_post(text, text[], text, text, text);

-- =============================================
-- 7. 新增 create_community_comment RPC —— 强制审核流程
-- =============================================
CREATE OR REPLACE FUNCTION public.create_community_comment(
  p_post_id uuid,
  p_content text,
  p_audit_token uuid,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_id uuid;
  uid uuid;
  initial_status public.community_review_status_t;
  audit_row public.third_party_audit_log%ROWTYPE;
  payload_hash text;
  recent_1m integer;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION '未登录'; END IF;

  -- 实名认证
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND phone_verified_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION '需要完成手机号实名认证后才能评论';
  END IF;

  -- 封禁检查
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND community_banned_until IS NOT NULL AND community_banned_until > now()
  ) THEN
    RAISE EXCEPTION '账号已被限制发言';
  END IF;

  -- 评论限流:1 分钟最多 5 条
  SELECT COUNT(*) INTO recent_1m
  FROM public.community_comments
  WHERE profile_id = uid AND created_at > now() - INTERVAL '1 minute';
  IF recent_1m >= 5 THEN
    RAISE EXCEPTION '评论过于频繁，请稍后再试';
  END IF;

  -- 帖子必须存在且已审核
  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE id = p_post_id
      AND is_deleted = false
      AND review_status IN ('approved', 'auto_approved')
  ) THEN
    RAISE EXCEPTION '帖子不存在或未审核';
  END IF;

  -- 强制验证 audit_token
  payload_hash := encode(digest(p_content, 'sha256'), 'hex');
  SELECT * INTO audit_row
  FROM public.third_party_audit_log
  WHERE id = p_audit_token
    AND profile_id = uid
    AND audit_type = 'text'
    AND request_payload_hash = payload_hash
    AND created_at > now() - INTERVAL '10 minutes';

  IF NOT FOUND THEN
    RAISE EXCEPTION '评论审核凭证无效或已过期，请重新提交';
  END IF;

  IF audit_row.response_passed = false THEN
    RAISE EXCEPTION '评论内容审核未通过';
  END IF;

  -- 评论初始状态:高信誉自动放行
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND trust_score >= 60 AND is_flagged = false
  ) THEN
    initial_status := 'auto_approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.community_comments (post_id, profile_id, content, review_status, ip_address)
  VALUES (p_post_id, uid, p_content, initial_status, p_ip_address)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.create_community_comment(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_comment(uuid, text, uuid, text) TO authenticated;
