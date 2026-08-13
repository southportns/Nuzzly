-- 修复 pet_disease_records 状态约束
-- 问题：DB CHECK 只允许 ('active','recovered','chronic','unknown')
--       但应用代码使用 ('active','under_treatment','chronic','resolved')
--       导致选择"已康复"(resolved) 时插入被拒绝，或已有 recovered 记录
--       在前端因 statusConfig 缺失而回退显示"进行中"

-- 1. 先删除旧约束（否则 UPDATE 时旧值→新值会违反旧约束）
ALTER TABLE public.pet_disease_records
  DROP CONSTRAINT IF EXISTS pet_disease_records_status_check;

-- 2. 迁移旧值：recovered → resolved, unknown → active
UPDATE public.pet_disease_records SET status = 'resolved' WHERE status = 'recovered';
UPDATE public.pet_disease_records SET status = 'active'  WHERE status = 'unknown';

-- 3. 添加新约束（与应用代码一致）
ALTER TABLE public.pet_disease_records
  ADD CONSTRAINT pet_disease_records_status_check
  CHECK (status IN ('active', 'under_treatment', 'chronic', 'resolved'));

-- 4. 同步修复 severity 约束（增加 critical）
ALTER TABLE public.pet_disease_records
  DROP CONSTRAINT IF EXISTS pet_disease_records_severity_check;

ALTER TABLE public.pet_disease_records
  ADD CONSTRAINT pet_disease_records_severity_check
  CHECK (severity IN ('mild', 'moderate', 'severe', 'critical', 'unknown'));
