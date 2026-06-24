-- Phase 3: AI Recommendation Engine — Data Layer
-- Breed intelligence, product scoring, recommendation context

-- 1. BREED STANDARDIZATION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.breed_aliases (
  alias     text PRIMARY KEY,
  canonical text NOT NULL,
  species   text NOT NULL DEFAULT 'cat' CHECK (species IN ('cat', 'dog', 'other'))
);

-- Seed common breed aliases
INSERT INTO public.breed_aliases (alias, canonical, species) VALUES
  ('布偶猫', '布偶猫', 'cat'),
  ('布偶', '布偶猫', 'cat'),
  ('ragdoll', '布偶猫', 'cat'),
  ('英短', '英国短毛猫', 'cat'),
  ('英国短毛猫', '英国短毛猫', 'cat'),
  ('british shorthair', '英国短毛猫', 'cat'),
  ('美短', '美国短毛猫', 'cat'),
  ('美国短毛猫', '美国短毛猫', 'cat'),
  ('american shorthair', '美国短毛猫', 'cat'),
  ('橘猫', '橘猫', 'cat'),
  ('三花猫', '三花猫', 'cat'),
  ('三花', '三花猫', 'cat'),
  ('暹罗猫', '暹罗猫', 'cat'),
  ('siamese', '暹罗猫', 'cat'),
  ('波斯猫', '波斯猫', 'cat'),
  ('persian', '波斯猫', 'cat'),
  ('缅因猫', '缅因猫', 'cat'),
  ('maine coon', '缅因猫', 'cat'),
  ('金毛', '金毛寻回犬', 'dog'),
  ('金毛寻回犬', '金毛寻回犬', 'dog'),
  ('golden retriever', '金毛寻回犬', 'dog'),
  ('拉布拉多', '拉布拉多', 'dog'),
  ('labrador', '拉布拉多', 'dog'),
  ('泰迪', '贵宾犬', 'dog'),
  ('贵宾', '贵宾犬', 'dog'),
  ('poodle', '贵宾犬', 'dog')
ON CONFLICT (alias) DO NOTHING;

-- 2. BREED NORMALIZATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.normalize_breed(raw_breed text)
RETURNS text AS $$
DECLARE
  cleaned text;
  result text;
BEGIN
  IF raw_breed IS NULL THEN RETURN NULL; END IF;
  cleaned := trim(lower(raw_breed));
  SELECT canonical INTO result FROM public.breed_aliases WHERE alias = cleaned;
  RETURN COALESCE(result, raw_breed);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. BREED PRODUCT STATS (materialized view)
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.breed_product_stats AS
SELECT
  p.id AS product_id,
  public.normalize_breed(pet.breed) AS breed,
  COUNT(DISTINCT r.id) AS review_count,
  AVG(r.overall_rating)::numeric(3,2) AS avg_rating,
  AVG(r.stool_rating)::numeric(3,2) AS avg_stool_rating,
  CASE WHEN COUNT(*) FILTER (WHERE r.stool_rating IS NOT NULL) > 0
    THEN COUNT(*) FILTER (WHERE r.stool_rating <= 2)::float
         / COUNT(*) FILTER (WHERE r.stool_rating IS NOT NULL)
    ELSE 0 END AS stool_issue_rate,
  CASE WHEN COUNT(*) FILTER (WHERE r.would_repurchase IS NOT NULL) > 0
    THEN COUNT(*) FILTER (WHERE r.would_repurchase = true)::float
         / COUNT(*) FILTER (WHERE r.would_repurchase IS NOT NULL)
    ELSE 0 END AS repurchase_rate,
  CASE WHEN COUNT(e.id) > 0
    THEN COUNT(e.id) FILTER (WHERE e.continued_usage = true)::float / COUNT(e.id)
    ELSE 0 END AS continued_usage_rate,
  CASE WHEN COUNT(e.id) FILTER (WHERE e.stool_status IS NOT NULL) > 0
    THEN COUNT(e.id) FILTER (WHERE e.stool_status = 'improved')::float
         / COUNT(e.id) FILTER (WHERE e.stool_status IS NOT NULL)
    ELSE 0 END AS long_term_stool_improve_rate
FROM public.products p
JOIN public.product_reviews r ON r.product_id = p.id
JOIN public.pets pet ON r.pet_id = pet.id
LEFT JOIN public.review_followup_schedules s ON s.review_id = r.id
LEFT JOIN public.review_followup_entries e ON e.schedule_id = s.id
WHERE pet.breed IS NOT NULL
GROUP BY p.id, public.normalize_breed(pet.breed)
HAVING COUNT(DISTINCT r.id) >= 3;

