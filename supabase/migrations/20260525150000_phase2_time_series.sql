-- Phase 2: Follow-up Time-Series Architecture
-- Splits review_followups into schedules + entries for longitudinal data

-- 1. NEW ENUMS
CREATE TYPE followup_status_t AS ENUM ('pending', 'reminded', 'completed', 'overdue');
CREATE TYPE notification_channel_t AS ENUM ('in_app', 'email', 'push');
CREATE TYPE notification_type_t AS ENUM ('followup_reminder', 'followup_overdue', 'review_published', 'trust_score_change');

-- 2. review_followup_schedules (reminder/scheduling layer)
CREATE TABLE public.review_followup_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followup_day    integer NOT NULL CHECK (followup_day IN (7, 14, 30, 60, 90, 180)),
  due_date        date NOT NULL,
  status          followup_status_t NOT NULL DEFAULT 'pending',
  reminder_sent_at timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, followup_day)
);

CREATE INDEX idx_schedules_profile_status ON public.review_followup_schedules(profile_id, status);
CREATE INDEX idx_schedules_due ON public.review_followup_schedules(due_date) WHERE status IN ('pending', 'reminded');

-- 3. review_followup_entries (time-series data layer)
CREATE TABLE public.review_followup_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id       uuid NOT NULL REFERENCES public.review_followup_schedules(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stool_status      text CHECK (stool_status IN ('improved', 'unchanged', 'worsened', 'not_applicable')),
  coat_status       text CHECK (coat_status IN ('improved', 'unchanged', 'worsened', 'not_applicable')),
  energy_status     text CHECK (energy_status IN ('improved', 'unchanged', 'worsened', 'not_applicable')),
  appetite_status   text CHECK (appetite_status IN ('improved', 'unchanged', 'worsened', 'not_applicable')),
  weight_change     text CHECK (weight_change IN ('gained', 'lost', 'unchanged', 'not_applicable')),
  continued_usage   boolean,
  repurchase_intent text CHECK (repurchase_intent IN ('will_repurchase', 'undecided', 'will_not')),
  overall_satisfaction integer CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
  health_notes      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_schedule ON public.review_followup_entries(schedule_id, created_at DESC);
CREATE INDEX idx_entries_profile ON public.review_followup_entries(profile_id, created_at DESC);

-- 4. notifications table
CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            notification_type_t NOT NULL,
  channel         notification_channel_t NOT NULL DEFAULT 'in_app',
  title           text NOT NULL,
  body            text,
  action_url      text,
  is_read         boolean NOT NULL DEFAULT false,
  is_sent         boolean NOT NULL DEFAULT false,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_profile ON public.notifications(profile_id, is_read, created_at DESC);

-- 5. ALTER product_metrics_daily
ALTER TABLE public.product_metrics_daily
  ADD COLUMN IF NOT EXISTS breed_match_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS sensitive_gut_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS allergy_risk_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS long_term_stability_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS coat_improve_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS energy_improve_rate numeric(5,2);

-- 6. RLS for new tables
ALTER TABLE public.review_followup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_followup_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_read_own" ON public.review_followup_schedules
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "entries_read_own" ON public.review_followup_entries
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "entries_insert_own" ON public.review_followup_entries
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- 7. Replace trigger: creates review_followup_schedules instead of review_followups
CREATE OR REPLACE FUNCTION public.create_review_followup_schedules()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.review_followup_schedules (review_id, profile_id, followup_day, due_date)
  VALUES
    (NEW.id, NEW.profile_id, 7,   (NEW.created_at::date + 7)),
    (NEW.id, NEW.profile_id, 14,  (NEW.created_at::date + 14)),
    (NEW.id, NEW.profile_id, 30,  (NEW.created_at::date + 30)),
    (NEW.id, NEW.profile_id, 60,  (NEW.created_at::date + 60)),
    (NEW.id, NEW.profile_id, 90,  (NEW.created_at::date + 90)),
    (NEW.id, NEW.profile_id, 180, (NEW.created_at::date + 180));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger and recreate
DROP TRIGGER IF EXISTS after_review_insert ON public.product_reviews;
CREATE TRIGGER after_review_insert AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.create_review_followup_schedules();

-- 8. Auto-refresh metrics on followup entry insert (database-layer trigger, no API call needed)
CREATE OR REPLACE FUNCTION public.trigger_refresh_metrics()
RETURNS trigger AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT r.product_id INTO pid
  FROM public.product_reviews r
  JOIN public.review_followup_schedules s ON s.review_id = r.id
  WHERE s.id = NEW.schedule_id;

  IF pid IS NOT NULL THEN
    PERFORM public.refresh_product_metrics(CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_followup_entry_insert
  AFTER INSERT ON public.review_followup_entries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_metrics();

-- 9. Enhanced refresh_product_metrics with followup entry aggregation
CREATE OR REPLACE FUNCTION public.refresh_product_metrics(target_date date DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO public.product_metrics_daily (
    product_id, date, average_rating, review_count, new_review_count,
    stool_issue_rate, repurchase_rate, sensitive_stomach_rating,
    kitten_suitable_rating, senior_suitable_rating,
    coat_improve_rate, energy_improve_rate,
    breed_match_score, sensitive_gut_score, long_term_stability_score,
    total_reviews_cumulative, data_completeness
  )
  SELECT
    p.id,
    target_date,
    AVG(r.overall_rating) FILTER (WHERE r.created_at::date = target_date)::numeric(3,2),
    COUNT(r.id) FILTER (WHERE r.created_at::date = target_date),
    COUNT(r.id) FILTER (WHERE r.created_at::date = target_date),
    CASE WHEN COUNT(r.id) FILTER (WHERE r.stool_rating IS NOT NULL AND r.created_at::date = target_date) > 0
      THEN COUNT(*) FILTER (WHERE r.stool_rating <= 2 AND r.created_at::date = target_date)::float
           / COUNT(*) FILTER (WHERE r.stool_rating IS NOT NULL AND r.created_at::date = target_date)
      ELSE 0 END,
    CASE WHEN COUNT(r.id) FILTER (WHERE r.would_repurchase IS NOT NULL AND r.created_at::date = target_date) > 0
      THEN COUNT(*) FILTER (WHERE r.would_repurchase = true AND r.created_at::date = target_date)::float
           / COUNT(*) FILTER (WHERE r.would_repurchase IS NOT NULL AND r.created_at::date = target_date)
      ELSE 0 END,
    AVG(r.overall_rating) FILTER (WHERE pet.stomach_health = 'sensitive' AND r.created_at::date = target_date)::numeric(3,2),
    AVG(r.overall_rating) FILTER (WHERE p.applicable_age IN ('kitten','all') AND r.created_at::date = target_date)::numeric(3,2),
    AVG(r.overall_rating) FILTER (WHERE p.applicable_age IN ('senior','all') AND r.created_at::date = target_date)::numeric(3,2),
    CASE WHEN COUNT(e.id) FILTER (WHERE e.coat_status IS NOT NULL) > 0
      THEN COUNT(*) FILTER (WHERE e.coat_status = 'improved')::float / COUNT(*) FILTER (WHERE e.coat_status IS NOT NULL)
      ELSE 0 END,
    CASE WHEN COUNT(e.id) FILTER (WHERE e.energy_status IS NOT NULL) > 0
      THEN COUNT(*) FILTER (WHERE e.energy_status = 'improved')::float / COUNT(*) FILTER (WHERE e.energy_status IS NOT NULL)
      ELSE 0 END,
    AVG(r.overall_rating)::numeric(3,2),
    AVG(r.overall_rating) FILTER (WHERE pet.stomach_health IN ('sensitive', 'very_sensitive'))::numeric(3,2),
    CASE WHEN STDDEV(r.overall_rating) IS NOT NULL
      THEN GREATEST(0, 5 - COALESCE(STDDEV(r.overall_rating), 0))::numeric(5,2)
      ELSE 0 END,
    (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = p.id AND created_at::date <= target_date),
    CASE WHEN target_date = CURRENT_DATE - 1 THEN 'full' ELSE 'partial' END
  FROM public.products p
  LEFT JOIN public.product_reviews r ON r.product_id = p.id
  LEFT JOIN public.pets pet ON r.pet_id = pet.id
  LEFT JOIN public.review_followup_schedules s ON s.review_id = r.id
  LEFT JOIN public.review_followup_entries e ON e.schedule_id = s.id
  WHERE p.is_active = true
  GROUP BY p.id
  ON CONFLICT (product_id, date) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    review_count = EXCLUDED.review_count,
    new_review_count = EXCLUDED.new_review_count,
    stool_issue_rate = EXCLUDED.stool_issue_rate,
    repurchase_rate = EXCLUDED.repurchase_rate,
    sensitive_stomach_rating = EXCLUDED.sensitive_stomach_rating,
    kitten_suitable_rating = EXCLUDED.kitten_suitable_rating,
    senior_suitable_rating = EXCLUDED.senior_suitable_rating,
    coat_improve_rate = EXCLUDED.coat_improve_rate,
    energy_improve_rate = EXCLUDED.energy_improve_rate,
    breed_match_score = EXCLUDED.breed_match_score,
    sensitive_gut_score = EXCLUDED.sensitive_gut_score,
    long_term_stability_score = EXCLUDED.long_term_stability_score,
    total_reviews_cumulative = EXCLUDED.total_reviews_cumulative,
    data_completeness = EXCLUDED.data_completeness;
END;
$$ LANGUAGE plpgsql;

-- 10. Update get_product_context_for_ai to use new tables
CREATE OR REPLACE FUNCTION public.get_product_context_for_ai(p_product_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'product', (SELECT row_to_json(p.*) FROM public.products p WHERE p.id = p_product_id),
    'ingredients', (SELECT jsonb_agg(row_to_json(i.*)) FROM public.product_ingredients i WHERE i.product_id = p_product_id),
    'versions', (SELECT jsonb_agg(row_to_json(v.*) ORDER BY v.effective_date DESC) FROM public.product_versions v WHERE v.product_id = p_product_id),
    'recent_reviews', (SELECT jsonb_agg(row_to_json(r.*)) FROM public.product_reviews r WHERE r.product_id = p_product_id ORDER BY r.created_at DESC LIMIT 50),
    'followup_entries_summary', (
      SELECT jsonb_build_object(
        'total_entries', COUNT(*),
        'stool_improve_rate', CASE WHEN COUNT(*) FILTER (WHERE e.stool_status IS NOT NULL) > 0
          THEN COUNT(*) FILTER (WHERE e.stool_status = 'improved')::float / COUNT(*) FILTER (WHERE e.stool_status IS NOT NULL) ELSE 0 END,
        'coat_improve_rate', CASE WHEN COUNT(*) FILTER (WHERE e.coat_status IS NOT NULL) > 0
          THEN COUNT(*) FILTER (WHERE e.coat_status = 'improved')::float / COUNT(*) FILTER (WHERE e.coat_status IS NOT NULL) ELSE 0 END,
        'continued_usage_rate', CASE WHEN COUNT(*) > 0
          THEN COUNT(*) FILTER (WHERE e.continued_usage = true)::float / COUNT(*) ELSE 0 END
      )
      FROM public.review_followup_entries e
      JOIN public.review_followup_schedules s ON e.schedule_id = s.id
      JOIN public.product_reviews r ON s.review_id = r.id
      WHERE r.product_id = p_product_id
    ),
    'metrics_90d', (SELECT jsonb_agg(row_to_json(m.*) ORDER BY m.date DESC) FROM public.product_metrics_daily m WHERE m.product_id = p_product_id AND m.date >= CURRENT_DATE - 90),
    'risk_events', (SELECT jsonb_agg(row_to_json(re.*) ORDER BY re.event_date DESC) FROM public.risk_events re WHERE re.product_id = p_product_id AND re.resolved = false)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Drop old review_followups table
DROP TABLE IF EXISTS public.review_followups CASCADE;
