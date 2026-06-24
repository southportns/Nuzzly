-- Phase 4.5: Trust Architecture Refactoring
-- Non-causal explainability, anti-manipulation reputation, CIR, time-decay risk, audit trail

-- 1. RECOMMENDATION TRACE LOG (Decision Provenance)
-- =============================================
CREATE TABLE public.recommendation_trace_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id          uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  model_version   text NOT NULL DEFAULT 'pettrust-v4.5',
  feature_snapshot jsonb NOT NULL DEFAULT '{}',
  user_segment    text,
  data_sources    text[] NOT NULL DEFAULT '{}',
  decision_graph  jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trace_session ON public.recommendation_trace_log(session_id);
CREATE INDEX idx_trace_profile ON public.recommendation_trace_log(profile_id, created_at DESC);

ALTER TABLE public.recommendation_trace_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trace_read_own" ON public.recommendation_trace_log
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- 2. REFACTORED score_breakdown() — 3-layer: model_attribution + evidence_support + negative_signals
-- =============================================
CREATE OR REPLACE FUNCTION public.score_breakdown(
  p_product_id uuid,
  p_pet_id uuid
)
RETURNS jsonb AS $$
DECLARE
  score_data jsonb;
  dims jsonb;
  overall numeric(3,1);
  stomach_raw numeric(3,1);
  stool_raw numeric(3,1);
  stability_raw numeric(3,1);
  repurchase_raw numeric(3,1);
  breed_raw numeric(3,1);
  model_attr jsonb;
  evidence_items jsonb;
  neg_signals jsonb;
  total_rev_cnt integer;
  followup_cnt integer;
  breed_cnt integer;
  cir_rate numeric(5,3);
  cir_severity text;
  conf integer;
