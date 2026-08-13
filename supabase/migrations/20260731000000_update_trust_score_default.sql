-- =============================================
-- Update trust_score default from 0 to 50
-- =============================================
-- 背景: profiles.trust_score 列默认值为 0, 新用户注册后信用分为 0。
--       社区发帖 RPC (create_community_post) 中 trust_score <= 0 会被直接拒绝,
--       导致新用户无法发帖, 形成死循环（不能发帖→没互动→信用分不涨→不能发帖）。
-- 方案: 将列默认值改为 50, 同时将现有 trust_score=0 的用户批量更新到 50。
--       50 > 0 → 可以发帖（不被拒绝）
--       50 < 60 → 帖子进入待审核状态（合理，不自动通过）
-- =============================================

-- 1. 修改列默认值
ALTER TABLE public.profiles
  ALTER COLUMN trust_score SET DEFAULT 50;

-- 2. 将现有 trust_score = 0 的用户更新为 50
--    （只更新确认为 0 的用户，避免覆盖已被信誉系统计算过的低分用户）
UPDATE public.profiles
SET trust_score = 50, updated_at = now()
WHERE trust_score = 0;

-- 3. 更新 handle_new_user trigger，显式设置 trust_score = 50
--    作为 belt-and-suspenders，即使列默认值被意外改回，trigger 也能保证新用户拿到 50 分
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username  text;
  v_display   text;
  v_candidate text;
  v_suffix    text;
  v_attempts  int := 0;
BEGIN
  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    split_part(NEW.email, '@', 1)
  );
  v_display := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    v_username
  );

  v_candidate := v_username;
  WHILE v_attempts < 5 LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, display_name, avatar_url, trust_score)
      VALUES (
        NEW.id,
        v_candidate,
        v_display,
        NEW.raw_user_meta_data->>'avatar_url',
        50
      );
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      v_suffix := substr(NEW.id::text, 1, 6) || floor(random() * 1000)::text;
      v_candidate := substr(v_username, 1, 14) || '_' || v_suffix;
    END;
  END LOOP;

  -- 兜底: 5 次仍冲突, 直接用 auth.uid() 做 username
  INSERT INTO public.profiles (id, username, display_name, avatar_url, trust_score)
  VALUES (
    NEW.id,
    'user_' || substr(NEW.id::text, 1, 12),
    v_display,
    NEW.raw_user_meta_data->>'avatar_url',
    50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
