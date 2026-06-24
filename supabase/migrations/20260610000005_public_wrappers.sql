-- 创建 public wrapper 函数，使客户端能调用 pflid schema 的函数

-- build_timeline_group wrapper
DROP FUNCTION IF EXISTS public.build_timeline_group(uuid, text, uuid, timestamptz, text);

CREATE OR REPLACE FUNCTION public.build_timeline_group(
  p_review_id uuid,
  p_author_id text,
  p_product_id uuid,
  p_review_date timestamptz,
  p_review_text text DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
  RETURN pflid.build_timeline_group(p_review_id, p_author_id, p_product_id, p_review_date, p_review_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- backfill_timeline_groups wrapper (如果已存在则更新)
DROP FUNCTION IF EXISTS public.backfill_timeline_groups(uuid, text);

CREATE OR REPLACE FUNCTION public.backfill_timeline_groups(
  p_product_id uuid DEFAULT NULL,
  p_author_id text DEFAULT NULL
)
RETURNS integer AS $$
BEGIN
  RETURN pflid.backfill_timeline_groups(p_product_id, p_author_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- calculate_timeline_trust_score wrapper (如果已存在则更新)
DROP FUNCTION IF EXISTS public.calculate_timeline_trust_score(uuid);

CREATE OR REPLACE FUNCTION public.calculate_timeline_trust_score(
  p_timeline_group_id uuid
)
RETURNS numeric(4,1) AS $$
BEGIN
  RETURN pflid.calculate_timeline_trust_score(p_timeline_group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_timeline_groups_for_author_product wrapper
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
