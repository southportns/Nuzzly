-- =============================================
-- Pet RWD Strategy Learning Layer v3
-- Strategy Performance Tracking & Learning
-- =============================================

-- 1. NEW TABLES
-- =============================================

-- 1.1 strategy_performance_log (策略执行记录)
CREATE TABLE public.strategy_performance_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  strategy_type     text NOT NULL,
  execution_path    text NOT NULL,

  -- 执行结果
  outcome_score     numeric(3,2) CHECK (outcome_score >= 0 AND outcome_score <= 1),
  user_feedback     numeric(3,2) CHECK (user_feedback >= 0 AND user_feedback <= 1),
  execution_quality numeric(3,2) CHECK (execution_quality >= 0 AND execution_quality <= 1),
  correctness_score numeric(3,2) CHECK (correctness_score >= 0 AND correctness_score <= 1),

  -- 上下文快照
  context_snapshot  jsonb DEFAULT '{}',

  -- 元数据
  execution_time_ms integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 1.2 strategy_scores (策略评分)
CREATE TABLE public.strategy_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_type     text NOT NULL UNIQUE,

  -- 评分指标
  performance_score numeric(5,3) NOT NULL DEFAULT 0.5,
  usage_count       integer NOT NULL DEFAULT 0,
  success_count     integer NOT NULL DEFAULT 0,
  success_rate      numeric(5,3) NOT NULL DEFAULT 0.5,

  -- 趋势
  score_trend       text DEFAULT 'stable' CHECK (score_trend IN ('improving', 'stable', 'declining')),
  last_score_change numeric(5,3) DEFAULT 0,

  -- 元数据
  last_used_at      timestamptz,
  last_updated      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 1.3 strategy_learning_config (学习配置)
