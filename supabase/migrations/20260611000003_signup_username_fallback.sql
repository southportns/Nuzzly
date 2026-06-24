-- =============================================
-- Signup username conflict fallback
-- =============================================
-- 背景:profiles.username UNIQUE NOT NULL,原 trigger 用 email 推 username,
--      当用户没传 username meta 时,split_part(email,'@',1) 可能跟历史用户撞名
--      → auth.signUp 整体失败。
-- 方案:trigger 内部捕获 unique_violation,自动加 6 位后缀重试;
--      仍失败则用 auth.uid() 兜底,绝不让 signUp 因 profile 失败。
-- =============================================

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
      INSERT INTO public.profiles (id, username, display_name, avatar_url)
      VALUES (
        NEW.id,
        v_candidate,
        v_display,
        NEW.raw_user_meta_data->>'avatar_url'
      );
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      v_suffix := substr(NEW.id::text, 1, 6) || floor(random() * 1000)::text;
      v_candidate := substr(v_username, 1, 14) || '_' || v_suffix;
    END;
  END LOOP;

  -- 兜底:5 次仍冲突,直接用 auth.uid() 段做 username(绝不让 signUp 失败)
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    'user_' || substr(NEW.id::text, 1, 12),
    v_display,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
