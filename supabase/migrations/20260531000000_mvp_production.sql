-- Phase 5 MVP: feedback loop + metrics tables

-- 1. feedback_events: user action tracking for closed-loop learning
CREATE TABLE public.feedback_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN ('view','click','accept','reject','purchase')),
  product_id    uuid REFERENCES public.products(id) ON DELETE SET NULL,
  source        text DEFAULT 'recommendation',
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_profile ON public.feedback_events(profile_id, created_at DESC);
CREATE INDEX idx_feedback_product ON public.feedback_events(product_id, event_type);
CREATE INDEX idx_feedback_type ON public.feedback_events(event_type, created_at DESC);

ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert_own" ON public.feedback_events FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "feedback_read_own" ON public.feedback_events FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- 2. metrics_events: lightweight system & business metrics
CREATE TABLE public.metrics_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name   text NOT NULL,
  metric_type   text NOT NULL CHECK (metric_type IN ('latency','business','system')),
  value         numeric(9,3) NOT NULL,
  tags          jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_name ON public.metrics_events(metric_name, created_at DESC);
CREATE INDEX idx_metrics_type ON public.metrics_events(metric_type, created_at DESC);
CREATE INDEX idx_metrics_created ON public.metrics_events(created_at DESC);

ALTER TABLE public.metrics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_insert_all" ON public.metrics_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "metrics_read_auth" ON public.metrics_events FOR SELECT TO authenticated USING (true);

-- 3. Performance indexes on existing high-traffic tables
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON public.product_reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trace_log_created ON public.recommendation_trace_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_rec_profile ON public.recommendation_feedback(profile_id, created_at DESC);