CREATE UNIQUE INDEX IF NOT EXISTS idx_breed_stats_product_breed
  ON public.breed_product_stats (product_id, breed);

-- 4. SCORE PRODUCT FOR PET
-- =============================================
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

  -- Get latest metrics (last 30 days average)
  SELECT
    AVG(average_rating)::numeric(3,1),
    AVG(stool_issue_rate)::numeric(5,3),
    AVG(long_term_stability_score)::numeric(3,1),
    AVG(repurchase_rate)::numeric(5,3),
    AVG(sensitive_gut_score)::numeric(3,1)
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

  -- Calculate dimension scores (0-100 or 0-5)
  overall := COALESCE(metrics_record.avg, 0);
  stomach_match := CASE
    WHEN pet_record.stomach_health IN ('sensitive', 'very_sensitive') THEN
      COALESCE(metrics_record.avg_4, 0)
    ELSE overall END;

  -- Stool safety: inverse of stool issue rate (lower issue = higher score)
  stool_safety := CASE
    WHEN metrics_record.avg_1 IS NOT NULL THEN
      GREATEST(0, 5 - (COALESCE(metrics_record.avg_1, 0) * 100)::numeric(3,1))
    ELSE 0 END;

  stability := COALESCE(metrics_record.avg_2, 0);
  repurchase := COALESCE(LEAST(5, COALESCE(metrics_record.avg_3, 0) * 10), 0);

  breed_score := COALESCE(breed_record.avg_rating, overall);

  -- Weighted total (0-100 scale)
  -- overall_rating 20% + stomach_match 25% + stool_safety 20% + stability 15% + repurchase 10% + breed 10%
  score := (overall * 4.0)       -- 20% on 0-100: score * 100/5 * 0.2 = score * 4
         + (stomach_match * 5.0)   -- 25% on 0-100: * 100/5 * 0.25 = * 5
         + (stool_safety * 4.0)    -- 20% on 0-100: * 100/5 * 0.2 = * 4
         + (stability * 3.0)       -- 15% on 0-100: * 100/5 * 0.15 = * 3
         + (repurchase * 2.0)      -- 10% on 0-100: * 100/5 * 0.1 = * 2
         + (breed_score * 2.0);    -- 10% on 0-100: * 100/5 * 0.1 = * 2

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
    'repurchase_rate', COALESCE(metrics_record.avg_3, 0),
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

-- 5. BUILD RECOMMENDATION CONTEXT
-- =============================================
CREATE OR REPLACE FUNCTION public.build_recommendation_context(p_pet_id uuid)
RETURNS jsonb AS $$
DECLARE
  pet_data jsonb;
  top_products jsonb;
  risk_products jsonb;
  breed_data jsonb;
