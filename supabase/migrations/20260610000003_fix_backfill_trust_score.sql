-- 修复 backfill 函数，使其在回溯时正确设置 has_repurchase
-- 并自动计算信任分

CREATE OR REPLACE FUNCTION pflid.backfill_timeline_groups(
  p_product_id uuid DEFAULT NULL,
  p_author_id text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_review RECORD;
  v_result jsonb;
  v_count integer := 0;
  v_group_ids uuid[] := ARRAY[]::uuid[];
  v_group_id uuid;
  v_has_repurchase boolean;
  v_repurchase_keywords text[] := ARRAY[
    '重新购买','回购','第二次购买','再次购买','又买了','又买了一包',
    '复购','第二包','第二袋','换了一包','新的一包','再买','再购入','回购了一袋'
  ];
BEGIN
  FOR v_review IN
    SELECT
      pr.id AS review_id,
      pr.profile_id::text AS author_id,
      pr.product_id,
      pr.created_at AS review_date,
      pr.review_text
    FROM public.product_reviews pr
    WHERE (p_product_id IS NULL OR pr.product_id = p_product_id)
      AND (p_author_id IS NULL OR pr.profile_id::text = p_author_id)
      AND NOT EXISTS (
        SELECT 1 FROM pflid.review_to_timeline r2t
        WHERE r2t.source_review_id = pr.id
      )
    ORDER BY pr.product_id, pr.profile_id, pr.created_at
  LOOP
    v_result := pflid.build_timeline_group(
      v_review.review_id,
      v_review.author_id,
      v_review.product_id,
      v_review.review_date,
      v_review.review_text
    );
    v_count := v_count + 1;
    
    -- Collect group IDs for trust score calculation
    v_group_id := (v_result->>'timeline_group_id')::uuid;
    IF NOT v_group_id = ANY(v_group_ids) THEN
      v_group_ids := array_append(v_group_ids, v_group_id);
    END IF;
    
    -- Update has_repurchase based on review text
    v_has_repurchase := EXISTS (
      SELECT 1 FROM unnest(v_repurchase_keywords) kw
      WHERE v_review.review_text ILIKE '%' || kw || '%'
    );
    
    IF v_has_repurchase THEN
      UPDATE pflid.review_timeline_groups
      SET has_repurchase = true,
          updated_at = now()
      WHERE id = v_group_id;
    END IF;
  END LOOP;
  
  -- Calculate trust scores for all affected groups
  FOREACH v_group_id IN ARRAY v_group_ids
  LOOP
    PERFORM pflid.calculate_timeline_trust_score(v_group_id);
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
