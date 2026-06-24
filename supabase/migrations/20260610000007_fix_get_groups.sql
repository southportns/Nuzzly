-- 修复 get_timeline_groups_for_author_product wrapper 函数
-- 改为直接查询 pflid.review_timeline_groups 表

DROP FUNCTION IF EXISTS public.get_timeline_groups_for_author_product(text, uuid);

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
  timeline_score numeric(4,1),
  trust_factors jsonb,
  has_photos boolean,
  has_repurchase boolean,
  has_opinion_change boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.author_id, g.product_id, g.first_review_date, g.last_review_date,
         g.review_count, g.total_days_span, g.timeline_score, g.trust_factors,
         g.has_photos, g.has_repurchase, g.has_opinion_change
  FROM pflid.review_timeline_groups g
  WHERE g.author_id = p_author_id AND g.product_id = p_product_id
  ORDER BY g.total_days_span DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