BEGIN
  -- Pet profile
  SELECT jsonb_build_object(
    'id', id, 'name', name, 'species', species, 'breed', breed,
    'age_years', age_years, 'age_months', age_months,
    'stomach_health', stomach_health, 'disease_history', disease_history,
    'normalized_breed', public.normalize_breed(breed)
  ) INTO pet_data
  FROM public.pets WHERE id = p_pet_id;

  IF pet_data IS NULL THEN
    RETURN jsonb_build_object('error', 'Pet not found');
  END IF;

  -- Top 10 products for this breed (with enough reviews)
  SELECT jsonb_agg(t.*) INTO breed_data
  FROM (
    SELECT bps.product_id, bps.breed, bps.avg_rating, bps.stool_issue_rate,
           bps.repurchase_rate, bps.continued_usage_rate, p.name, p.brand
    FROM public.breed_product_stats bps
    JOIN public.products p ON p.id = bps.product_id
    WHERE bps.breed = (pet_data->>'normalized_breed')
      AND p.is_active = true
    ORDER BY bps.avg_rating DESC
    LIMIT 10
  ) t;

  -- Top products for sensitive stomach (if applicable)
  IF pet_data->>'stomach_health' IN ('sensitive', 'very_sensitive') THEN
    SELECT jsonb_agg(t.*) INTO top_products
    FROM (
      SELECT m.product_id, p.name, p.brand, m.sensitive_gut_score AS score,
             m.stool_issue_rate, m.repurchase_rate, m.long_term_stability_score
      FROM public.product_metrics_daily m
      JOIN public.products p ON p.id = m.product_id
      WHERE m.date >= CURRENT_DATE - 60
        AND p.is_active = true
        AND m.sensitive_gut_score IS NOT NULL
      GROUP BY m.product_id, p.name, p.brand, m.sensitive_gut_score,
               m.stool_issue_rate, m.repurchase_rate, m.long_term_stability_score
      ORDER BY m.sensitive_gut_score DESC NULLS LAST, m.stool_issue_rate ASC NULLS LAST
      LIMIT 10
    ) t;
  ELSE
    SELECT jsonb_agg(t.*) INTO top_products
    FROM (
      SELECT m.product_id, p.name, p.brand, m.average_rating AS score,
             m.stool_issue_rate, m.repurchase_rate, m.long_term_stability_score
      FROM public.product_metrics_daily m
      JOIN public.products p ON p.id = m.product_id
      WHERE m.date >= CURRENT_DATE - 60
        AND p.is_active = true
      GROUP BY m.product_id, p.name, p.brand, m.average_rating,
               m.stool_issue_rate, m.repurchase_rate, m.long_term_stability_score
      ORDER BY m.average_rating DESC NULLS LAST
      LIMIT 10
    ) t;
  END IF;

  -- Products with active risks
  SELECT jsonb_agg(t.*) INTO risk_products
  FROM (
    SELECT p.id AS product_id, p.name, p.brand, re.title AS risk_title,
           re.severity, re.description
    FROM public.risk_events re
    JOIN public.products p ON p.id = re.product_id
    WHERE re.resolved = false
    ORDER BY
      CASE re.severity
        WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3
      END
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'pet', pet_data,
    'breed_products', breed_data,
    'recommended_products', top_products,
    'risk_products', COALESCE(risk_products, '[]'::jsonb),
    'generated_at', now()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. ENHANCED refresh_product_metrics (fix breed_match_score + allergy_risk_score)
-- =============================================
CREATE OR REPLACE FUNCTION public.refresh_product_metrics(target_date date DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO public.product_metrics_daily (
    product_id, date, average_rating, review_count, new_review_count,
    stool_issue_rate, repurchase_rate, sensitive_stomach_rating,
    kitten_suitable_rating, senior_suitable_rating,
    coat_improve_rate, energy_improve_rate,
    breed_match_score, sensitive_gut_score, allergy_risk_score, long_term_stability_score,
    total_reviews_cumulative, data_completeness
  )
  SELECT
    p.id,
    target_date,
    AVG(r.overall_rating) FILTER (WHERE r.created_at::date = target_date)::numeric(3,2),
    COUNT(r.id) FILTER (WHERE r.created_at::date = target_date),
    COUNT(r.id) FILTER (WHERE r.created_at::date = target_date),
    CASE WHEN COUNT(r.id) FILTER (WHERE r.stool_rating IS NOT NULL AND r.created_at::date = target_date) > 0
      THEN COUNT(*) FILTER (WHERE r.stool_rating <= 2 AND r.created_at::date = target_date)::float
           / COUNT(*) FILTER (WHERE r.stool_rating IS NOT NULL AND r.created_at::date = target_date)
      ELSE 0 END,
    CASE WHEN COUNT(r.id) FILTER (WHERE r.would_repurchase IS NOT NULL AND r.created_at::date = target_date) > 0
      THEN COUNT(*) FILTER (WHERE r.would_repurchase = true AND r.created_at::date = target_date)::float
           / COUNT(*) FILTER (WHERE r.would_repurchase IS NOT NULL AND r.created_at::date = target_date)
      ELSE 0 END,
    AVG(r.overall_rating) FILTER (WHERE pet.stomach_health = 'sensitive' AND r.created_at::date = target_date)::numeric(3,2),
    AVG(r.overall_rating) FILTER (WHERE p.applicable_age IN ('kitten','all') AND r.created_at::date = target_date)::numeric(3,2),
    AVG(r.overall_rating) FILTER (WHERE p.applicable_age IN ('senior','all') AND r.created_at::date = target_date)::numeric(3,2),
    CASE WHEN COUNT(e.id) FILTER (WHERE e.coat_status IS NOT NULL) > 0
      THEN COUNT(*) FILTER (WHERE e.coat_status = 'improved')::float / COUNT(*) FILTER (WHERE e.coat_status IS NOT NULL)
      ELSE 0 END,
    CASE WHEN COUNT(e.id) FILTER (WHERE e.energy_status IS NOT NULL) > 0
      THEN COUNT(*) FILTER (WHERE e.energy_status = 'improved')::float / COUNT(*) FILTER (WHERE e.energy_status IS NOT NULL)
      ELSE 0 END,
    -- breed_match_score: avg rating from breed_product_stats for the dominant breed
    (SELECT AVG(bps.avg_rating) FROM public.breed_product_stats bps WHERE bps.product_id = p.id),
    AVG(r.overall_rating) FILTER (WHERE pet.stomach_health IN ('sensitive', 'very_sensitive'))::numeric(3,2),
    -- allergy_risk_score: ratio of reviews mentioning allergies/negative reactions
    CASE WHEN COUNT(r.id) > 0
      THEN COUNT(*) FILTER (WHERE r.cons ILIKE '%过敏%' OR r.review_text ILIKE '%过敏%'
           OR r.cons ILIKE '%拉稀%' OR r.review_text ILIKE '%拉稀%'
           OR r.cons ILIKE '%腹泻%' OR r.review_text ILIKE '%腹泻%')::float / COUNT(r.id)
      ELSE 0 END,
    CASE WHEN STDDEV(r.overall_rating) IS NOT NULL
      THEN GREATEST(0, 5 - COALESCE(STDDEV(r.overall_rating), 0))::numeric(5,2)
      ELSE 0 END,
    (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = p.id AND created_at::date <= target_date),
    CASE WHEN target_date = CURRENT_DATE - 1 THEN 'full' ELSE 'partial' END
  FROM public.products p
  LEFT JOIN public.product_reviews r ON r.product_id = p.id
  LEFT JOIN public.pets pet ON r.pet_id = pet.id
  LEFT JOIN public.review_followup_schedules s ON s.review_id = r.id
  LEFT JOIN public.review_followup_entries e ON e.schedule_id = s.id
  WHERE p.is_active = true
  GROUP BY p.id
  ON CONFLICT (product_id, date) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    review_count = EXCLUDED.review_count,
    new_review_count = EXCLUDED.new_review_count,
    stool_issue_rate = EXCLUDED.stool_issue_rate,
    repurchase_rate = EXCLUDED.repurchase_rate,
    sensitive_stomach_rating = EXCLUDED.sensitive_stomach_rating,
    kitten_suitable_rating = EXCLUDED.kitten_suitable_rating,
    senior_suitable_rating = EXCLUDED.senior_suitable_rating,
    coat_improve_rate = EXCLUDED.coat_improve_rate,
    energy_improve_rate = EXCLUDED.energy_improve_rate,
    breed_match_score = EXCLUDED.breed_match_score,
    sensitive_gut_score = EXCLUDED.sensitive_gut_score,
    allergy_risk_score = EXCLUDED.allergy_risk_score,
    long_term_stability_score = EXCLUDED.long_term_stability_score,
    total_reviews_cumulative = EXCLUDED.total_reviews_cumulative,
    data_completeness = EXCLUDED.data_completeness;
END;
$$ LANGUAGE plpgsql;

-- 7. REFRESH MATERIALIZED VIEW
-- =============================================
CREATE OR REPLACE FUNCTION public.refresh_breed_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.breed_product_stats;
END;
$$ LANGUAGE plpgsql;

-- 8. RISK ANOMALY DETECTION
-- =============================================
CREATE OR REPLACE FUNCTION public.detect_risk_anomalies(p_product_id uuid)
RETURNS jsonb AS $$
DECLARE
  recent_avg numeric(5,2);
  previous_avg numeric(5,2);
  recent_stool numeric(5,2);
  previous_stool numeric(5,2);
  result jsonb;
BEGIN
  -- Compare last 14 days vs previous 30 days
  SELECT AVG(average_rating), AVG(stool_issue_rate)
    INTO recent_avg, recent_stool
  FROM public.product_metrics_daily
  WHERE product_id = p_product_id AND date >= CURRENT_DATE - 14;

  SELECT AVG(average_rating), AVG(stool_issue_rate)
    INTO previous_avg, previous_stool
  FROM public.product_metrics_daily
  WHERE product_id = p_product_id
    AND date >= CURRENT_DATE - 44 AND date < CURRENT_DATE - 14;

  result := jsonb_build_object(
    'product_id', p_product_id,
    'analyzed_at', now()
  );

  -- Rating drop detection
  IF previous_avg IS NOT NULL AND recent_avg IS NOT NULL
     AND (previous_avg - recent_avg) > 0.5 THEN
    result := result || jsonb_build_object(
      'rating_drop_detected', true,
      'rating_change', (recent_avg - previous_avg)::numeric(3,2)
    );
  END IF;

  -- Stool issue spike detection
  IF previous_stool IS NOT NULL AND recent_stool IS NOT NULL
     AND (recent_stool - previous_stool) > 0.1 THEN
    result := result || jsonb_build_object(
      'stool_spike_detected', true,
      'stool_change', (recent_stool - previous_stool)::numeric(5,3)
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