BEGIN
  score_data := public.score_product_for_pet(p_product_id, p_pet_id);
  dims := score_data->'dimensions';

  overall := (dims->>'overall_rating')::numeric;
  stomach_raw := (dims->>'stomach_match')::numeric;
  stool_raw := (dims->>'stool_safety')::numeric;
  stability_raw := (dims->>'long_term_stability')::numeric;
  repurchase_raw := (dims->>'repurchase_rate')::numeric;
  breed_raw := (dims->>'breed_match')::numeric;

  -- LAYER 1: model_attribution (statistical weights, NOT causal)
  model_attr := jsonb_build_object(
    'disclaimer', '此分解仅表示统计权重分配，不代表因果关系。各因子贡献值由预设权重乘以归一化指标得分计算。',
    'factors', jsonb_build_array(
      jsonb_build_object('factor', '综合评分', 'label', '社区总体评价', 'raw_score', overall, 'weight_pct', 20, 'contribution', ROUND((overall * 4.0)::numeric, 1), 'max_contribution', 20),
      jsonb_build_object('factor', '肠胃匹配', 'label', '肠胃敏感宠物适配', 'raw_score', stomach_raw, 'weight_pct', 25, 'contribution', ROUND((stomach_raw * 5.0)::numeric, 1), 'max_contribution', 25),
      jsonb_build_object('factor', '排便安全', 'label', '软便风险反比指标', 'raw_score', stool_raw, 'weight_pct', 20, 'contribution', ROUND((stool_raw * 4.0)::numeric, 1), 'max_contribution', 20),
      jsonb_build_object('factor', '长期稳定', 'label', '评分波动性反比指标', 'raw_score', stability_raw, 'weight_pct', 15, 'contribution', ROUND((stability_raw * 3.0)::numeric, 1), 'max_contribution', 15),
      jsonb_build_object('factor', '复购意愿', 'label', '用户报告复购率', 'raw_score', repurchase_raw, 'weight_pct', 10, 'contribution', ROUND((repurchase_raw * 2.0)::numeric, 1), 'max_contribution', 10),
      jsonb_build_object('factor', '品种适配', 'label', '同品种宠物评价', 'raw_score', breed_raw, 'weight_pct', 10, 'contribution', ROUND((breed_raw * 2.0)::numeric, 1), 'max_contribution', 10)
    )
  );

  -- Stats for evidence
  SELECT COUNT(*) INTO total_rev_cnt FROM public.product_reviews WHERE product_id = p_product_id;
  SELECT COUNT(*) INTO followup_cnt
  FROM public.review_followup_entries e
  JOIN public.review_followup_schedules s ON e.schedule_id = s.id
  JOIN public.product_reviews r ON s.review_id = r.id WHERE r.product_id = p_product_id;
  SELECT COUNT(DISTINCT public.normalize_breed(pet.breed)) INTO breed_cnt
  FROM public.product_reviews r JOIN public.pets pet ON r.pet_id = pet.id
  WHERE r.product_id = p_product_id AND pet.breed IS NOT NULL;

  -- LAYER 2: evidence_support (only statistically meaningful data, n>=3)
  evidence_items := jsonb_build_array();

  IF total_rev_cnt >= 3 THEN
    evidence_items := evidence_items || jsonb_build_object(
      'data_point', total_rev_cnt || '条用户评价',
      'observed_value', '平均评分 ' || COALESCE(overall::text, 'N/A') || '/5',
      'statistical_note', CASE WHEN total_rev_cnt >= 30 THEN '样本量充足' WHEN total_rev_cnt >= 10 THEN '样本量中等' ELSE '样本量有限，结论需谨慎' END
    );
  END IF;

  IF followup_cnt >= 3 THEN
    evidence_items := evidence_items || jsonb_build_object(
      'data_point', followup_cnt || '条长期追踪记录',
      'observed_value', '长期稳定性评分 ' || COALESCE(stability_raw::text, 'N/A') || '/5',
      'statistical_note', CASE WHEN followup_cnt >= 50 THEN '追踪深度充足' WHEN followup_cnt >= 15 THEN '追踪深度中等' ELSE '追踪数据有限' END
    );
  END IF;

  IF breed_cnt >= 2 THEN
    evidence_items := evidence_items || jsonb_build_object(
      'data_point', breed_cnt || '个品种有评价数据',
      'observed_value', '品种适配评分 ' || COALESCE(breed_raw::text, 'N/A') || '/5',
      'statistical_note', CASE WHEN breed_cnt >= 5 THEN '品种覆盖良好' ELSE '品种覆盖有限' END
    );
  END IF;

  -- LAYER 3: negative_signals (risk flags, independent of model score)
  neg_signals := jsonb_build_array();

  -- Check for Critical Incident Rate
  SELECT COUNT(*) FILTER (WHERE
    (r.stool_rating <= 1 AND (r.review_text ILIKE '%拉稀%' OR r.review_text ILIKE '%腹泻%'
      OR r.review_text ILIKE '%呕吐%' OR r.review_text ILIKE '%过敏%'))
    OR (r.overall_rating <= 2 AND r.would_repurchase = false)
  )::float / NULLIF(COUNT(*), 0) INTO cir_rate
  FROM public.product_reviews r WHERE r.product_id = p_product_id;

  cir_severity := CASE
    WHEN cir_rate > 0.15 THEN 'high'
    WHEN cir_rate > 0.10 THEN 'medium'
    WHEN cir_rate > 0.05 THEN 'low'
    ELSE NULL END;

  IF cir_severity IS NOT NULL THEN
    neg_signals := neg_signals || jsonb_build_object(
      'signal', '严重负反馈率：' || ROUND((cir_rate * 100)::numeric, 1)::text || '%',
      'severity', cir_severity,
      'source', '来自评价数据中的严重负反馈信号（低分+不良反应关键词）',
      'actionable', true
    );
  END IF;

  -- Active risk events signal
  IF (score_data->>'risk_count')::integer > 0 THEN
    neg_signals := neg_signals || jsonb_build_object(
      'signal', (score_data->>'risk_count')::text || '个活跃风险事件',
      'severity', CASE WHEN (score_data->>'risk_count')::integer >= 3 THEN 'high' ELSE 'medium' END,
      'source', '风险事件追踪系统',
      'actionable', true
    );
  END IF;

  -- Stool safety warning
  IF stool_raw < 2.5 THEN
    neg_signals := neg_signals || jsonb_build_object(
      'signal', '排便安全指标偏低（' || stool_raw::text || '/5），肠胃敏感宠物需谨慎',
      'severity', CASE WHEN stool_raw < 1.5 THEN 'high' ELSE 'medium' END,
      'source', '基于社区评价中的软便反馈率统计',
      'actionable', true
    );
  END IF;

  -- Stability warning
  IF stability_raw < 2.5 THEN
    neg_signals := neg_signals || jsonb_build_object(
      'signal', '长期稳定性偏低（' || stability_raw::text || '/5），产品质量可能存在波动',
      'severity', CASE WHEN stability_raw < 1.5 THEN 'high' ELSE 'low' END,
      'source', '基于长期追踪数据的评分波动分析',
      'actionable', false
    );
  END IF;

  conf := public.compute_product_confidence(p_product_id);

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'pet_id', p_pet_id,
    'total_score', score_data->'score',
    'dimensions', dims,
    -- 3-layer structure
    'model_attribution', model_attr,
    'evidence_support', COALESCE(evidence_items, '[]'::jsonb),
    'negative_signals', COALESCE(neg_signals, '[]'::jsonb),
    -- Meta
    'breed', score_data->'breed',
    'stomach_health', score_data->'stomach_health',
    'product_confidence', conf,
    'risk_count', score_data->'risk_count'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. REFACTORED compute_user_reputation() — anti-manipulation
