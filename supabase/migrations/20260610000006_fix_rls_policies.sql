-- 修复 RLS 策略：允许 service_role 和函数对 timeline 表进行 INSERT/UPDATE

-- review_to_timeline: 允许 INSERT（用于 build_timeline_group）
DROP POLICY IF EXISTS "r2t_insert_service" ON pflid.review_to_timeline;
CREATE POLICY "r2t_insert_service" ON pflid.review_to_timeline
  FOR INSERT TO service_role WITH CHECK (true);

-- review_timeline_groups: 允许 INSERT/UPDATE（用于 build_timeline_group 和 backfill）
DROP POLICY IF EXISTS "tlg_insert_service" ON pflid.review_timeline_groups;
CREATE POLICY "tlg_insert_service" ON pflid.review_timeline_groups
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "tlg_update_service" ON pflid.review_timeline_groups;
CREATE POLICY "tlg_update_service" ON pflid.review_timeline_groups
  FOR UPDATE TO service_role USING (true);

-- review_timeline_events: 允许 INSERT（用于 AI 抽取）
DROP POLICY IF EXISTS "tle_insert_service" ON pflid.review_timeline_events;
CREATE POLICY "tle_insert_service" ON pflid.review_timeline_events
  FOR INSERT TO service_role WITH CHECK (true);

-- review_fingerprints: 允许 INSERT（用于去重检测）
DROP POLICY IF EXISTS "fp_insert_service" ON pflid.review_fingerprints;
CREATE POLICY "fp_insert_service" ON pflid.review_fingerprints
  FOR INSERT TO service_role WITH CHECK (true);
