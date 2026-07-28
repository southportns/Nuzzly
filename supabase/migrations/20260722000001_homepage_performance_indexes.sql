-- Performance indexes for homepage queries
-- Optimizes: queryTotalPetCount, queryTopCatFood

-- Index for pets count query: WHERE is_active = true
CREATE INDEX IF NOT EXISTS idx_pets_is_active ON public.pets (is_active) WHERE is_active = true;

-- Composite index for products hot cat food query:
-- WHERE is_active = true AND applicable_species = 'cats' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_products_active_cats_created
  ON public.products (created_at DESC)
  WHERE is_active = true AND applicable_species = 'cats';

-- Index for product_metrics_daily join: fast lookup by product_id
CREATE INDEX IF NOT EXISTS idx_product_metrics_daily_product_id
  ON public.product_metrics_daily (product_id DESC);

-- Index for product_categories inner join
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
