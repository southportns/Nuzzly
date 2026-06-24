-- =============================================
-- PFLID Phase 3: Timeline Metrics Engine
-- Timeline First Architecture Migration
-- =============================================
-- Purpose: Replace product_metrics_daily (Review-based) with
--          pflid.timeline_metrics_daily (Timeline-based)
-- Source of Truth: review_timeline_groups + review_timeline_events

-- 1. TIMELINE METRICS DAILY
CREATE TABLE pflid.timeline_metrics_daily (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id              uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stat_date               date NOT NULL DEFAULT CURRENT_DATE,
  timeline_count          integer DEFAULT 0,
  day30_stability_rate    numeric(5,2) DEFAULT 0,
  day90_stability_rate    numeric(5,2) DEFAULT 0,
  day180_stability_rate   numeric(5,2) DEFAULT 0,
  soft_stool_rate         numeric(5,3) DEFAULT 0,
  vomiting_rate           numeric(5,3) DEFAULT 0,
  black_chin_rate         numeric(5,3) DEFAULT 0,
  repurchase_rate         numeric(5,3) DEFAULT 0,
  trust_weighted_score    numeric(5,2) DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE(product_id, stat_date)
);

CREATE INDEX idx_tmd_product_date ON pflid.timeline_metrics_daily(product_id, stat_date DESC);
CREATE INDEX idx_tmd_date ON pflid.timeline_metrics_daily(stat_date DESC);

