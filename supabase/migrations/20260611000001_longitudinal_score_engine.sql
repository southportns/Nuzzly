-- =============================================
-- PFLID Phase 3: Longitudinal Score Engine
-- Timeline First Architecture — Product Scoring
-- =============================================
-- Replaces: score_product_for_pet() (Review-based weighted scoring)
-- Source of Truth: pflid.timeline_metrics_daily

-- 1. CALCULATE LONGITUDINAL SCORE
CREATE OR REPLACE FUNCTION pflid.calculate_longitudinal_score(
  p_product_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_metrics record;
  v_stability_score numeric(5,2);
  v_repurchase_score numeric(5,2);
  v_risk_score numeric(5,2);
  v_overall_score numeric(5,2);
  v_timeline_count integer;
  v_decay_curve jsonb;
BEGIN
  -- Get latest timeline metrics
  SELECT * INTO v_metrics
  FROM pflid.timeline_metrics_daily
  WHERE product_id = p_product_id
  ORDER BY stat_date DESC
  LIMIT 1;

  IF v_metrics IS NULL THEN
    RETURN jsonb_build_object(
      'product_id', p_product_id,
      'overall_score', 0,
      'stability_score', 0,
      'repurchase_score', 0,
      'risk_score', 0,
      'error', 'No timeline metrics available'
    );
  END IF;

  -- Stability Score (65% total)
  -- 30d: 20%, 90d: 25%, 180d: 20%
  v_stability_score := (
    COALESCE(v_metrics.day30_stability_rate, 0) * 0.20 / 100 +
    COALESCE(v_metrics.day90_stability_rate, 0) * 0.25 / 100 +
    COALESCE(v_metrics.day180_stability_rate, 0) * 0.20 / 100
  ) * 100;

  -- Repurchase Score (20%)
  v_repurchase_score := COALESCE(v_metrics.repurchase_rate, 0);

  -- Risk Score (10%) — inverse of symptom rates
  -- Lower symptom rate = higher risk score
  v_risk_score := GREATEST(0, 100 - (
    COALESCE(v_metrics.soft_stool_rate, 0) * 0.4 +
    COALESCE(v_metrics.vomiting_rate, 0) * 0.35 +
    COALESCE(v_metrics.black_chin_rate, 0) * 0.25
  ));

  -- Overall Score (weighted)
  -- stability 65% + repurchase 20% + risk 10% + trust 5%
  v_overall_score := (
    v_stability_score * 0.65 +
    v_repurchase_score * 0.20 +
    v_risk_score * 0.10 +
    COALESCE(v_metrics.trust_weighted_score, 50) * 0.05
  );

  -- Decay curve (lifecycle attenuation)
  SELECT jsonb_build_object(
    'month_1', COALESCE(v_metrics.day30_stability_rate, 0),
    'month_3', COALESCE(v_metrics.day90_stability_rate, 0),
    'month_6', COALESCE(v_metrics.day180_stability_rate, 0)
  ) INTO v_decay_curve;

  v_timeline_count := v_metrics.timeline_count;

  -- Scale to 0-100
  v_overall_score := GREATEST(0, LEAST(100, v_overall_score));
  v_stability_score := GREATEST(0, LEAST(100, v_stability_score));
  v_repurchase_score := GREATEST(0, LEAST(100, v_repurchase_score));
  v_risk_score := GREATEST(0, LEAST(100, v_risk_score));

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'overall_score', ROUND(v_overall_score, 1),
    'stability_score', ROUND(v_stability_score, 1),
    'repurchase_score', ROUND(v_repurchase_score, 1),
    'risk_score', ROUND(v_risk_score, 1),
    'timeline_count', v_timeline_count,
    'decay_curve', v_decay_curve,
    'trust_weighted_score', v_metrics.trust_weighted_score,
    'calculated_at', now()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. SCORE PRODUCT FOR PET (Timeline-based replacement)
-- Replaces: public.score_product_for_pet()
CREATE OR REPLACE FUNCTION pflid.score_product_for_pet_timeline(
  p_product_id uuid,
  p_pet_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_pet record;
  v_longitudinal jsonb;
  v_timeline_stats jsonb;
  v_breed_match numeric(3,1);
  v_symptom_penalty numeric(4,1);
  v_final_score numeric(4,1);
  v_dimensions jsonb;
  v_risk_count integer;
BEGIN
  -- Get pet profile
  SELECT breed, stomach_health, species INTO v_pet
  FROM public.pets WHERE id = p_pet_id;

  IF v_pet IS NULL THEN
    RETURN jsonb_build_object('error', 'Pet not found');
  END IF;

  -- Get longitudinal score
  v_longitudinal := pflid.calculate_longitudinal_score(p_product_id);

  -- Get timeline stats for symptom matching
  v_timeline_stats := pflid.get_product_timeline_stats(p_product_id);

  -- Breed match score (from breed_product_stats if available)
  SELECT COALESCE(avg_rating, (v_longitudinal->>'overall_score')::numeric) INTO v_breed_match
  FROM public.breed_product_stats
  WHERE product_id = p_product_id
    AND breed = public.normalize_breed(v_pet.breed)
  LIMIT 1;

  -- Symptom penalty for sensitive pets
  v_symptom_penalty := 0;
  IF v_pet.stomach_health IN ('sensitive', 'very_sensitive') THEN
    v_symptom_penalty := COALESCE((v_timeline_stats->>'day_90_soft_stool_rate')::numeric, 0) * 0.5;
  END IF;

  -- Count active risk events
  SELECT COUNT(*) INTO v_risk_count
  FROM public.risk_events
  WHERE product_id = p_product_id AND resolved = false;

  -- Final score calculation
  v_final_score := (
    (v_longitudinal->>'overall_score')::numeric * 0.60 +
    v_breed_match * 4.0 * 0.20 +
    COALESCE((v_longitudinal->>'risk_score')::numeric, 50) * 0.10 +
    COALESCE((v_longitudinal->>'trust_weighted_score')::numeric, 50) * 0.10
  ) - v_symptom_penalty - (v_risk_count * 5);

  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  v_dimensions := jsonb_build_object(
    'longitudinal_overall', (v_longitudinal->>'overall_score')::numeric,
    'stability_score', (v_longitudinal->>'stability_score')::numeric,
    'repurchase_score', (v_longitudinal->>'repurchase_score')::numeric,
    'risk_score', (v_longitudinal->>'risk_score')::numeric,
    'breed_match', v_breed_match,
    'symptom_penalty', v_symptom_penalty,
    'day30_stability', COALESCE((v_timeline_stats->>'day_30_positive_rate')::numeric, 0),
    'day90_soft_stool_rate', COALESCE((v_timeline_stats->>'day_90_soft_stool_rate')::numeric, 0),
    'day180_repurchase_rate', COALESCE((v_timeline_stats->>'day_180_repurchase_rate')::numeric, 0)
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'pet_id', p_pet_id,
    'score', ROUND(v_final_score, 1),
    'dimensions', v_dimensions,
    'risk_count', v_risk_count,
    'breed', public.normalize_breed(v_pet.breed),
    'stomach_health', v_pet.stomach_health,
    'scoring_method', 'timeline_longitudinal'
  );
END;
$$ LANGUAGE plpgsql STABLE;
