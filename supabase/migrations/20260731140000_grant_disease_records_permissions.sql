-- 为 pet_disease_records 表补全角色权限
-- 问题：建表迁移未包含 GRANT，导致 anon/authenticated 角色无法 SELECT
GRANT SELECT ON public.pet_disease_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_disease_records TO authenticated;

-- 刷新 PostgREST schema cache（让 API 识别新增列）
NOTIFY pgrst, 'reload schema';
