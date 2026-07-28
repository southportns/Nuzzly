-- 自由对话历史记录表改造
-- 用途：让健康咨询历史记录也能用于无宠物的自由对话场景

-- 创建表（如果不存在），pet_id 设为可选
CREATE TABLE IF NOT EXISTS health_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  model_used text,
  report_id uuid REFERENCES ai_health_reports(id) ON DELETE SET NULL,
  context_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 幂等：确保 pet_id 列允许为空，兼容自由对话场景
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_chat_sessions' AND column_name = 'pet_id'
  ) THEN
    ALTER TABLE health_chat_sessions ALTER COLUMN pet_id DROP NOT NULL;
  END IF;
END $$;

-- 索引：加速按用户查询历史记录
CREATE INDEX IF NOT EXISTS idx_health_chat_sessions_profile_created
  ON health_chat_sessions(profile_id, created_at DESC);

-- 启用 RLS
ALTER TABLE health_chat_sessions ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看自己的记录
CREATE POLICY "users_read_own_chat_history" ON health_chat_sessions
  FOR SELECT USING (auth.uid() = profile_id);

-- 策略：用户只能插入自己的记录
CREATE POLICY "users_insert_own_chat_history" ON health_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 策略：用户只能更新自己的记录
CREATE POLICY "users_update_own_chat_history" ON health_chat_sessions
  FOR UPDATE USING (auth.uid() = profile_id);

-- 策略：用户只能删除自己的记录
CREATE POLICY "users_delete_own_chat_history" ON health_chat_sessions
  FOR DELETE USING (auth.uid() = profile_id);
