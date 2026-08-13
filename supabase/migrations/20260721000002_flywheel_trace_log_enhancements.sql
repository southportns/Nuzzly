-- Phase: Flywheel Data Collection Pipeline (Phase 4.1)
-- Purpose: 为 counterfactual_estimates 表新增 trace_id 字段，便于 predictionAccuracy 反查 recommendation_trace_log

-- 1. counterfactual_estimates 新增 trace_id 字段
ALTER TABLE pflid.counterfactual_estimates
  ADD COLUMN IF NOT EXISTS trace_id uuid;

CREATE INDEX IF NOT EXISTS idx_cf_estimates_trace
  ON pflid.counterfactual_estimates(trace_id);

-- 2. recommendation_trace_log.feature_snapshot 加 COMMENT 明确飞轮契约
COMMENT ON COLUMN public.recommendation_trace_log.feature_snapshot IS
  '飞轮 ETL 输入快照。必须包含: product_id, strategy_id, segment_key。可选飞轮字段: banditConfidence, segmentAlignment, outcomeClarity, predictionAccuracy, attributionConfidence, outcomeStability, horizonAgreement, adverseEventRate, rollbackRate';

COMMENT ON COLUMN public.recommendation_trace_log.input_features IS
  '推荐输入特征快照，包含 pet/query/top_product_ids/top_scores，用于后续 batch job 反查';
