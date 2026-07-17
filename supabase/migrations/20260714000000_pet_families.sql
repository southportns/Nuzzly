-- 宠物家庭成员表：支持多人共同养宠
-- 角色：owner（户主）、member（成员/铲屎官）

create table if not exists public.pet_families (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')) default 'member',
  nickname text,
  age int,
  gender text check (gender in ('male', 'female', 'other')),
  personality_tags text[], -- 性格标签数组
  avatar_url text,
  resident_id text not null, -- 宠物唯一标识编码（符合深圳地标 DB4403/T 467-2024）
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pet_id, profile_id)
);

-- 索引：按宠物查询家庭成员
create index if not exists idx_pet_families_pet_id on public.pet_families(pet_id);

-- 索引：按用户查询其参与的宠物家庭
create index if not exists idx_pet_families_profile_id on public.pet_families(profile_id);

-- RLS 策略
alter table public.pet_families enable row level security;

-- 策略：用户可以查看自己参与的宠物家庭
create policy "Users can view own pet families"
  on public.pet_families
  for select
  using (auth.uid() = profile_id);

-- 策略：用户可以管理自己创建的宠物家庭记录
create policy "Users can insert own pet families"
  on public.pet_families
  for insert
  with check (auth.uid() = profile_id);

create policy "Users can update own pet families"
  on public.pet_families
  for update
  using (auth.uid() = profile_id);

create policy "Users can delete own pet families"
  on public.pet_families
  for delete
  using (auth.uid() = profile_id);

-- 触发器：自动更新 updated_at
create trigger update_pet_families_updated_at
  before update on public.pet_families
  for each row
  execute function public.update_updated_at_column();

-- 插入示例数据（大王作为户主，小鸡毛作为成员）
-- 注意：这里使用硬编码的 profile_id 占位符，实际使用时需要替换为真实用户ID
-- 或者通过应用层在创建宠物时自动插入
