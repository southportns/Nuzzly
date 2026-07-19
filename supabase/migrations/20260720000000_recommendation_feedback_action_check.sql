-- Phase P2: 数据安全修复 — recommendation_feedback.action CHECK 约束 + 索引
-- 限制 action 字段取值为 ('accept', 'reject', 'purchased', 'bookmarked')，防止脏数据写入。
-- 注意：本 migration 会替换原有约束（取值 'viewed'/'accepted'/'purchased'/'rejected'/'ignored'）。
-- 表为空时安全；如已有旧数据，需先执行数据迁移：
--   UPDATE recommendation_feedback SET action = 'accept'    WHERE action = 'accepted';
--   UPDATE recommendation_feedback SET action = 'reject'    WHERE action = 'rejected';
--   UPDATE recommendation_feedback SET action = 'bookmarked' WHERE action IN ('viewed', 'ignored');
--   DELETE FROM recommendation_feedback WHERE action NOT IN ('accept', 'reject', 'purchased', 'bookmarked');

-- 1. CHECK 约束（DROP IF EXISTS + ADD，确保取值正确）
ALTER TABLE public.recommendation_feedback
  DROP CONSTRAINT IF EXISTS recommendation_feedback_action_check;

ALTER TABLE public.recommendation_feedback
  ADD CONSTRAINT recommendation_feedback_action_check
  CHECK (action IN ('accept', 'reject', 'purchased', 'bookmarked'));

-- 2. 索引 (幂等：若已存在则跳过)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_recommendation_feedback_action'
      AND schemaname = 'public'
      AND tablename = 'recommendation_feedback'
  ) THEN
    CREATE INDEX idx_recommendation_feedback_action
      ON public.recommendation_feedback(action);
  END IF;
END $$;