-- =============================================
CREATE OR REPLACE FUNCTION public.compute_user_reputation(p_profile_id uuid)
RETURNS integer AS $$
DECLARE
  avg_trust numeric(5,2);
  followup_rate numeric(5,2);
  pet_completeness integer;
  behavior integer;
  -- NEW: anti-manipulation
  consistency numeric(5,2);
  diversity numeric(5,2);
  crowd_alignment numeric(5,2);
  manipulation_penalty integer;
  score integer;
  review_stddev numeric(5,2);
  distinct_brands integer;
  distinct_cats integer;
  user_avg numeric(5,2);
  crowd_avg numeric(5,2);
  rapid_posts integer;
  flagged boolean;
BEGIN
  -- explicit_quality (60%)
  SELECT AVG(review_trust_score)::numeric(5,2) INTO avg_trust
  FROM public.product_reviews WHERE profile_id = p_profile_id;

  SELECT CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*)
    ELSE 0 END INTO followup_rate
  FROM public.review_followup_schedules WHERE profile_id = p_profile_id;

  SELECT pet_profile_completeness, behavior_score, is_flagged INTO pet_completeness, behavior, flagged
  FROM public.profiles WHERE id = p_profile_id;

  -- consistency_score (10%): lower stddev = more consistent
  SELECT STDDEV(overall_rating)::numeric(5,2) INTO review_stddev
  FROM public.product_reviews WHERE profile_id = p_profile_id;
  consistency := CASE
    WHEN review_stddev IS NULL THEN 100
    WHEN review_stddev > 2.0 THEN 30
    WHEN review_stddev > 1.5 THEN 60
    ELSE 100 END;

  -- diversity_score (10%): evaluate across brands and categories
  SELECT COUNT(DISTINCT p.brand), COUNT(DISTINCT p.category_id)
  INTO distinct_brands, distinct_cats
  FROM public.product_reviews r
  JOIN public.products p ON r.product_id = p.id
  WHERE r.profile_id = p_profile_id;
  diversity := CASE
    WHEN distinct_brands >= 5 AND distinct_cats >= 3 THEN 100
    WHEN distinct_brands >= 3 THEN 70
    WHEN distinct_brands >= 2 THEN 40
    ELSE 20 END;

  -- crowd_alignment (10%): distance from population mean
  SELECT AVG(overall_rating)::numeric(5,2) INTO user_avg
  FROM public.product_reviews WHERE profile_id = p_profile_id;
  SELECT AVG(overall_rating)::numeric(5,2) INTO crowd_avg
  FROM public.product_reviews;

  crowd_alignment := CASE
    WHEN user_avg IS NULL OR crowd_avg IS NULL THEN 50
    WHEN ABS(user_avg - crowd_avg) < 0.8 THEN 100
    WHEN ABS(user_avg - crowd_avg) < 1.5 THEN 60
    ELSE 30 END;

  -- manipulation_penalty (max -20%)
  manipulation_penalty := 0;

  -- Rapid posting: 3+ reviews within 5 minutes
  SELECT COUNT(*) INTO rapid_posts
  FROM (
    SELECT id, created_at,
      LAG(created_at) OVER (ORDER BY created_at) AS prev_time
    FROM public.product_reviews WHERE profile_id = p_profile_id
  ) sub WHERE EXTRACT(EPOCH FROM (created_at - prev_time)) < 300;
  IF rapid_posts >= 2 THEN manipulation_penalty := manipulation_penalty + 30; END IF;

  -- Flagged status penalty
  IF flagged THEN manipulation_penalty := manipulation_penalty + 20; END IF;

  -- Final computation
  score := ROUND(
    (COALESCE(avg_trust, 0) * 0.35 + COALESCE(followup_rate, 0) * 100 * 0.25) +  -- explicit_quality (60%)
    COALESCE(consistency, 0) * 0.10 +                                              -- consistency (10%)
    COALESCE(diversity, 0) * 0.10 +                                                -- diversity (10%)
    COALESCE(crowd_alignment, 0) * 0.10 +                                          -- crowd_alignment (10%)
    COALESCE(behavior, 100) * 0.10 -                                                -- behavior (10%)
    LEAST(20, manipulation_penalty)                                                  -- manipulation penalty
  );

  score := LEAST(100, GREATEST(0, score));

  UPDATE public.profiles
  SET trust_score = score, updated_at = now()
  WHERE id = p_profile_id;

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers, recreate
DROP TRIGGER IF EXISTS after_review_insert_reputation ON public.product_reviews;
DROP TRIGGER IF EXISTS after_followup_entry_reputation ON public.review_followup_entries;

