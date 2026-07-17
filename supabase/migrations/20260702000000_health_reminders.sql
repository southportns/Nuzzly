-- 健康提醒表：疫苗到期、用药结束、定期体检、自定义提醒
CREATE TABLE public.health_reminders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  reminder_type     text NOT NULL CHECK (reminder_type IN ('vaccination', 'medication', 'checkup', 'custom')),
  title             text NOT NULL,
  description       text,
  due_date          date NOT NULL,

  -- 循环提醒
  repeat_interval   text CHECK (repeat_interval IN ('none', 'monthly', 'quarterly', 'yearly')),
  repeat_end_date   date,

  -- 状态
  is_completed      boolean NOT NULL DEFAULT false,
  completed_at      timestamptz,
  last_notified_at  timestamptz,

  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 索引：按宠物+到期日查询（首页卡片用，只查未完成的）
CREATE INDEX idx_health_reminders_due
  ON public.health_reminders(pet_id, due_date)
  WHERE is_completed = false;

-- 索引：按用户查询全部提醒
CREATE INDEX idx_health_reminders_profile
  ON public.health_reminders(profile_id, created_at DESC);

-- RLS
ALTER TABLE public.health_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_reminders_read_auth
  ON public.health_reminders FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY health_reminders_manage_own
  ON public.health_reminders FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- updated_at 自动更新
CREATE TRIGGER update_health_reminders_updated_at
  BEFORE UPDATE ON public.health_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
