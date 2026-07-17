-- 更新 pet_families RLS 策略
-- 允许宠物主人查看该宠物的所有家庭成员

drop policy if exists "Users can view own pet families" on public.pet_families;

create policy "Users can view pet families for owned pets"
  on public.pet_families
  for select
  using (
    exists (
      select 1 from public.pets
      where pets.id = pet_families.pet_id
        and pets.profile_id = auth.uid()
        and pets.is_active = true
    )
  );
