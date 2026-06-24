-- Migration: 猫的生命阶段细化为 6 段(幼年/青年/壮年/中年/老年/高龄)
-- 狗分支保持现状,后续单独处理

-- 1. 给 life_stage_t 枚举加 super_senior(高龄)
ALTER TYPE life_stage_t ADD VALUE IF NOT EXISTS 'super_senior';

-- 2. 重写 calculate_life_stage:仅替换 cat 分支
-- 猫的新区间(月份):
--   < 12  → kitten       幼年
--   < 36  → young_adult  青年 (1-3岁,含 2-3 岁的过渡)
--   < 84  → adult        壮年 (3-7岁)
--   < 132 → senior       中年 (7-11岁)
--   < 180 → geriatric    老年 (11-15岁)
--   else  → super_senior 高龄 (15岁+)
CREATE OR REPLACE FUNCTION public.calculate_life_stage(birth_date date, species text)
RETURNS life_stage_t AS $$
DECLARE
  age_months integer;
BEGIN
  age_months := EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date)) * 12
              + EXTRACT(MONTH FROM age(CURRENT_DATE, birth_date));

  IF species = 'cat' THEN
    IF age_months < 12 THEN RETURN 'kitten';
    ELSIF age_months < 36 THEN RETURN 'young_adult';
    ELSIF age_months < 84 THEN RETURN 'adult';
    ELSIF age_months < 132 THEN RETURN 'senior';
    ELSIF age_months < 180 THEN RETURN 'geriatric';
    ELSE RETURN 'super_senior';
    END IF;
  ELSE -- dog / other:保持原区间不动
    IF age_months < 12 THEN RETURN 'kitten';
    ELSIF age_months < 36 THEN RETURN 'young_adult';
    ELSIF age_months < 84 THEN RETURN 'adult';
    ELSIF age_months < 120 THEN RETURN 'senior';
    ELSE RETURN 'geriatric';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