CREATE TABLE public.strategy_learning_config (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key        text NOT NULL UNIQUE,
  config_value      jsonb NOT NULL,
  description       text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. INDEXES
-- =============================================

CREATE INDEX idx_strategy_performance_pet ON public.strategy_performance_log(pet_id, created_at DESC);
CREATE INDEX idx_strategy_performance_type ON public.strategy_performance_log(strategy_type, created_at DESC);
CREATE INDEX idx_strategy_performance_score ON public.strategy_performance_log(outcome_score DESC);

CREATE INDEX idx_strategy_scores_type ON public.strategy_scores(strategy_type);
CREATE INDEX idx_strategy_scores_score ON public.strategy_scores(performance_score DESC);

-- 3. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.strategy_performance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_learning_config ENABLE ROW LEVEL SECURITY;

-- Read access
CREATE POLICY "strategy_performance_read_auth" ON public.strategy_performance_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "strategy_scores_read_auth" ON public.strategy_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "strategy_config_read_auth" ON public.strategy_learning_config
  FOR SELECT TO authenticated USING (true);

-- 4. 初始化策略评分
-- =============================================

INSERT INTO public.strategy_scores (strategy_type, performance_score, usage_count, success_count, success_rate) VALUES
  ('data_driven', 0.6, 0, 0, 0.5),
  ('memory_driven', 0.5, 0, 0, 0.5),
  ('anomaly_focused', 0.55, 0, 0, 0.5),
  ('trend_analysis', 0.5, 0, 0, 0.5),
  ('quick_response', 0.65, 0, 0, 0.5),
  ('deep_analysis', 0.5, 0, 0, 0.5);

-- 5. 初始化学习配置
-- =============================================

INSERT INTO public.strategy_learning_config (config_key, config_value, description) VALUES
  ('learning_rate', '{"value": 0.1}', '学习率：新结果对历史分数的影响权重'),
  ('min_sample_size', '{"value": 5}', '最小样本数：低于此数量不调整权重'),
  ('success_threshold', '{"value": 0.6}', '成功阈值：outcome_score >= 此值视为成功'),
  ('weight_adjustment_high', '{"value": 0.1}', '高表现策略权重增加量'),
  ('weight_adjustment_low', '{"value": -0.2}', '低表现策略权重减少量'),
  ('performance_threshold_high', '{"value": 0.8}', '高表现阈值'),
  ('performance_threshold_low', '{"value": 0.5}', '低表现阈值');

-- 6. HELPER FUNCTIONS
-- =============================================

-- 6.1 记录策略执行结果
CREATE OR REPLACE FUNCTION public.log_strategy_performance(
  p_pet_id uuid,
  p_strategy_type text,
  p_execution_path text,
  p_outcome_score numeric,
  p_user_feedback numeric DEFAULT NULL,
  p_execution_quality numeric DEFAULT NULL,
  p_correctness_score numeric DEFAULT NULL,
  p_context_snapshot jsonb DEFAULT '{}',
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.strategy_performance_log (
    pet_id, strategy_type, execution_path,
    outcome_score, user_feedback, execution_quality, correctness_score,
    context_snapshot, execution_time_ms
  ) VALUES (
    p_pet_id, p_strategy_type, p_execution_path,
    p_outcome_score, p_user_feedback,
    COALESCE(p_execution_quality, p_outcome_score),
    COALESCE(p_correctness_score, p_outcome_score),
    p_context_snapshot, p_execution_time_ms
  )
  RETURNING id INTO v_log_id;

  -- 异步更新策略评分
  PERFORM public.update_strategy_score(p_strategy_type, p_outcome_score);

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 6.2 更新策略评分
CREATE OR REPLACE FUNCTION public.update_strategy_score(
  p_strategy_type text,
  p_outcome_score numeric
)
RETURNS void AS $$
DECLARE
  v_current record;
  v_learning_rate numeric;
  v_success_threshold numeric;
  v_new_score numeric;
  v_new_success_count integer;
  v_new_usage_count integer;
  v_new_success_rate numeric;
  v_score_trend text;
  v_score_change numeric;
BEGIN
  -- 获取学习率
  SELECT (config_value->>'value')::numeric INTO v_learning_rate
  FROM public.strategy_learning_config
  WHERE config_key = 'learning_rate';

  -- 获取成功阈值
  SELECT (config_value->>'value')::numeric INTO v_success_threshold
  FROM public.strategy_learning_config
  WHERE config_key = 'success_threshold';

  v_learning_rate := COALESCE(v_learning_rate, 0.1);
  v_success_threshold := COALESCE(v_success_threshold, 0.6);

  -- 获取当前评分
  SELECT * INTO v_current
  FROM public.strategy_scores
  WHERE strategy_type = p_strategy_type;

  IF v_current IS NULL THEN
    -- 初始化
    INSERT INTO public.strategy_scores (
      strategy_type, performance_score, usage_count, success_count, success_rate,
      last_used_at, last_updated
    ) VALUES (
      p_strategy_type, p_outcome_score, 1,
      CASE WHEN p_outcome_score >= v_success_threshold THEN 1 ELSE 0 END,
      p_outcome_score, now(), now()
    );
    RETURN;
  END IF;

  -- 计算新分数 (指数移动平均)
  v_new_score := v_current.performance_score * (1 - v_learning_rate) + p_outcome_score * v_learning_rate;

  -- 更新计数
  v_new_usage_count := v_current.usage_count + 1;
  v_new_success_count := v_current.success_count + CASE WHEN p_outcome_score >= v_success_threshold THEN 1 ELSE 0 END;
  v_new_success_rate := v_new_success_count::numeric / v_new_usage_count;

  -- 计算趋势
  v_score_change := v_new_score - v_current.performance_score;
  IF v_score_change > 0.05 THEN
    v_score_trend := 'improving';
  ELSIF v_score_change < -0.05 THEN
    v_score_trend := 'declining';
  ELSE
    v_score_trend := 'stable';
  END IF;

  -- 更新评分
  UPDATE public.strategy_scores
  SET
    performance_score = ROUND(v_new_score, 3),
    usage_count = v_new_usage_count,
    success_count = v_new_success_count,
    success_rate = ROUND(v_new_success_rate, 3),
    score_trend = v_score_trend,
    last_score_change = ROUND(v_score_change, 3),
    last_used_at = now(),
    last_updated = now()
  WHERE strategy_type = p_strategy_type;
END;
$$ LANGUAGE plpgsql;

-- 6.3 获取策略权重
CREATE OR REPLACE FUNCTION public.get_strategy_weights()
RETURNS TABLE(strategy_type text, weight numeric, performance_score numeric, usage_count integer) AS $$
DECLARE
  v_high_threshold numeric;
  v_low_threshold numeric;
  v_high_adjustment numeric;
  v_low_adjustment numeric;
  v_min_sample integer;
BEGIN
  -- 获取配置
  SELECT (config_value->>'value')::numeric INTO v_high_threshold
  FROM public.strategy_learning_config WHERE config_key = 'performance_threshold_high';

  SELECT (config_value->>'value')::numeric INTO v_low_threshold
  FROM public.strategy_learning_config WHERE config_key = 'performance_threshold_low';

  SELECT (config_value->>'value')::numeric INTO v_high_adjustment
  FROM public.strategy_learning_config WHERE config_key = 'weight_adjustment_high';

  SELECT (config_value->>'value')::numeric INTO v_low_adjustment
  FROM public.strategy_learning_config WHERE config_key = 'weight_adjustment_low';

  SELECT (config_value->>'value')::integer INTO v_min_sample
  FROM public.strategy_learning_config WHERE config_key = 'min_sample_size';

  v_high_threshold := COALESCE(v_high_threshold, 0.8);
  v_low_threshold := COALESCE(v_low_threshold, 0.5);
  v_high_adjustment := COALESCE(v_high_adjustment, 0.1);
  v_low_adjustment := COALESCE(v_low_adjustment, -0.2);
  v_min_sample := COALESCE(v_min_sample, 5);

  RETURN QUERY
  SELECT
    s.strategy_type,
    CASE
      WHEN s.usage_count >= v_min_sample AND s.performance_score >= v_high_threshold
        THEN 1.0 + v_high_adjustment
      WHEN s.usage_count >= v_min_sample AND s.performance_score < v_low_threshold
        THEN 1.0 + v_low_adjustment
      ELSE 1.0
    END as weight,
    s.performance_score,
    s.usage_count
  FROM public.strategy_scores s
  ORDER BY s.performance_score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6.4 获取策略统计
CREATE OR REPLACE FUNCTION public.get_strategy_stats(p_strategy_type text)
RETURNS TABLE(
  strategy_type text,
  performance_score numeric,
  usage_count integer,
  success_rate numeric,
  score_trend text,
  avg_outcome numeric,
  avg_execution_time numeric,
  recent_performance numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.strategy_type,
    s.performance_score,
    s.usage_count,
    s.success_rate,
    s.score_trend,
    COALESCE(AVG(p.outcome_score), 0) as avg_outcome,
    COALESCE(AVG(p.execution_time_ms), 0) as avg_execution_time,
    COALESCE(
      (SELECT AVG(outcome_score)
       FROM public.strategy_performance_log
       WHERE strategy_type = p_strategy_type
         AND created_at >= now() - interval '7 days'),
      0
    ) as recent_performance
  FROM public.strategy_scores s
  LEFT JOIN public.strategy_performance_log p ON s.strategy_type = p.strategy_type
  WHERE s.strategy_type = p_strategy_type
  GROUP BY s.strategy_type, s.performance_score, s.usage_count, s.success_rate, s.score_trend;
END;
$$ LANGUAGE plpgsql STABLE;
