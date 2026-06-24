-- =============================================
-- PFLID Phase 3.5: Outcome Dataset Builder
-- Timeline First Architecture — AI Training Dataset
-- =============================================
-- Purpose: Build structured training samples from timeline data
--          for future Outcome Prediction Engine ML training.

-- 1. BUILD OUTCOME SAMPLE (single pet+product combination)
CREATE OR REPLACE FUNCTION pflid.build_outcome_sample(
  p_pet_id uuid,
  p_product_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_pet record;
  v_product record;
  v_timeline jsonb;
  v_outcome jsonb;
  v_food_period record;
  v_health_events jsonb;
  v_result jsonb;
BEGIN
  -- Pet profile
  SELECT id, species, breed, age_years, sterilized, stomach_health, weight_kg
  INTO v_pet FROM public.pets WHERE id = p_pet_id;

  IF v_pet IS NULL THEN
    RETURN jsonb_build_object('error', 'Pet not found');
  END IF;

  -- Product info
  SELECT id, name, brand, category
  INTO v_product FROM public.products WHERE id = p_product_id;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object('error', 'Product not found');
  END IF;

  -- Timeline events from timeline_groups + timeline_events
  SELECT jsonb_agg(jsonb_build_object(
    'event_day', e.event_day,
    'event_type', e.event_type,
    'status', e.status,
    'symptom', e.symptom,
    'severity', e.symptom_severity,
    'sentiment', e.sentiment,
    'sentiment_score', e.sentiment_score
  ) ORDER BY e.event_day ASC)
  INTO v_timeline
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND g.author_id = (SELECT profile_id FROM public.user_profiles WHERE id = (
      SELECT owner_id FROM public.pets WHERE id = p_pet_id
    ) LIMIT 1)
  LIMIT 100;

  -- Food usage period
  SELECT * INTO v_food_period
  FROM public.food_usage_periods
  WHERE pet_id = p_pet_id AND product_id = p_product_id
  ORDER BY started_at DESC LIMIT 1;

  -- Health events during usage
  SELECT jsonb_agg(jsonb_build_object(
    'type', he.event_type,
    'severity', he.severity,
    'notes', he.notes,
    'recorded_at', he.recorded_at
  ) ORDER BY he.recorded_at ASC)
  INTO v_health_events
  FROM public.health_records he
  WHERE he.pet_id = p_pet_id
    AND he.recorded_at BETWEEN COALESCE(v_food_period.started_at, now() - INTERVAL '180 days')
                            AND COALESCE(v_food_period.ended_at, now());

  -- Outcome determination
  SELECT jsonb_build_object(
    'stable', COALESCE(
      (SELECT bool_and(e.status = 'positive')
       FROM pflid.review_timeline_events e
       JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
       WHERE g.product_id = p_product_id AND e.event_day > 30),
      false
    ),
    'soft_stool', COALESCE(
      (SELECT bool_or(e.symptom = 'soft_stool')
       FROM pflid.review_timeline_events e
       JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
       WHERE g.product_id = p_product_id),
      false
    ),
    'black_chin', COALESCE(
      (SELECT bool_or(e.symptom = 'black_chin')
       FROM pflid.review_timeline_events e
       JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
       WHERE g.product_id = p_product_id),
      false
    ),
    'vomit', COALESCE(
      (SELECT bool_or(e.symptom = 'vomit')
       FROM pflid.review_timeline_events e
       JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
       WHERE g.product_id = p_product_id),
      false
    ),
    'repurchased', COALESCE(
      (SELECT bool_or(e.event_type = 'repurchase')
       FROM pflid.review_timeline_events e
       JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
       WHERE g.product_id = p_product_id),
      false
    ),
    'usage_duration_days', CASE
      WHEN v_food_period.ended_at IS NOT NULL
      THEN EXTRACT(DAY FROM v_food_period.ended_at - v_food_period.started_at)
      ELSE EXTRACT(DAY FROM now() - COALESCE(v_food_period.started_at, now() - INTERVAL '90 days'))
    END
  ) INTO v_outcome;

  v_result := jsonb_build_object(
    'pet_profile', jsonb_build_object(
      'pet_id', v_pet.id,
      'species', v_pet.species,
      'breed', v_pet.breed,
      'age', v_pet.age_years,
      'sterilized', v_pet.sterilized,
      'stomach_health', v_pet.stomach_health,
      'weight_kg', v_pet.weight_kg
    ),
    'food', jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'brand', v_product.brand,
      'category', v_product.category
    ),
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'health_events', COALESCE(v_health_events, '[]'::jsonb),
    'outcome', v_outcome,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. BUILD OUTCOME DATASET (batch — all pet+product combinations)
CREATE OR REPLACE FUNCTION pflid.build_outcome_dataset(
  p_limit integer DEFAULT 1000
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_samples jsonb;
BEGIN
  SELECT jsonb_agg(sample)
  INTO v_samples
  FROM (
    SELECT sample
    FROM (
      SELECT pflid.build_outcome_sample(fup.pet_id, fup.product_id) AS sample
      FROM public.food_usage_periods fup
      WHERE fup.ended_at IS NOT NULL
         OR fup.started_at < now() - INTERVAL '30 days'
    ) sub
    WHERE sample->>'error' IS NULL
    ORDER BY random()
    LIMIT p_limit
  ) limited;

  v_result := jsonb_build_object(
    'total_samples', jsonb_array_length(COALESCE(v_samples, '[]'::jsonb)),
    'samples', COALESCE(v_samples, '[]'::jsonb),
    'generated_at', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. INCREMENTAL OUTCOME DATASET (new samples since last run)
CREATE OR REPLACE FUNCTION pflid.incremental_outcome_dataset(
  p_since timestamptz DEFAULT now() - INTERVAL '24 hours'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_samples jsonb;
BEGIN
  SELECT jsonb_agg(sample)
  INTO v_samples
  FROM (
    SELECT pflid.build_outcome_sample(fup.pet_id, fup.product_id) AS sample
    FROM public.food_usage_periods fup
    WHERE fup.updated_at >= p_since
       OR fup.started_at >= p_since
  ) sub
  WHERE sample->>'error' IS NULL;

  v_result := jsonb_build_object(
    'new_samples', jsonb_array_length(COALESCE(v_samples, '[]'::jsonb)),
    'since', p_since,
    'samples', COALESCE(v_samples, '[]'::jsonb),
    'generated_at', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
