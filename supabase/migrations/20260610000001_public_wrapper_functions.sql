-- 创建 public schema wrapper 函数，方便 REST API 调用
CREATE OR REPLACE FUNCTION public.backfill_timeline_groups(
  p_product_id uuid DEFAULT NULL,
  p_author_id text DEFAULT NULL
)
RETURNS integer AS $$
BEGIN
  RETURN pflid.backfill_timeline_groups(p_product_id, p_author_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper: get_product_timeline_stats
CREATE OR REPLACE FUNCTION public.get_product_timeline_stats(p_product_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN pflid.get_product_timeline_stats(p_product_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper: query timeline groups for author+product
CREATE OR REPLACE FUNCTION public.get_timeline_groups_for_author_product(
  p_author_id text,
  p_product_id uuid
)
RETURNS TABLE (
  id uuid,
  author_id text,
  product_id uuid,
  first_review_date timestamptz,
  last_review_date timestamptz,
  review_count integer,
  total_days_span integer,
  timeline_score numeric,
  trust_factors jsonb,
  has_photos boolean,
  has_repurchase boolean,
  has_opinion_change boolean,
  is_active boolean,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.author_id, g.product_id, g.first_review_date, g.last_review_date,
         g.review_count, g.total_days_span, g.timeline_score, g.trust_factors,
         g.has_photos, g.has_repurchase, g.has_opinion_change, g.is_active,
         g.metadata, g.created_at, g.updated_at
  FROM pflid.review_timeline_groups g
  WHERE g.author_id = p_author_id AND g.product_id = p_product_id
  ORDER BY g.total_days_span DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper: query timeline events
CREATE OR REPLACE FUNCTION public.get_timeline_events(p_timeline_group_id uuid)
RETURNS TABLE (
  id uuid,
  timeline_group_id uuid,
  review_id uuid,
  source_review_id uuid,
  event_day integer,
  event_type text,
  status text,
  symptom text,
  symptom_severity numeric,
  sentiment text,
  sentiment_score numeric,
  confidence numeric,
  extracted_text text,
  extraction_model text,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.timeline_group_id, e.review_id, e.source_review_id,
         e.event_day, e.event_type, e.status, e.symptom, e.symptom_severity,
         e.sentiment, e.sentiment_score, e.confidence, e.extracted_text,
         e.extraction_model, e.metadata, e.created_at
  FROM pflid.review_timeline_events e
  WHERE e.timeline_group_id = p_timeline_group_id
  ORDER BY e.event_day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
