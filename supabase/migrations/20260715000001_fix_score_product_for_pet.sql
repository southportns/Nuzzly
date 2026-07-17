-- Fix score_product_for_pet: aggregate columns need explicit aliases
CREATE OR REPLACE FUNCTION public.score_product_for_pet(
  p_product_id uuid,
  p_pet_id uuid
)
RETURNS jsonb AS $$
DECLARE
  pet_record record;
  metrics_record record;
  breed_record record;
  risk_count integer;
  score numeric(4,1);
  stomach_match numeric(3,1);
  stool_safety numeric(3,1);
  stability numeric(3,1);
  repurchase numeric(3,1);
  breed_score numeric(3,1);
  overall numeric(3,1);
  dimensions jsonb;
BEGIN
  -- Get pet profile
  SELECT breed, stomach_health INTO pet_record
  FROM public.pets WHERE id = p_pet_id;

  IF pet_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Pet not found');
  END IF;

  -- Get latest metrics (last 30 days average) with explicit aliases
  SELECT
    AVG(average_rating)::numeric(3,1) AS avg_rating,
    AVG(stool_issue_rate)::numeric(5,3) AS stool_issue_rate,
    AVG(long_term_stability_score)::numeric(3,1) AS stability_score,
    AVG(repurchase_rate)::numeric(5,3) AS repurchase_rate,
    AVG(sensitive_gut_score)::numeric(3,1) AS sensitive_gut_score
  INTO metrics_record
  FROM public.product_metrics_daily
  WHERE product_id = p_product_id AND date >= CURRENT_DATE - 30;

  -- Get breed-specific stats
  SELECT avg_rating, stool_issue_rate INTO breed_record
  FROM public.breed_product_stats
  WHERE product_id = p_product_id
    AND breed = public.normalize_breed(pet_record.breed);

  -- Count active risk events
  SELECT COUNT(*) INTO risk_count
  FROM public.risk_events
  WHERE product_id = p_product_id AND resolved = false;

  -- Calculate dimension scores (0-5 scale)
  overall := COALESCE(metrics_record.avg_rating, 0);
  stomach_match := CASE
    WHEN pet_record.stomach_health IN ('sensitive', 'very_sensitive') THEN
      COALESCE(metrics_record.sensitive_gut_score, 0)
    ELSE overall END;

  -- Stool safety: inverse of stool issue rate (lower issue = higher score)
  stool_safety := CASE
    WHEN metrics_record.stool_issue_rate IS NOT NULL THEN
      GREATEST(0, 5 - (COALESCE(metrics_record.stool_issue_rate, 0) * 100)::numeric(3,1))
    ELSE 0 END;

  stability := COALESCE(metrics_record.stability_score, 0);
  repurchase := COALESCE(LEAST(5, COALESCE(metrics_record.repurchase_rate, 0) * 10), 0);

  breed_score := COALESCE(breed_record.avg_rating, overall);

  -- Weighted total (0-100 scale)
  -- overall_rating 20% + stomach_match 25% + stool_safety 20% + stability 15% + repurchase 10% + breed 10%
  score := (overall * 4.0)
         + (stomach_match * 5.0)
         + (stool_safety * 4.0)
         + (stability * 3.0)
         + (repurchase * 2.0)
         + (breed_score * 2.0);

  -- Risk penalties
  IF risk_count > 0 THEN
    score := score - LEAST(20, risk_count * 10);
  END IF;

  score := GREATEST(0, LEAST(100, score));

  dimensions := jsonb_build_object(
    'overall_rating', overall,
    'stomach_match', stomach_match,
    'stool_safety', stool_safety,
    'long_term_stability', stability,
    'repurchase_rate', COALESCE(metrics_record.repurchase_rate, 0),
    'breed_match', breed_score
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'pet_id', p_pet_id,
    'score', score,
    'dimensions', dimensions,
    'risk_count', risk_count,
    'breed', public.normalize_breed(pet_record.breed),
    'stomach_health', pet_record.stomach_health
  );
END;
$$ LANGUAGE plpgsql STABLE;
