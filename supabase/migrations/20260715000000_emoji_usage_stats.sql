-- emoji 使用统计表：用于统计测试/内测期间各 emoji 使用频次，最终筛选出常用 emoji 清单
CREATE TABLE IF NOT EXISTS emoji_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji_name text NOT NULL,
  emoji_unicode text NOT NULL,
  context text, -- 使用场景，例如 ai-chat、dashboard、product-card
  source text,  -- 来源，例如 web、ios
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 按 emoji 名称聚合查询时常用
CREATE INDEX IF NOT EXISTS idx_emoji_usage_stats_name ON emoji_usage_stats(emoji_name);
CREATE INDEX IF NOT EXISTS idx_emoji_usage_stats_created_at ON emoji_usage_stats(created_at DESC);

-- 统计函数：按 emoji 分组统计使用次数
CREATE OR REPLACE FUNCTION get_emoji_usage_stats(p_limit int DEFAULT 50, p_context text DEFAULT NULL)
RETURNS TABLE(emoji_name text, emoji_unicode text, usage_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.emoji_name,
    e.emoji_unicode,
    count(*)::bigint AS usage_count
  FROM emoji_usage_stats e
  WHERE (p_context IS NULL OR e.context = p_context)
  GROUP BY e.emoji_name, e.emoji_unicode
  ORDER BY usage_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS：用户可插入自己的记录；匿名用户也能插入（profile_id 为空）
ALTER TABLE emoji_usage_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emoji_usage_stats_insert_own" ON emoji_usage_stats;
CREATE POLICY "emoji_usage_stats_insert_own"
  ON emoji_usage_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

DROP POLICY IF EXISTS "emoji_usage_stats_read_own" ON emoji_usage_stats;
CREATE POLICY "emoji_usage_stats_read_own"
  ON emoji_usage_stats
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "emoji_usage_stats_admin_all" ON emoji_usage_stats;
CREATE POLICY "emoji_usage_stats_admin_all"
  ON emoji_usage_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
