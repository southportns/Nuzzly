-- 为 pet_disease_records 增加康复日期和症状字段
ALTER TABLE public.pet_disease_records
  ADD COLUMN IF NOT EXISTS recovered_on date,
  ADD COLUMN IF NOT EXISTS symptoms text;
