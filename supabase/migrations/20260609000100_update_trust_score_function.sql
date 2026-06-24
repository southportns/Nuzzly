-- Update calculate_review_trust_score to recognize the new usage_duration buckets
-- Without this, new reviews would get 0 trust contribution from the duration dimension
-- because none of the new ENUM values match the existing ELSIF branches

CREATE OR REPLACE FUNCTION public.calculate_review_trust_score(review public.product_reviews)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score integer := 0;
BEGIN
  -- Duration contribution (legacy buckets kept for old reviews)
  IF review.usage_duration IN ('just_started', 'lt_1w', '1w_to_2w') THEN
    score := score + 5;
  ELSIF review.usage_duration IN ('7d', '14d', '2w_to_1m') THEN
    score := score + 10;
  ELSIF review.usage_duration IN ('30d', '60d', '90d', '1m_to_3m') THEN
    score := score + 20;
  ELSIF review.usage_duration IN ('180d+', 'm6', 'm6_to_1y') THEN
    score := score + 30;
  ELSIF review.usage_duration IN ('gt_1y') THEN
    score := score + 35;
  ELSIF review.usage_duration = 'custom' THEN
    -- map custom_days to the same tier system
    IF review.usage_duration_custom_days IS NOT NULL THEN
      IF review.usage_duration_custom_days < 14 THEN
        score := score + 5;
      ELSIF review.usage_duration_custom_days < 60 THEN
        score := score + 10;
      ELSIF review.usage_duration_custom_days < 180 THEN
        score := score + 20;
      ELSIF review.usage_duration_custom_days < 365 THEN
        score := score + 30;
      ELSE
        score := score + 35;
      END IF;
    END IF;
  END IF;

  IF review.verified_purchase THEN score := score + 15; END IF;
  IF review.has_voucher       THEN score := score + 5;  END IF;
  IF review.review_text IS NOT NULL AND length(review.review_text) > 50 THEN score := score + 10; END IF;
  IF review.pros IS NOT NULL  THEN score := score + 5;  END IF;
  IF review.cons IS NOT NULL  THEN score := score + 5;  END IF;
  IF review.transition_period_days IS NOT NULL THEN score := score + 5; END IF;

  score := score
    + COALESCE(review.helpful_count, 0) * 2
    + (CASE WHEN review.coat_rating    IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN review.stool_rating   IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN review.energy_rating  IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN review.black_chin_rating IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN review.vomit_rating     IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN review.tear_stain_rating IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN review.shedding_rating  IS NOT NULL THEN 2 ELSE 0 END);

  IF score > 100 THEN score := 100; END IF;
  IF score < 0   THEN score := 0;   END IF;

  RETURN score;
END;
$$;
