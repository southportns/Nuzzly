-- =============================================
-- PFLID Phase 3.5: Shadow Mode — Dual Scoring System
-- Timeline First Architecture — Score Comparison Engine
-- =============================================
-- Purpose: Run Review Score and Timeline Score in parallel,
--          output delta analysis for validation before cutover.

-- 1. PRODUCT SCORE COMPARISON TABLE
CREATE TABLE pflid.product_score_comparison (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  review_score    numeric(5,2),
  timeline_score  numeric(5,2),
  score_delta     numeric(5,2),
  delta_percent   numeric(5,2),
  calculated_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

CREATE INDEX idx_psc_product ON pflid.product_score_comparison(product_id);
CREATE INDEX idx_psc_calculated ON pflid.product_score_comparison(calculated_at DESC);
CREATE INDEX idx_psc_delta ON pflid.product_score_comparison(score_delta DESC);

-- 2. CALCULATE SCORE COMPARISON (single product)
CREATE OR REPLACE FUNCTION pflid.calculate_score_comparison(
  p_product_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_review_score numeric;
  v_timeline_score numeric;
  v_delta numeric;
  v_delta_percent numeric;
  v_result jsonb;
  v_metrics record;
BEGIN
  -- Review Score: from product_metrics_daily (average_rating * 20 to get 0-100 scale)
  SELECT COALESCE(average_rating, 0) * 20 INTO v_review_score
  FROM public.product_metrics_daily
  WHERE product_id = p_product_id
  ORDER BY date DESC
  LIMIT 1;

  -- Timeline Score: from longitudinal score (null-safe)
  v_timeline_score := COALESCE(
    NULLIF(pflid.calculate_longitudinal_score(p_product_id)->>'overall_score', '')::numeric,
    0
  );

  -- Delta
  v_delta := v_timeline_score - COALESCE(v_review_score, 0);
  v_delta_percent := CASE
    WHEN COALESCE(v_review_score, 0) > 0
    THEN ROUND(v_delta / v_review_score * 100, 2)
    ELSE 0
  END;

  -- Upsert comparison
  INSERT INTO pflid.product_score_comparison (
    product_id, review_score, timeline_score, score_delta, delta_percent
  ) VALUES (
    p_product_id, v_review_score, v_timeline_score, v_delta, v_delta_percent
  )
  ON CONFLICT (product_id) DO UPDATE SET
    review_score = EXCLUDED.review_score,
    timeline_score = EXCLUDED.timeline_score,
    score_delta = EXCLUDED.score_delta,
    delta_percent = EXCLUDED.delta_percent,
    calculated_at = now();

  -- Get additional context
  SELECT * INTO v_metrics
  FROM pflid.timeline_metrics_daily
  WHERE product_id = p_product_id
  ORDER BY stat_date DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'product_id', p_product_id,
    'review_score', COALESCE(v_review_score, 0),
    'timeline_score', COALESCE(v_timeline_score, 0),
    'score_delta', v_delta,
    'delta_percent', v_delta_percent,
    'timeline_count', v_metrics.timeline_count,
    'day90_stability', v_metrics.day90_stability_rate,
    'soft_stool_rate', v_metrics.soft_stool_rate,
    'repurchase_rate', v_metrics.repurchase_rate,
    'calculated_at', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. BACKFILL SCORE COMPARISON (all products with reviews)
CREATE OR REPLACE FUNCTION pflid.backfill_score_comparison()
RETURNS integer AS $$
DECLARE
  v_product record;
  v_count integer := 0;
BEGIN
  FOR v_product IN
    SELECT DISTINCT product_id
    FROM public.product_metrics_daily
    WHERE average_rating IS NOT NULL
  LOOP
    PERFORM pflid.calculate_score_comparison(v_product.product_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. GET SCORE COMPARISON REPORT
CREATE OR REPLACE FUNCTION pflid.get_score_comparison_report(
  p_limit integer DEFAULT 20
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_largest_delta jsonb;
  v_smallest_delta jsonb;
  v_review_higher jsonb;
  v_timeline_higher jsonb;
BEGIN
  -- Largest delta (Timeline much higher than Review)
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_largest_delta
  FROM (
    SELECT jsonb_build_object(
      'product_id', product_id,
      'review_score', review_score,
      'timeline_score', timeline_score,
      'delta', score_delta,
      'delta_percent', delta_percent
    ) AS item
    FROM pflid.product_score_comparison
    WHERE score_delta > 0
    ORDER BY score_delta DESC
    LIMIT p_limit
  ) sub;

  -- Smallest delta (Review much higher than Timeline)
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_smallest_delta
  FROM (
    SELECT jsonb_build_object(
      'product_id', product_id,
      'review_score', review_score,
      'timeline_score', timeline_score,
      'delta', score_delta,
      'delta_percent', delta_percent
    ) AS item
    FROM pflid.product_score_comparison
    WHERE score_delta < 0
    ORDER BY score_delta ASC
    LIMIT p_limit
  ) sub;

  -- Review higher but Timeline lower (potential fake reviews)
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_review_higher
  FROM (
    SELECT jsonb_build_object(
      'product_id', product_id,
      'review_score', review_score,
      'timeline_score', timeline_score,
      'delta', score_delta,
      'warning', 'Review score inflated vs timeline reality'
    ) AS item
    FROM pflid.product_score_comparison
    WHERE review_score > timeline_score AND score_delta < -10
    ORDER BY score_delta ASC
    LIMIT p_limit
  ) sub;

  -- Timeline higher but Review lower (underrated products)
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_timeline_higher
  FROM (
    SELECT jsonb_build_object(
      'product_id', product_id,
      'review_score', review_score,
      'timeline_score', timeline_score,
      'delta', score_delta,
      'opportunity', 'Timeline shows better long-term outcome than reviews suggest'
    ) AS item
    FROM pflid.product_score_comparison
    WHERE timeline_score > review_score AND score_delta > 10
    ORDER BY score_delta DESC
    LIMIT p_limit
  ) sub;

  v_result := jsonb_build_object(
    'total_compared', (SELECT COUNT(*) FROM pflid.product_score_comparison),
    'avg_delta', (SELECT COALESCE(ROUND(AVG(score_delta), 2), 0) FROM pflid.product_score_comparison),
    'largest_delta_positive', v_largest_delta,
    'largest_delta_negative', v_smallest_delta,
    'review_inflated', v_review_higher,
    'timeline_underrated', v_timeline_higher,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. TRIGGER: Auto-update comparison on metrics change
-- Uses comparison check to avoid redundant writes
CREATE OR REPLACE FUNCTION pflid.trigger_update_score_comparison()
RETURNS trigger AS $$
DECLARE
  v_existing record;
  v_new_delta numeric;
  v_new_timeline numeric;
BEGIN
  -- Get new timeline score
  v_new_timeline := (pflid.calculate_longitudinal_score(NEW.product_id)->>'overall_score')::numeric;

  -- Check if existing comparison is recent (within 1 hour) and similar
  SELECT * INTO v_existing
  FROM pflid.product_score_comparison
  WHERE product_id = NEW.product_id
  AND calculated_at > now() - INTERVAL '1 hour';

  IF v_existing IS NOT NULL THEN
    -- Skip if scores haven't changed significantly
    IF ABS(v_existing.timeline_score - COALESCE(v_new_timeline, 0)) < 1 THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM pflid.calculate_score_comparison(NEW.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_timeline_metrics_insert
  AFTER INSERT ON pflid.timeline_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION pflid.trigger_update_score_comparison();

-- 6. RLS
ALTER TABLE pflid.product_score_comparison ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_comparison_read_public" ON pflid.product_score_comparison
  FOR SELECT USING (true);
