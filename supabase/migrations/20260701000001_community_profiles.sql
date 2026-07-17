-- =============================================
-- 20260701000001_community_profiles.sql
-- 社区板块：profiles 扩展字段（实名认证、未成年保护、封禁）
-- =============================================

-- 手机号实名认证时间
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- 出生日期（未成年保护）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date;

-- 社区封禁截止时间（NULL = 未封禁）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_banned_until timestamptz;

-- 索引：快速查找被封禁用户
CREATE INDEX IF NOT EXISTS idx_profiles_community_banned
  ON public.profiles(community_banned_until)
  WHERE community_banned_until IS NOT NULL;