-- 2. GENERATE TIMELINE METRICS (single product, single date)
CREATE OR REPLACE FUNCTION pflid.generate_timeline_metrics(
  p_product_id uuid,
  p_stat_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_timeline_count integer;
  v_day30_stability numeric;
  v_day90_stability numeric;
  v_day180_stability numeric;
  v_soft_stool numeric;
  v_vomiting numeric;
  v_black_chin numeric;
  v_repurchase numeric;
  v_trust_weighted numeric;
BEGIN
  -- Timeline count (active groups with events up to stat_date)
  SELECT COUNT(*) INTO v_timeline_count
  FROM pflid.review_timeline_groups g
  WHERE g.product_id = p_product_id
    AND g.is_active = true
    AND g.first_review_date::date <= p_stat_date;

  -- 30-day stability rate: positive events / total events within day 0-30
  SELECT ROUND(
    COALESCE(COUNT(*) FILTER (WHERE e.status = 'positive')::numeric / NULLIF(COUNT(*), 0) * 100, 0), 2
  ) INTO v_day30_stability
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.event_day <= 30
    AND g.first_review_date::date <= p_stat_date;

  -- 90-day stability rate
  SELECT ROUND(
    COALESCE(COUNT(*) FILTER (WHERE e.status = 'positive')::numeric / NULLIF(COUNT(*), 0) * 100, 0), 2
  ) INTO v_day90_stability
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.event_day <= 90
    AND g.first_review_date::date <= p_stat_date;

  -- 180-day stability rate
  SELECT ROUND(
    COALESCE(COUNT(*) FILTER (WHERE e.status = 'positive')::numeric / NULLIF(COUNT(*), 0) * 100, 0), 2
  ) INTO v_day180_stability
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.event_day <= 180
    AND g.first_review_date::date <= p_stat_date;

  -- Symptom rates (among events with symptom != null)
  SELECT ROUND(
    COALESCE(COUNT(*) FILTER (WHERE e.symptom = 'soft_stool')::numeric / NULLIF(COUNT(*), 0) * 100, 0), 3
  ) INTO v_soft_stool
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.symptom IS NOT NULL
    AND g.first_review_date::date <= p_stat_date;

  SELECT ROUND(
    COALESCE(COUNT(*) FILTER (WHERE e.symptom = 'vomit')::numeric / NULLIF(COUNT(*), 0) * 100, 0), 3
  ) INTO v_vomiting
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.symptom IS NOT NULL
    AND g.first_review_date::date <= p_stat_date;

  SELECT ROUND(
    COALESCE(COUNT(*) FILTER (WHERE e.symptom = 'black_chin')::numeric / NULLIF(COUNT(*), 0) * 100, 0), 3
  ) INTO v_black_chin
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.symptom IS NOT NULL
    AND g.first_review_date::date <= p_stat_date;

  -- Repurchase rate: repurchase events / total timelines
  SELECT ROUND(
    COALESCE(COUNT(*) FILTER (WHERE e.event_type = 'repurchase')::numeric / NULLIF(COUNT(*), 0) * 100, 0), 3
  ) INTO v_repurchase
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND g.first_review_date::date <= p_stat_date;

  -- Trust-weighted score: avg timeline_score weighted by review_count
  SELECT ROUND(
    COALESCE(SUM(g.timeline_score * g.review_count)::numeric / NULLIF(SUM(g.review_count), 0), 0), 2
  ) INTO v_trust_weighted
  FROM pflid.review_timeline_groups g
  WHERE g.product_id = p_product_id
    AND g.is_active = true
    AND g.first_review_date::date <= p_stat_date;

  -- Upsert into timeline_metrics_daily
  INSERT INTO pflid.timeline_metrics_daily (
    product_id, stat_date, timeline_count,
    day30_stability_rate, day90_stability_rate, day180_stability_rate,
    soft_stool_rate, vomiting_rate, black_chin_rate,
    repurchase_rate, trust_weighted_score
  ) VALUES (
    p_product_id, p_stat_date, v_timeline_count,
    v_day30_stability, v_day90_stability, v_day180_stability,
    v_soft_stool, v_vomiting, v_black_chin,
    v_repurchase, v_trust_weighted
  )
  ON CONFLICT (product_id, stat_date) DO UPDATE SET
    timeline_count = EXCLUDED.timeline_count,
    day30_stability_rate = EXCLUDED.day30_stability_rate,
    day90_stability_rate = EXCLUDED.day90_stability_rate,
    day180_stability_rate = EXCLUDED.day180_stability_rate,
    soft_stool_rate = EXCLUDED.soft_stool_rate,
    vomiting_rate = EXCLUDED.vomiting_rate,
    black_chin_rate = EXCLUDED.black_chin_rate,
    repurchase_rate = EXCLUDED.repurchase_rate,
    trust_weighted_score = EXCLUDED.trust_weighted_score,
    created_at = now();

  v_result := jsonb_build_object(
    'product_id', p_product_id,
    'stat_date', p_stat_date,
    'timeline_count', v_timeline_count,
    'day30_stability_rate', v_day30_stability,
    'day90_stability_rate', v_day90_stability,
    'day180_stability_rate', v_day180_stability,
    'soft_stool_rate', v_soft_stool,
    'vomiting_rate', v_vomiting,
    'black_chin_rate', v_black_chin,
    'repurchase_rate', v_repurchase,
    'trust_weighted_score', v_trust_weighted
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. BACKFILL TIMELINE METRICS (all products, last N days)
CREATE OR REPLACE FUNCTION pflid.backfill_timeline_metrics(
  p_days_back integer DEFAULT 30
)
RETURNS integer AS $$
DECLARE
  v_product record;
  v_date date;
  v_count integer := 0;
  v_start_date date;
BEGIN
  v_start_date := CURRENT_DATE - p_days_back;

  FOR v_product IN
    SELECT DISTINCT g.product_id
    FROM pflid.review_timeline_groups g
    WHERE g.first_review_date::date >= v_start_date
  LOOP
    v_date := v_start_date;
    WHILE v_date <= CURRENT_DATE LOOP
      PERFORM pflid.generate_timeline_metrics(v_product.product_id, v_date);
      v_count := v_count + 1;
      v_date := v_date + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER: Auto-update timeline_metrics_daily on timeline event changes
CREATE OR REPLACE FUNCTION pflid.trigger_update_timeline_metrics()
RETURNS trigger AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- Get product_id from timeline_group
  SELECT g.product_id INTO v_product_id
  FROM pflid.review_timeline_groups g
  WHERE g.id = COALESCE(NEW.timeline_group_id, OLD.timeline_group_id);

  IF v_product_id IS NOT NULL THEN
    PERFORM pflid.generate_timeline_metrics(v_product_id, CURRENT_DATE);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_timeline_event_insert
  AFTER INSERT ON pflid.review_timeline_events
  FOR EACH ROW EXECUTE FUNCTION pflid.trigger_update_timeline_metrics();

CREATE TRIGGER after_timeline_group_insert
  AFTER INSERT ON pflid.review_timeline_groups
  FOR EACH ROW EXECUTE FUNCTION pflid.trigger_update_timeline_metrics();

-- 5. RLS
ALTER TABLE pflid.timeline_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_metrics_read_public" ON pflid.timeline_metrics_daily
  FOR SELECT USING (true);