CREATE TRIGGER after_review_insert_reputation
  AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recompute_reputation();

CREATE TRIGGER after_followup_entry_reputation
  AFTER INSERT ON public.review_followup_entries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recompute_reputation();

-- 4. REFACTORED compute_product_confidence() — with Critical Incident Rate
-- =============================================
CREATE OR REPLACE FUNCTION public.compute_product_confidence(p_product_id uuid)
RETURNS integer AS $$
DECLARE
  review_cnt integer;
  followup_cnt integer;
  breed_cnt integer;
  recent_ratio numeric(5,2);
  avg_trust numeric(5,2);
  cir_rate numeric(5,3);
  sample_score numeric(5,2);
  depth_score numeric(5,2);
  breed_score numeric(5,2);
  fresh_score numeric(5,2);
  review_trust_score numeric(5,2);
  cir_score numeric(5,2);
  total integer;
BEGIN
  SELECT COUNT(*) INTO review_cnt FROM public.product_reviews WHERE product_id = p_product_id;

  SELECT COUNT(*) INTO followup_cnt
  FROM public.review_followup_entries e
  JOIN public.review_followup_schedules s ON e.schedule_id = s.id
  JOIN public.product_reviews r ON s.review_id = r.id WHERE r.product_id = p_product_id;

  SELECT COUNT(DISTINCT public.normalize_breed(pet.breed)) INTO breed_cnt
  FROM public.product_reviews r JOIN public.pets pet ON r.pet_id = pet.id
  WHERE r.product_id = p_product_id AND pet.breed IS NOT NULL;

  SELECT CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days')::float / COUNT(*)
    ELSE 0 END INTO recent_ratio
  FROM public.product_reviews WHERE product_id = p_product_id;

  SELECT AVG(review_trust_score)::numeric(5,2) INTO avg_trust
  FROM public.product_reviews WHERE product_id = p_product_id;

  -- Critical Incident Rate: severe negative feedback ratio
  SELECT COUNT(*) FILTER (WHERE
    (r.stool_rating <= 1 AND (r.review_text ILIKE '%拉稀%' OR r.review_text ILIKE '%腹泻%'
      OR r.review_text ILIKE '%呕吐%' OR r.review_text ILIKE '%过敏%'))
    OR (r.overall_rating <= 2 AND r.would_repurchase = false)
  )::float / NULLIF(COUNT(*), 0) INTO cir_rate
  FROM public.product_reviews r WHERE r.product_id = p_product_id;

  -- Sub-scores (0-1)
  sample_score := LEAST(1.0, review_cnt::float / 30.0);
  depth_score := LEAST(1.0, followup_cnt::float / 50.0);
  breed_score := LEAST(1.0, breed_cnt::float / 5.0);
  fresh_score := COALESCE(recent_ratio, 0);
  review_trust_score := COALESCE(avg_trust, 0) / 100.0;

  -- CIR score: 1.0 = no critical incidents, decreases as CIR grows
  cir_score := CASE
    WHEN cir_rate IS NULL OR cir_rate = 0 THEN 1.0
    WHEN cir_rate > 0.15 THEN 0.2
    WHEN cir_rate > 0.10 THEN 0.5
    WHEN cir_rate > 0.05 THEN 0.7
    ELSE 0.85 END;

  -- Weighted total (new weights with CIR at 20%)
  total := ROUND((
    sample_score * 20 +
    depth_score * 20 +
    breed_score * 15 +
    fresh_score * 10 +
    review_trust_score * 15 +
    cir_score * 20
  ));

  RETURN LEAST(100, GREATEST(0, total));
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. REFACTORED get_risk_intelligence() — time-decay model
-- =============================================
CREATE OR REPLACE FUNCTION public.get_risk_intelligence(p_product_id uuid)
RETURNS jsonb AS $$
DECLARE
  anomalies jsonb;
  risk_events jsonb;
  stability_grade text;
  risk_index integer;
  long_term_stability numeric;
  recent_stool numeric;
  risk_trend text;
  recent_spike boolean;
  risk_timeline jsonb;
  time_decayed_score numeric(5,1);
  recent_30_sum numeric(5,1);
  prev_30_sum numeric(5,1);
  lambda numeric := 0.0077016;  -- ln(2)/90, half-life 90 days
