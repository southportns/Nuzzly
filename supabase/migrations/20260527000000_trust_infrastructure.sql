-- Phase 4: Trust & Intelligence Infrastructure
-- User reputation, product confidence, explainable scoring, feedback loop, risk dashboard

-- 1. RECOMMENDATION FEEDBACK TABLE
-- =============================================
CREATE TABLE public.recommendation_feedback (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recommendation_id text,
  action            text NOT NULL CHECK (action IN ('viewed', 'accepted', 'purchased', 'rejected', 'ignored')),
  rating            integer CHECK (rating >= 1 AND rating <= 5),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reco_feedback_profile ON public.recommendation_feedback(profile_id, created_at DESC);
CREATE INDEX idx_reco_feedback_product ON public.recommendation_feedback(product_id, action);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_own" ON public.recommendation_feedback
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "feedback_read_own" ON public.recommendation_feedback
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- 2. COMPUTE USER REPUTATION SCORE
-- =============================================
CREATE OR REPLACE FUNCTION public.compute_user_reputation(p_profile_id uuid)
RETURNS integer AS $$
DECLARE
  avg_trust numeric(5,2);
  followup_rate numeric(5,2);
  pet_completeness integer;
  behavior integer;
  score integer;
BEGIN
  -- Avg review trust score (35%)
  SELECT AVG(review_trust_score)::numeric(5,2) INTO avg_trust
  FROM public.product_reviews WHERE profile_id = p_profile_id;

  -- Followup completion rate (30%)
  SELECT CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*)
    ELSE 0 END INTO followup_rate
  FROM public.review_followup_schedules WHERE profile_id = p_profile_id;

  -- Pet profile completeness (15%)
  SELECT pet_profile_completeness INTO pet_completeness
  FROM public.profiles WHERE id = p_profile_id;

  -- Behavior score (20%)
  SELECT behavior_score INTO behavior
  FROM public.profiles WHERE id = p_profile_id;

  score := ROUND(
    COALESCE(avg_trust, 0) * 0.35 +
    COALESCE(followup_rate, 0) * 100 * 0.30 +
    COALESCE(pet_completeness, 0) * 0.15 +
    COALESCE(behavior, 100) * 0.20
  );

  UPDATE public.profiles
  SET trust_score = LEAST(100, GREATEST(0, score)),
      updated_at = now()
  WHERE id = p_profile_id;

  RETURN LEAST(100, GREATEST(0, score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: recompute on new review
CREATE OR REPLACE FUNCTION public.trigger_recompute_reputation()
RETURNS trigger AS $$
BEGIN
  PERFORM public.compute_user_reputation(NEW.profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_review_insert_reputation
  AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recompute_reputation();

CREATE TRIGGER after_followup_entry_reputation
  AFTER INSERT ON public.review_followup_entries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recompute_reputation();

-- 3. COMPUTE PRODUCT CONFIDENCE SCORE
-- =============================================
CREATE OR REPLACE FUNCTION public.compute_product_confidence(p_product_id uuid)
RETURNS integer AS $$
DECLARE
  review_cnt integer;
  followup_cnt integer;
  breed_cnt integer;
  recent_ratio numeric(5,2);
  avg_trust numeric(5,2);
  sample_score numeric(5,2);
  depth_score numeric(5,2);
  breed_score numeric(5,2);
  fresh_score numeric(5,2);
  trust_score numeric(5,2);
  total integer;
BEGIN
  -- Sample size: review count
  SELECT COUNT(*) INTO review_cnt FROM public.product_reviews WHERE product_id = p_product_id;

  -- Longitudinal depth: followup entries count
  SELECT COUNT(*) INTO followup_cnt
  FROM public.review_followup_entries e
  JOIN public.review_followup_schedules s ON e.schedule_id = s.id
  JOIN public.product_reviews r ON s.review_id = r.id
  WHERE r.product_id = p_product_id;

  -- Breed coverage: distinct breeds
  SELECT COUNT(DISTINCT public.normalize_breed(pet.breed)) INTO breed_cnt
  FROM public.product_reviews r
  JOIN public.pets pet ON r.pet_id = pet.id
  WHERE r.product_id = p_product_id AND pet.breed IS NOT NULL;

  -- Data freshness: reviews in last 30 days / total
  SELECT CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days')::float / COUNT(*)
    ELSE 0 END INTO recent_ratio
  FROM public.product_reviews WHERE product_id = p_product_id;

  -- Average review trust
  SELECT AVG(review_trust_score)::numeric(5,2) INTO avg_trust
  FROM public.product_reviews WHERE product_id = p_product_id;

  -- Calculate sub-scores (0-1 scale)
  sample_score := LEAST(1.0, review_cnt::float / 30.0);
  depth_score := LEAST(1.0, followup_cnt::float / 50.0);
  breed_score := LEAST(1.0, breed_cnt::float / 5.0);
  fresh_score := COALESCE(recent_ratio, 0);
  trust_score := COALESCE(avg_trust, 0) / 100.0;

  -- Weighted total (0-100)
  total := ROUND((
    sample_score * 25 +
    depth_score * 25 +
    breed_score * 20 +
    fresh_score * 15 +
    trust_score * 15
  ));

  RETURN LEAST(100, GREATEST(0, total));
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. SCORE BREAKDOWN (EXPLAINABLE AI)
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
  contributions jsonb;
  positives jsonb;
  negatives jsonb;
  evidence jsonb;
BEGIN
  score_data := public.score_product_for_pet(p_product_id, p_pet_id);
  dims := score_data->'dimensions';

  overall := (dims->>'overall_rating')::numeric;
  stomach_raw := (dims->>'stomach_match')::numeric;
  stool_raw := (dims->>'stool_safety')::numeric;
  stability_raw := (dims->>'long_term_stability')::numeric;
  repurchase_raw := (dims->>'repurchase_rate')::numeric;
  breed_raw := (dims->>'breed_match')::numeric;

  -- Factor contributions (raw * weight multiplier = points out of 100)
  contributions := jsonb_build_array(
    jsonb_build_object('factor', '综合评分', 'raw', overall, 'weight', 20, 'contribution', ROUND((overall * 4.0)::numeric, 1), 'icon', 'Star'),
    jsonb_build_object('factor', '肠胃匹配', 'raw', stomach_raw, 'weight', 25, 'contribution', ROUND((stomach_raw * 5.0)::numeric, 1), 'icon', 'Heart'),
    jsonb_build_object('factor', '排便安全', 'raw', stool_raw, 'weight', 20, 'contribution', ROUND((stool_raw * 4.0)::numeric, 1), 'icon', 'ShieldCheck'),
    jsonb_build_object('factor', '长期稳定', 'raw', stability_raw, 'weight', 15, 'contribution', ROUND((stability_raw * 3.0)::numeric, 1), 'icon', 'TrendingUp'),
    jsonb_build_object('factor', '复购率', 'raw', repurchase_raw, 'weight', 10, 'contribution', ROUND((repurchase_raw * 2.0)::numeric, 1), 'icon', 'RefreshCw'),
    jsonb_build_object('factor', '品种适配', 'raw', breed_raw, 'weight', 10, 'contribution', ROUND((breed_raw * 2.0)::numeric, 1), 'icon', 'Fingerprint')
  );

  -- Positive factors (dimensions scoring >= 3.5)
  SELECT jsonb_agg(jsonb_build_object('factor', f.factor, 'score', f.raw, 'detail', f.detail))
  INTO positives
  FROM (
    VALUES
      ('综合评分', overall, CASE WHEN overall >= 4.0 THEN '社区综合评价优秀' ELSE '社区评价良好' END),
      ('肠胃匹配', stomach_raw, CASE WHEN stomach_raw >= 4.0 THEN '肠胃敏感宠物适配度极高' WHEN stomach_raw >= 3.0 THEN '肠胃敏感宠物适配良好' ELSE NULL END),
      ('排便安全', stool_raw, CASE WHEN stool_raw >= 4.0 THEN '长期软便反馈率极低' WHEN stool_raw >= 3.0 THEN '软便反馈率较低' ELSE NULL END),
      ('长期稳定', stability_raw, CASE WHEN stability_raw >= 4.0 THEN '90天以上表现非常稳定' WHEN stability_raw >= 3.0 THEN '表现较为稳定' ELSE NULL END),
      ('品种适配', breed_raw, CASE WHEN breed_raw >= 4.0 THEN '同品种宠物高度适配' WHEN breed_raw >= 3.0 THEN '同品种宠物适配良好' ELSE NULL END)
  ) AS f(factor, raw, detail)
  WHERE f.raw >= 3.5;

  -- Negative factors (dimensions scoring < 2.5)
  SELECT jsonb_agg(jsonb_build_object('factor', f.factor, 'score', f.raw, 'detail', f.detail))
  INTO negatives
  FROM (
    VALUES
      ('综合评分', overall, '社区评分偏低，建议谨慎选择'),
      ('排便安全', stool_raw, '软便反馈率较高，肠胃敏感宠物需注意'),
      ('长期稳定', stability_raw, '长期表现波动较大'),
      ('品种适配', breed_raw, '同品种宠物反馈较少')
  ) AS f(factor, raw, detail)
  WHERE f.raw < 2.5;

  -- Evidence summary
  SELECT jsonb_build_object(
    'total_reviews', (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = p_product_id),
    'followup_entries', (SELECT COUNT(*) FROM public.review_followup_entries e
      JOIN public.review_followup_schedules s ON e.schedule_id = s.id
      JOIN public.product_reviews r ON s.review_id = r.id WHERE r.product_id = p_product_id),
    'breed_count', (SELECT COUNT(DISTINCT public.normalize_breed(pet.breed))
      FROM public.product_reviews r JOIN public.pets pet ON r.pet_id = pet.id
      WHERE r.product_id = p_product_id AND pet.breed IS NOT NULL),
    'product_confidence', public.compute_product_confidence(p_product_id)
  ) INTO evidence;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'pet_id', p_pet_id,
    'total_score', score_data->'score',
    'dimensions', dims,
    'contributions', COALESCE(contributions, '[]'::jsonb),
    'positive_factors', COALESCE(positives, '[]'::jsonb),
    'negative_factors', COALESCE(negatives, '[]'::jsonb),
    'evidence', evidence,
    'risk_count', score_data->'risk_count',
    'breed', score_data->'breed',
    'stomach_health', score_data->'stomach_health'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. VERSION IMPACT ANALYSIS
-- =============================================
CREATE OR REPLACE FUNCTION public.analyze_version_impact(p_product_id uuid)
RETURNS jsonb AS $$
DECLARE
  versions jsonb;
BEGIN
  SELECT jsonb_agg(v.* ORDER BY v.effective_date ASC) INTO versions
  FROM (
    SELECT
      pv.id, pv.version_name, pv.effective_date, pv.end_date,
      pv.is_current, pv.formula_changes,
      (SELECT AVG(r.overall_rating)::numeric(3,2)
       FROM public.product_reviews r
       WHERE r.product_version_id = pv.id) AS avg_rating_during_version,
      (SELECT COUNT(*) FROM public.product_reviews r WHERE r.product_version_id = pv.id) AS review_count_during_version,
      (SELECT AVG(m.stool_issue_rate)::numeric(5,3)
       FROM public.product_metrics_daily m
       WHERE m.product_id = p_product_id
         AND m.date BETWEEN pv.effective_date AND COALESCE(pv.end_date, CURRENT_DATE)) AS avg_stool_rate_during_version,
      (SELECT AVG(m.repurchase_rate)::numeric(5,3)
       FROM public.product_metrics_daily m
       WHERE m.product_id = p_product_id
         AND m.date BETWEEN pv.effective_date AND COALESCE(pv.end_date, CURRENT_DATE)) AS avg_repurchase_rate_during_version
    FROM public.product_versions pv
    WHERE pv.product_id = p_product_id
  ) v;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'version_count', jsonb_array_length(COALESCE(versions, '[]'::jsonb)),
    'versions', COALESCE(versions, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. RISK INTELLIGENCE AGGREGATOR (combines anomalies + events + stability grade)
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
BEGIN
  -- Get anomaly detection results
  anomalies := public.detect_risk_anomalies(p_product_id);

  -- Get active risk events
  SELECT jsonb_agg(jsonb_build_object(
    'id', re.id, 'title', re.title, 'severity', re.severity,
    'event_type', re.event_type, 'event_date', re.event_date,
    'report_count', re.report_count, 'trend', re.trend,
    'resolved', re.resolved
  ) ORDER BY re.event_date DESC)
  INTO risk_events
  FROM public.risk_events re
  WHERE re.product_id = p_product_id;

  -- Calculate stability grade from recent metrics
  SELECT AVG(long_term_stability_score)::numeric(3,1),
         AVG(stool_issue_rate)::numeric(5,3)
  INTO long_term_stability, recent_stool
  FROM public.product_metrics_daily
  WHERE product_id = p_product_id AND date >= CURRENT_DATE - 60;

  -- Grade: A (>=4.0), B (>=3.0), C (>=2.0), D (<2.0)
  stability_grade := CASE
    WHEN long_term_stability >= 4.0 THEN 'A'
    WHEN long_term_stability >= 3.0 THEN 'B'
    WHEN long_term_stability >= 2.0 THEN 'C'
    ELSE 'D'
  END;

  -- Risk index: lower is better (0-100, inverted)
  risk_index := ROUND(
    GREATEST(0, LEAST(100,
      (100 - COALESCE(long_term_stability * 20, 0)) +
      COALESCE(recent_stool * 100, 0) * 2 +
      COALESCE((SELECT COUNT(*) FROM public.risk_events WHERE product_id = p_product_id AND resolved = false) * 10, 0)
    ))
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'risk_index', risk_index,
    'stability_grade', stability_grade,
    'long_term_stability', long_term_stability,
    'recent_stool_rate', recent_stool,
    'anomalies', anomalies,
    'risk_events', COALESCE(risk_events, '[]'::jsonb),
    'analyzed_at', now()
  );
END;
$$ LANGUAGE plpgsql STABLE;
