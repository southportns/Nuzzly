-- =============================================
-- PFLID Phase 3: Outcome Recommendation Engine
-- Timeline First Architecture — Outcome-based Food Recommendation
-- =============================================
-- Replaces: build_recommendation_context() + score_product_for_pet()
-- Source of Truth: pflid.timeline_metrics_daily + pflid.review_timeline_events

-- 1. MATCH OUTCOME FOR PET
-- Input: pet profile (breed, age, sterilized, sensitive_gut, symptoms)
-- Output: ranked products with outcome predictions
CREATE OR REPLACE FUNCTION pflid.match_outcome_for_pet(
  p_breed text,
  p_age numeric,
  p_sterilized boolean,
  p_sensitive_gut boolean,
  p_symptoms text[] DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  brand text,
  stability_rate numeric,
  soft_stool_risk numeric,
  black_chin_risk numeric,
  vomiting_risk numeric,
  repurchase_rate numeric,
  confidence numeric,
  matched_timelines integer,
  decay_curve jsonb,
  longitudinal_score numeric
) AS $$
DECLARE
  v_normalized_breed text;
BEGIN
  v_normalized_breed := pflid.normalize_breed(p_breed);

  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.brand,
    COALESCE(tm.day90_stability_rate, 50) AS stability_rate,
    COALESCE(tm.soft_stool_rate, 0) AS soft_stool_risk,
    COALESCE(tm.black_chin_rate, 0) AS black_chin_risk,
    COALESCE(tm.vomiting_rate, 0) AS vomiting_risk,
    COALESCE(tm.repurchase_rate, 0) AS repurchase_rate,
    -- Confidence: based on timeline count and data freshness
    LEAST(100,
      CASE
        WHEN tm.timeline_count >= 50 THEN 90
        WHEN tm.timeline_count >= 20 THEN 75
        WHEN tm.timeline_count >= 10 THEN 60
        WHEN tm.timeline_count >= 5 THEN 45
        ELSE 30
      END
      + CASE
        WHEN tm.stat_date >= CURRENT_DATE - 7 THEN 10
        WHEN tm.stat_date >= CURRENT_DATE - 30 THEN 5
        ELSE 0
      END
    ) AS confidence,
    tm.timeline_count AS matched_timelines,
    -- Decay curve from longitudinal score
    pflid.calculate_longitudinal_score(p.id)->'decay_curve' AS decay_curve,
    (pflid.calculate_longitudinal_score(p.id)->>'overall_score')::numeric AS longitudinal_score
  FROM public.products p
  LEFT JOIN pflid.timeline_metrics_daily tm ON tm.product_id = p.id
    AND tm.stat_date = (
      SELECT MAX(stat_date) FROM pflid.timeline_metrics_daily WHERE product_id = p.id
    )
  WHERE p.is_active = true
    AND tm.timeline_count > 0
    -- Filter: sensitive gut products get penalized if high soft_stool_rate
    AND (
      NOT p_sensitive_gut
      OR COALESCE(tm.soft_stool_rate, 0) < 30
    )
  ORDER BY
    -- Primary: longitudinal score
    (pflid.calculate_longitudinal_score(p.id)->>'overall_score')::numeric DESC,
    -- Secondary: stability rate
    COALESCE(tm.day90_stability_rate, 0) DESC,
    -- Tertiary: repurchase rate
    COALESCE(tm.repurchase_rate, 0) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. RECOMMEND FOOD BY OUTCOME (simplified wrapper)
CREATE OR REPLACE FUNCTION pflid.recommend_food_by_outcome(
  p_pet_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS jsonb AS $$
DECLARE
  v_pet record;
  v_result jsonb;
  v_products jsonb;
BEGIN
  -- Get pet profile
  SELECT breed, age_years, sterilized, stomach_health INTO v_pet
  FROM public.pets WHERE id = p_pet_id;

  IF v_pet IS NULL THEN
    RETURN jsonb_build_object('error', 'Pet not found');
  END IF;

  -- Match outcomes
  SELECT jsonb_agg(jsonb_build_object(
    'product_id', r.product_id,
    'product_name', r.product_name,
    'brand', r.brand,
    'stability_rate', r.stability_rate,
    'soft_stool_risk', r.soft_stool_risk,
    'black_chin_risk', r.black_chin_risk,
    'vomiting_risk', r.vomiting_risk,
    'repurchase_rate', r.repurchase_rate,
    'confidence', r.confidence,
    'matched_timelines', r.matched_timelines,
    'decay_curve', r.decay_curve,
    'longitudinal_score', r.longitudinal_score
  )) INTO v_products
  FROM pflid.match_outcome_for_pet(
    v_pet.breed,
    v_pet.age_years,
    COALESCE(v_pet.sterilized, false),
    v_pet.stomach_health IN ('sensitive', 'very_sensitive'),
    NULL,
    p_limit
  ) r;

  v_result := jsonb_build_object(
    'pet_id', p_pet_id,
    'pet_profile', jsonb_build_object(
      'breed', v_pet.breed,
      'age', v_pet.age_years,
      'sterilized', v_pet.sterilized,
      'sensitive_gut', v_pet.stomach_health IN ('sensitive', 'very_sensitive')
    ),
    'recommendations', COALESCE(v_products, '[]'::jsonb),
    'scoring_method', 'outcome_recommendation',
    'generated_at', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. GET OUTCOME INTEL FOR SINGLE PRODUCT
CREATE OR REPLACE FUNCTION pflid.get_outcome_intel(
  p_product_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_metrics record;
  v_longitudinal jsonb;
  v_result jsonb;
BEGIN
  SELECT * INTO v_metrics
  FROM pflid.timeline_metrics_daily
  WHERE product_id = p_product_id
  ORDER BY stat_date DESC
  LIMIT 1;

  IF v_metrics IS NULL THEN
    RETURN jsonb_build_object(
      'product_id', p_product_id,
      'error', 'No timeline metrics available'
    );
  END IF;

  v_longitudinal := pflid.calculate_longitudinal_score(p_product_id);

  v_result := jsonb_build_object(
    'product_id', p_product_id,
    'stability_rate', v_metrics.day90_stability_rate,
    'soft_stool_risk', v_metrics.soft_stool_rate,
    'black_chin_risk', v_metrics.black_chin_rate,
    'vomiting_risk', v_metrics.vomiting_rate,
    'repurchase_rate', v_metrics.repurchase_rate,
    'trust_weighted_score', v_metrics.trust_weighted_score,
    'longitudinal_score', v_longitudinal,
    'timeline_count', v_metrics.timeline_count,
    'stat_date', v_metrics.stat_date
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