BEGIN
  anomalies := public.detect_risk_anomalies(p_product_id);

  -- Time-decayed risk events
  SELECT jsonb_agg(t.* ORDER BY t.event_date DESC)
  INTO risk_events
  FROM (
    SELECT
      re.id, re.title, re.severity, re.event_type, re.event_date,
      re.report_count, re.trend, re.resolved,
      ROUND(
        (CASE re.severity
          WHEN 'critical' THEN 1.0
          WHEN 'high' THEN 0.7
          WHEN 'medium' THEN 0.4
          ELSE 0.2
        END * EXP(-lambda * EXTRACT(DAYS FROM (now() - re.event_date::timestamptz))))::numeric,
        3
      ) AS time_weighted_score
    FROM public.risk_events re
    WHERE re.product_id = p_product_id
  ) t;

  -- Compute time-decayed total risk
  SELECT COALESCE(SUM(tw.time_weighted_score), 0) INTO time_decayed_score
  FROM (
    SELECT
      (CASE severity WHEN 'critical' THEN 1.0 WHEN 'high' THEN 0.7 WHEN 'medium' THEN 0.4 ELSE 0.2 END
       * EXP(-lambda * EXTRACT(DAYS FROM (now() - event_date::timestamptz)))) AS time_weighted_score
    FROM public.risk_events WHERE product_id = p_product_id AND resolved = false
  ) tw;

  -- Risk trend: compare recent 30d vs previous 30d
  SELECT COALESCE(SUM(
    CASE severity WHEN 'critical' THEN 1.0 WHEN 'high' THEN 0.7 WHEN 'medium' THEN 0.4 ELSE 0.2 END), 0)
  INTO recent_30_sum
  FROM public.risk_events
  WHERE product_id = p_product_id AND event_date >= CURRENT_DATE - 30;

  SELECT COALESCE(SUM(
    CASE severity WHEN 'critical' THEN 1.0 WHEN 'high' THEN 0.7 WHEN 'medium' THEN 0.4 ELSE 0.2 END), 0)
  INTO prev_30_sum
  FROM public.risk_events
  WHERE product_id = p_product_id AND event_date >= CURRENT_DATE - 60 AND event_date < CURRENT_DATE - 30;

  risk_trend := CASE
    WHEN recent_30_sum > prev_30_sum + 0.3 THEN 'rising'
    WHEN recent_30_sum < prev_30_sum - 0.3 THEN 'improving'
    ELSE 'stable' END;

  -- Recent spike: >2 new events in last 14 days
  SELECT COUNT(*) >= 3 INTO recent_spike
  FROM public.risk_events
  WHERE product_id = p_product_id AND event_date >= CURRENT_DATE - 14;

  -- Monthly risk timeline (last 6 months)
  SELECT jsonb_agg(t.* ORDER BY t.month)
  INTO risk_timeline
  FROM (
    SELECT
      to_char(date_trunc('month', d::date), 'YYYY-MM') AS month,
      ROUND(
        COALESCE(SUM(
          CASE re.severity WHEN 'critical' THEN 1.0 WHEN 'high' THEN 0.7 WHEN 'medium' THEN 0.4 ELSE 0.2 END
          * EXP(-lambda * EXTRACT(DAYS FROM (date_trunc('month', CURRENT_DATE) - date_trunc('month', re.event_date::timestamptz))))
        ), 0)::numeric,
        2
      ) AS monthly_risk_score,
      COUNT(re.id) AS event_count
    FROM generate_series(CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE, '1 month') AS d
    LEFT JOIN public.risk_events re ON re.product_id = p_product_id
      AND date_trunc('month', re.event_date::date) = date_trunc('month', d::date)
    GROUP BY date_trunc('month', d::date)
  ) t;

  -- Stability metrics
  SELECT AVG(long_term_stability_score)::numeric(3,1),
         AVG(stool_issue_rate)::numeric(5,3)
  INTO long_term_stability, recent_stool
  FROM public.product_metrics_daily
  WHERE product_id = p_product_id AND date >= CURRENT_DATE - 60;

  stability_grade := CASE
    WHEN long_term_stability >= 4.0 THEN 'A'
    WHEN long_term_stability >= 3.0 THEN 'B'
    WHEN long_term_stability >= 2.0 THEN 'C'
    ELSE 'D' END;

  risk_index := ROUND(GREATEST(0, LEAST(100,
    (100 - COALESCE(long_term_stability * 20, 0)) +
    COALESCE(recent_stool * 100, 0) * 2 +
    COALESCE(time_decayed_score * 20, 0)
  )));

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'risk_index', risk_index,
    'stability_grade', stability_grade,
    'long_term_stability', long_term_stability,
    'recent_stool_rate', recent_stool,
    'risk_trend', risk_trend,
    'recent_spike', recent_spike,
    'time_decayed_risk_score', ROUND(time_decayed_score, 2),
    'anomalies', anomalies,
    'risk_events', COALESCE(risk_events, '[]'::jsonb),
    'risk_timeline', COALESCE(risk_timeline, '[]'::jsonb),
    'analyzed_at', now()
  );
END;
$$ LANGUAGE plpgsql STABLE;
