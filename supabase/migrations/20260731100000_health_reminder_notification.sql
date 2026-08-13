-- =============================================
-- 扩展通知类型枚举，新增 health_reminder 类型
-- 用于疫苗/驱虫到期前一天发送提醒通知
-- =============================================

ALTER TYPE notification_type_t ADD VALUE IF NOT EXISTS 'health_reminder';

-- 索引：按到期日查询未通知的提醒（cron 用）
CREATE INDEX IF NOT EXISTS idx_health_reminders_notify_due
  ON public.health_reminders(due_date, last_notified_at)
  WHERE is_completed = false;
