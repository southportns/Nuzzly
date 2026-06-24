-- Expand product_reviews: add symptom-specific ratings + new duration buckets + custom duration
-- 1) Add black_chin_rating, vomit_rating, tear_stain_rating, shedding_rating columns (form already sends these)
-- 2) Add usage_duration_custom_days column for "自定义" duration option
-- 3) Add 8 new usage_duration_t ENUM values (replaces old fine-grained buckets with coarser ranges)
-- 4) Update unique constraint to include custom_days so users can submit multiple "custom" reviews

-- =============================================
-- 1. Add new rating columns
-- =============================================
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS black_chin_rating integer CHECK (black_chin_rating >= 1 AND black_chin_rating <= 5),
  ADD COLUMN IF NOT EXISTS vomit_rating     integer CHECK (vomit_rating     >= 1 AND vomit_rating     <= 5),
  ADD COLUMN IF NOT EXISTS tear_stain_rating integer CHECK (tear_stain_rating >= 1 AND tear_stain_rating <= 5),
  ADD COLUMN IF NOT EXISTS shedding_rating  integer CHECK (shedding_rating  >= 1 AND shedding_rating  <= 5),
  ADD COLUMN IF NOT EXISTS usage_duration_custom_days integer CHECK (usage_duration_custom_days >= 1 AND usage_duration_custom_days <= 3650);

-- =============================================
-- 2. Expand usage_duration_t ENUM with 8 new bucket values
--    (old values like '7d', '30d', '180d+' remain valid for legacy reviews)
-- =============================================
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS 'lt_1w';
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS '1w_to_2w';
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS '2w_to_1m';
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS '1m_to_3m';
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS 'm6';
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS 'm6_to_1y';
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS 'gt_1y';
ALTER TYPE usage_duration_t ADD VALUE IF NOT EXISTS 'custom';

-- =============================================
-- 3. Update unique constraint
--    Old: UNIQUE(product_id, pet_id, profile_id, usage_duration)
--    New: same + usage_duration_custom_days
--    Why: two "custom" submissions for the same pet on the same product should not conflict
-- =============================================
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.product_reviews'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%(product_id, pet_id, profile_id, usage_duration)%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.product_reviews DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_unique_per_duration
  UNIQUE (product_id, pet_id, profile_id, usage_duration, usage_duration_custom_days);
