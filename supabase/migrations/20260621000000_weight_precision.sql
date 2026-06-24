-- Migration: Expand pets.weight_kg precision from numeric(4,1) to numeric(5,2)
-- Supports 2 decimal places (e.g., 12.34 kg), max 999.99 kg

-- 1. 先删除依赖视图
DROP VIEW IF EXISTS public.pets_with_age;

-- 2. 修改列类型
ALTER TABLE public.pets ALTER COLUMN weight_kg TYPE numeric(5,2);

-- 3. 重建视图
CREATE OR REPLACE VIEW public.pets_with_age AS
SELECT
  *,
  COALESCE(age_days, 0) / 365 AS age_years_compat,
  (COALESCE(age_days, 0) % 365) / 30 AS age_months_compat
FROM public.pets;
