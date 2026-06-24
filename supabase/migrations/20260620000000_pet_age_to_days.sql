-- Phase 0.1: 宠物年龄精确到天
-- 将 age_years + age_months 改为 age_days（精确到天）

-- 1. 添加 age_days 列
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS age_days integer,
  ADD COLUMN IF NOT EXISTS home_age_days integer,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS home_date date;

-- 2. 迁移现有数据：将 age_years + age_months 转换为 age_days
UPDATE pets
SET 
  age_days = (age_years * 365 + age_months * 30),
  home_age_days = (home_age_years * 365 + home_age_months * 30),
  birth_date = CURRENT_DATE - ((age_years * 365 + age_months * 30) || ' days')::interval,
  home_date = CURRENT_DATE - ((home_age_years * 365 + home_age_months * 30) || ' days')::interval
WHERE age_days IS NULL;

-- 3. 设置默认值
ALTER TABLE pets
  ALTER COLUMN age_days SET DEFAULT 0,
  ALTER COLUMN home_age_days SET DEFAULT 0;

-- 4. 创建视图保持向后兼容（供旧代码使用）
CREATE OR REPLACE VIEW pets_with_age AS
SELECT 
  *,
  COALESCE(age_days, 0) / 365 AS age_years_compat,
  (COALESCE(age_days, 0) % 365) / 30 AS age_months_compat
FROM pets;

-- 5. 添加约束
ALTER TABLE pets
  ADD CONSTRAINT age_days_positive CHECK (age_days >= 0),
  ADD CONSTRAINT home_age_days_positive CHECK (home_age_days >= 0);
