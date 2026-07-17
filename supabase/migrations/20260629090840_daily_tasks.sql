-- =============================================
-- 每日养宠工作评分 — 数据库 Migration
-- =============================================

-- 1. 新增枚举类型
-- =============================================
CREATE TYPE daily_task_frequency_t AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'custom_days'
);

CREATE TYPE daily_task_category_t AS ENUM (
  'feeding',
  'water',
  'litter',
  'walk',
  'bowl_clean',
  'deworm',
  'grooming',
  'medicine',
  'other'
);

-- 2. 扩展通知类型枚举
-- =============================================
ALTER TYPE notification_type_t ADD VALUE IF NOT EXISTS 'task_reminder';

-- 3. daily_tasks — 任务定义表
-- =============================================
CREATE TABLE public.daily_tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category         daily_task_category_t NOT NULL DEFAULT 'other',
  title            text NOT NULL,
  icon             text,
  frequency        daily_task_frequency_t NOT NULL DEFAULT 'daily',
  custom_days      integer,
  reminder_time    time,
  reminder_enabled boolean NOT NULL DEFAULT false,
  weight           integer NOT NULL DEFAULT 10 CHECK (weight >= 1 AND weight <= 100),
  sort_order       integer NOT NULL DEFAULT 0,
  is_builtin       boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_tasks_pet ON public.daily_tasks(pet_id, is_active);
CREATE INDEX idx_daily_tasks_profile ON public.daily_tasks(profile_id);

-- 4. daily_task_logs — 每日完成记录
-- =============================================
CREATE TABLE public.daily_task_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  pet_id        uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_date     date NOT NULL,
  completed     boolean NOT NULL DEFAULT false,
  completed_at  timestamptz,
  skipped       boolean NOT NULL DEFAULT false,
  UNIQUE(task_id, pet_id, task_date)
);

CREATE INDEX idx_daily_task_logs_pet_date ON public.daily_task_logs(pet_id, task_date);
CREATE INDEX idx_daily_task_logs_task ON public.daily_task_logs(task_id, task_date);
CREATE INDEX idx_daily_task_logs_profile ON public.daily_task_logs(profile_id);

-- 5. RLS 策略
-- =============================================
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_logs ENABLE ROW LEVEL SECURITY;

-- daily_tasks: 用户可读写自己的任务
CREATE POLICY "tasks_select_own" ON public.daily_tasks
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "tasks_insert_own" ON public.daily_tasks
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "tasks_update_own" ON public.daily_tasks
  FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "tasks_delete_own" ON public.daily_tasks
  FOR DELETE TO authenticated USING (profile_id = auth.uid());

-- daily_task_logs: 用户可读写自己的日志
CREATE POLICY "logs_select_own" ON public.daily_task_logs
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "logs_insert_own" ON public.daily_task_logs
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "logs_update_own" ON public.daily_task_logs
  FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "logs_delete_own" ON public.daily_task_logs
  FOR DELETE TO authenticated USING (profile_id = auth.uid());

-- =============================================
-- 6. 辅助函数：为新宠物初始化默认任务模板
-- =============================================
CREATE OR REPLACE FUNCTION public.init_default_daily_tasks()
RETURNS trigger AS $$
DECLARE
  cat_tasks jsonb;
  dog_tasks jsonb;
  t jsonb;
BEGIN
  -- 猫咪默认任务
  cat_tasks := '[
    {"title":"早晨喂食","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"08:00","sort_order":1},
    {"title":"晚上喂食","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"19:00","sort_order":2},
    {"title":"换水","icon":"💧","category":"water","frequency":"daily","weight":15,"reminder_time":"09:00","sort_order":3},
    {"title":"铲屎","icon":"🧹","category":"litter","frequency":"daily","weight":15,"reminder_time":"20:00","sort_order":4},
    {"title":"食盆清洁","icon":"🧼","category":"bowl_clean","frequency":"weekly","weight":10,"reminder_time":"10:00","sort_order":5},
    {"title":"驱虫","icon":"💊","category":"deworm","frequency":"monthly","weight":10,"sort_order":6},
    {"title":"梳毛","icon":"✂","category":"grooming","frequency":"weekly","weight":10,"sort_order":7}
  ]'::jsonb;

  -- 狗狗默认任务
  dog_tasks := '[
    {"title":"早晨喂食","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"08:00","sort_order":1},
    {"title":"晚上喂食","icon":"🍽","category":"feeding","frequency":"daily","weight":20,"reminder_time":"19:00","sort_order":2},
    {"title":"换水","icon":"💧","category":"water","frequency":"daily","weight":10,"reminder_time":"09:00","sort_order":3},
    {"title":"早晨遛狗","icon":"🦮","category":"walk","frequency":"daily","weight":15,"reminder_time":"07:30","sort_order":4},
    {"title":"晚上遛狗","icon":"🦮","category":"walk","frequency":"daily","weight":15,"reminder_time":"19:00","sort_order":5},
    {"title":"食盆清洁","icon":"🧼","category":"bowl_clean","frequency":"weekly","weight":10,"reminder_time":"10:00","sort_order":6},
    {"title":"驱虫","icon":"💊","category":"deworm","frequency":"monthly","weight":10,"sort_order":7}
  ]'::jsonb;

  IF NEW.species = 'cat' THEN
    FOR t IN SELECT * FROM jsonb_array_elements(cat_tasks)
    LOOP
      INSERT INTO public.daily_tasks (pet_id, profile_id, category, title, icon, frequency, weight, reminder_time, sort_order, is_builtin, reminder_enabled)
      VALUES (
        NEW.id, NEW.profile_id,
        (t->>'category')::daily_task_category_t,
        t->>'title', t->>'icon',
        (t->>'frequency')::daily_task_frequency_t,
        (t->>'weight')::integer,
        CASE WHEN t->>'reminder_time' IS NOT NULL THEN (t->>'reminder_time')::time ELSE NULL END,
        (t->>'sort_order')::integer,
        true, true
      );
    END LOOP;
  ELSIF NEW.species = 'dog' THEN
    FOR t IN SELECT * FROM jsonb_array_elements(dog_tasks)
    LOOP
      INSERT INTO public.daily_tasks (pet_id, profile_id, category, title, icon, frequency, weight, reminder_time, sort_order, is_builtin, reminder_enabled)
      VALUES (
        NEW.id, NEW.profile_id,
        (t->>'category')::daily_task_category_t,
        t->>'title', t->>'icon',
        (t->>'frequency')::daily_task_frequency_t,
        (t->>'weight')::integer,
        CASE WHEN t->>'reminder_time' IS NOT NULL THEN (t->>'reminder_time')::time ELSE NULL END,
        (t->>'sort_order')::integer,
        true, true
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新宠物注册时自动触发
DROP TRIGGER IF EXISTS trg_init_default_daily_tasks ON public.pets;
CREATE TRIGGER trg_init_default_daily_tasks
  AFTER INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.init_default_daily_tasks();
