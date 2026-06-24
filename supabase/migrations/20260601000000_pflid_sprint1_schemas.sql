-- =============================================
-- Sprint 1: PFLID Infrastructure — Schemas & Tables
-- Multi-schema domain architecture:
--   pflid     = Long-term Pet Food Intelligence
--   analytics = Metrics / Feedback / Growth
--   ai        = AI Runtime Layer
-- =============================================

-- 1. CREATE SCHEMAS
-- =============================================
CREATE SCHEMA IF NOT EXISTS pflid;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS ai;

-- 2. PFLID SCHEMA — Core Intelligence Layer
-- =============================================

-- 2.1 pflid.products — PFLID extension of public.products
-- Stores nutritional profile + long-term outcome metrics
-- References public.products via FK; does NOT duplicate catalog fields
CREATE TABLE pflid.products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  protein_percent     numeric(5,2),
  fat_percent         numeric(5,2),
  fiber_percent       numeric(5,2),
  ash_percent         numeric(5,2),
  moisture_percent    numeric(5,2),
  carbohydrate_est    numeric(5,2),
  grain_free          boolean,
  life_stage          text CHECK (life_stage IN ('kitten','adult','senior','all_life_stages')),
  price_range         text CHECK (price_range IN ('budget','mid','premium','ultra_premium')),
  ingredient_list     jsonb DEFAULT '[]',
  country_of_origin   text,
  long_term_stability numeric(3,2),
  risk_index          integer DEFAULT 0 CHECK (risk_index >= 0 AND risk_index <= 100),
  repurchase_trend    numeric(5,2),
  stool_safety_score  numeric(3,2),
  breed_diversity     integer DEFAULT 0,
  total_reviews_30d   integer DEFAULT 0,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pflid_products_risk ON pflid.products(risk_index);
CREATE INDEX idx_pflid_products_stability ON pflid.products(long_term_stability DESC);
CREATE INDEX idx_pflid_products_brand ON pflid.products(product_id);

-- 2.2 pflid.reviews — Raw review data with structured extraction
-- Complements public.product_reviews (community layer) with PFLID intelligence
CREATE TABLE pflid.reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           uuid UNIQUE REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source_platform     text NOT NULL DEFAULT 'app' CHECK (source_platform IN ('app','jd','taobao','xiaohongshu','bilibili','douyin','tieba','douban','other')),
  source_url          text,
  raw_review_text     text NOT NULL,
  rating              integer CHECK (rating >= 1 AND rating <= 5),
  review_date         timestamptz,
  is_followup         boolean DEFAULT false,
  followup_days       integer,
  raw_json_path       text,
  -- AI extraction results (populated by NLP pipeline)
  extracted_symptoms  jsonb DEFAULT '[]',
  timeline_data       jsonb DEFAULT '[]',
  sentiment           text CHECK (sentiment IN ('positive','neutral','negative','mixed')),
  sentiment_score     numeric(3,2),
  trust_flags         jsonb DEFAULT '[]',
  extraction_version  text,
  extraction_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pflid_reviews_product ON pflid.reviews(product_id, review_date DESC);
CREATE INDEX idx_pflid_reviews_platform ON pflid.reviews(source_platform, review_date DESC);
CREATE INDEX idx_pflid_reviews_sentiment ON pflid.reviews(sentiment);
CREATE INDEX idx_pflid_reviews_raw ON pflid.reviews(raw_json_path) WHERE raw_json_path IS NOT NULL;

-- 2.3 pflid.structured_symptoms — AI-extracted symptoms
CREATE TABLE pflid.structured_symptoms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       uuid NOT NULL REFERENCES pflid.reviews(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  symptom_type    text NOT NULL CHECK (symptom_type IN (
    'soft_stool','diarrhea','constipation','vomit','black_chin',
    'tear_stain','hair_loss','weight_loss','weight_gain','lethargy',
    'coat_improvement','energy_increase','allergy','bad_breath','other'
  )),
  severity        numeric(3,2) CHECK (severity >= 0 AND severity <= 1),
  confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  detected_by     text NOT NULL DEFAULT 'nlp_pipeline',
  context_snippet text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_symptoms_review ON pflid.structured_symptoms(review_id);
CREATE INDEX idx_symptoms_product_type ON pflid.structured_symptoms(product_id, symptom_type);
CREATE INDEX idx_symptoms_severity ON pflid.structured_symptoms(product_id, severity DESC);

-- 2.4 pflid.review_timelines — Long-term outcome timelines
CREATE TABLE pflid.review_timelines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     uuid NOT NULL REFERENCES pflid.reviews(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  month_index   integer NOT NULL CHECK (month_index >= 0 AND month_index <= 24),
  status        text NOT NULL CHECK (status IN ('positive','neutral','negative','mixed','unknown')),
  symptoms      jsonb DEFAULT '[]',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, month_index)
);

CREATE INDEX idx_timelines_review ON pflid.review_timelines(review_id, month_index);
CREATE INDEX idx_timelines_product_status ON pflid.review_timelines(product_id, month_index, status);

-- 2.5 pflid.followups — PFLID long-term follow-up tracking
CREATE TABLE pflid.followups (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         uuid NOT NULL REFERENCES pflid.reviews(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followup_day      integer NOT NULL CHECK (followup_day IN (30, 60, 90, 180, 365)),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped','expired')),
  health_changes    jsonb DEFAULT '{}',
  continued_usage   boolean,
  repurchase_status text CHECK (repurchase_status IN ('repurchased','will_repurchase','will_not','undecided')),
  satisfaction      integer CHECK (satisfaction >= 1 AND satisfaction <= 5),
  note              text,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, followup_day)
);

CREATE INDEX idx_pf_followups_profile ON pflid.followups(profile_id, status);
CREATE INDEX idx_pf_followups_day ON pflid.followups(followup_day, status);
CREATE INDEX idx_pf_followups_review ON pflid.followups(review_id);

-- 2.6 pflid.risk_events — PFLID risk intelligence aggregation
CREATE TABLE pflid.risk_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  risk_event_id     uuid REFERENCES public.risk_events(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text,
  risk_category     text NOT NULL CHECK (risk_category IN (
    'batch_quality','formula_change','ingredient_concern','health_complaint_surge',
    'recall','packaging_issue','marketing_dispute','supply_chain','regulatory','other'
  )),
  severity          text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  trend             text NOT NULL DEFAULT 'stable' CHECK (trend IN ('rising','declining','stable')),
  affected_reviews  integer DEFAULT 0,
  detection_source  text DEFAULT 'manual',
  resolution_status text NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open','monitoring','mitigated','resolved')),
  event_date        date NOT NULL DEFAULT CURRENT_DATE,
  resolved_at       timestamptz,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pf_risk_product ON pflid.risk_events(product_id, event_date DESC);
CREATE INDEX idx_pf_risk_severity ON pflid.risk_events(severity, resolution_status);
CREATE INDEX idx_pf_risk_active ON pflid.risk_events(event_date DESC) WHERE resolution_status IN ('open','monitoring');

-- 2.7 pflid.embeddings_metadata — Vector embedding index tracking
CREATE TABLE pflid.embeddings_metadata (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       text NOT NULL CHECK (source_type IN ('review','product','symptom','followup')),
  source_id         uuid NOT NULL,
  embedding_model   text NOT NULL,
  embedding_version text,
  vector_dim        integer NOT NULL,
  qdrant_collection text NOT NULL,
  qdrant_point_id   text,
  chunk_index       integer DEFAULT 0,
  total_chunks      integer DEFAULT 1,
  token_count       integer,
  last_indexed_at   timestamptz,
  expires_at        timestamptz,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_type, source_id, embedding_model)
);

CREATE INDEX idx_emb_source ON pflid.embeddings_metadata(source_type, source_id);
CREATE INDEX idx_emb_collection ON pflid.embeddings_metadata(qdrant_collection, last_indexed_at DESC);
CREATE INDEX idx_emb_expires ON pflid.embeddings_metadata(expires_at) WHERE expires_at IS NOT NULL;

-- 3. ANALYTICS SCHEMA — Metrics / Feedback / Growth
-- =============================================

-- 3.1 analytics.recommendation_events — Recommendation funnel tracking
CREATE TABLE analytics.recommendation_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id            uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  session_id        text,
  event_type        text NOT NULL CHECK (event_type IN ('impression','click','detail_view','dwell','accept','reject','share','save')),
  position          integer,
  source            text DEFAULT 'ai_recommendation',
  score             numeric(5,2),
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reco_events_profile ON analytics.recommendation_events(profile_id, created_at DESC);
CREATE INDEX idx_reco_events_product ON analytics.recommendation_events(product_id, event_type);
CREATE INDEX idx_reco_events_type ON analytics.recommendation_events(event_type, created_at DESC);
CREATE INDEX idx_reco_events_session ON analytics.recommendation_events(session_id) WHERE session_id IS NOT NULL;

-- 3.2 analytics.ctr_logs — Click-through rate tracking
CREATE TABLE analytics.ctr_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES public.products(id) ON DELETE CASCADE,
  context           text NOT NULL CHECK (context IN ('homepage','search','recommendation','product_page','ai_chat','email','notification')),
  impressions       integer DEFAULT 0,
  clicks            integer DEFAULT 0,
  ctr               numeric(5,4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN clicks::numeric / impressions ELSE 0 END
  ) STORED,
  period            date NOT NULL DEFAULT CURRENT_DATE,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, context, period)
);

CREATE INDEX idx_ctr_product ON analytics.ctr_logs(product_id, period DESC);
CREATE INDEX idx_ctr_context ON analytics.ctr_logs(context, period DESC);

-- 3.3 analytics.conversion_events — Conversion funnel tracking
CREATE TABLE analytics.conversion_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES public.products(id) ON DELETE CASCADE,
  funnel_step       text NOT NULL CHECK (funnel_step IN (
    'landing','product_view','review_read','add_to_compare',
    'external_click','purchase_intent','review_submitted','followup_completed'
  )),
  source            text,
  session_id        text,
  time_to_convert_s integer,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversion_profile ON analytics.conversion_events(profile_id, created_at DESC);
CREATE INDEX idx_conversion_step ON analytics.conversion_events(funnel_step, created_at DESC);
CREATE INDEX idx_conversion_product ON analytics.conversion_events(product_id, funnel_step);

-- 3.4 analytics views over existing public tables (no data duplication)
CREATE VIEW analytics.feedback_events_view AS
  SELECT * FROM public.feedback_events;

CREATE VIEW analytics.metrics_events_view AS
  SELECT * FROM public.metrics_events;

-- 4. AI SCHEMA — AI Runtime Layer
-- =============================================

-- 4.1 ai.model_outputs — Structured AI model outputs
CREATE TABLE ai.model_outputs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name        text NOT NULL,
  model_version     text,
  output_type       text NOT NULL CHECK (output_type IN (
    'recommendation','symptom_extraction','timeline_extraction',
    'sentiment_analysis','risk_assessment','summary','embedding','chat','other'
  )),
  input_hash        text,
  output_data       jsonb NOT NULL DEFAULT '{}',
  tokens_prompt     integer,
  tokens_completion integer,
  latency_ms        integer,
  cost_estimate     numeric(10,6),
  is_cached         boolean DEFAULT false,
  cache_hit         boolean DEFAULT false,
  trace_id          text,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_model_outputs_type ON ai.model_outputs(output_type, created_at DESC);
CREATE INDEX idx_model_outputs_model ON ai.model_outputs(model_name, created_at DESC);
CREATE INDEX idx_model_outputs_trace ON ai.model_outputs(trace_id) WHERE trace_id IS NOT NULL;

-- 4.2 ai.recommendation_cache — Cached AI recommendations
CREATE TABLE ai.recommendation_cache (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key         text NOT NULL UNIQUE,
  pet_id            uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  context_hash      text,
  recommendations   jsonb NOT NULL DEFAULT '[]',
  model_version     text,
  expires_at        timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  hit_count         integer DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reco_cache_key ON ai.recommendation_cache(cache_key);
CREATE INDEX idx_reco_cache_expires ON ai.recommendation_cache(expires_at);
CREATE INDEX idx_reco_cache_pet ON ai.recommendation_cache(pet_id);

-- 4.3 ai.agent_logs — Agent execution logs
CREATE TABLE ai.agent_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name        text NOT NULL,
  agent_version     text,
  task_type         text NOT NULL,
  task_input        jsonb DEFAULT '{}',
  task_output       jsonb DEFAULT '{}',
  status            text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','timeout','cancelled')),
  duration_ms       integer,
  error_message     text,
  retry_count       integer DEFAULT 0,
  trace_id          text,
  parent_log_id     uuid REFERENCES ai.agent_logs(id) ON DELETE SET NULL,
  metadata          jsonb DEFAULT '{}',
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

CREATE INDEX idx_agent_logs_name ON ai.agent_logs(agent_name, started_at DESC);
CREATE INDEX idx_agent_logs_status ON ai.agent_logs(status, started_at DESC);
CREATE INDEX idx_agent_logs_trace ON ai.agent_logs(trace_id) WHERE trace_id IS NOT NULL;

-- 4.4 ai.semantic_queries — Semantic search query log
CREATE TABLE ai.semantic_queries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  query_text        text NOT NULL,
  query_embedding_id uuid,
  top_k             integer DEFAULT 10,
  results_count      integer,
  results_json      jsonb DEFAULT '[]',
  latency_ms        integer,
  qdrant_collection text,
  relevance_feedback jsonb DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_semantic_query_profile ON ai.semantic_queries(profile_id, created_at DESC);
CREATE INDEX idx_semantic_query_collection ON ai.semantic_queries(qdrant_collection, created_at DESC);

-- 5. ROW LEVEL SECURITY
-- =============================================

-- PFLID schema
ALTER TABLE pflid.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.structured_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.review_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.embeddings_metadata ENABLE ROW LEVEL SECURITY;

-- Analytics schema
ALTER TABLE analytics.recommendation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.ctr_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.conversion_events ENABLE ROW LEVEL SECURITY;

-- AI schema
ALTER TABLE ai.model_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.semantic_queries ENABLE ROW LEVEL SECURITY;

-- PFLID: public read (anon + authenticated)
CREATE POLICY "pflid_products_read_public" ON pflid.products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "pflid_reviews_read_public" ON pflid.reviews
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "pflid_symptoms_read_public" ON pflid.structured_symptoms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "pflid_timelines_read_public" ON pflid.review_timelines
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "pflid_risk_read_public" ON pflid.risk_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "pflid_embeddings_read_admin" ON pflid.embeddings_metadata
  FOR SELECT TO authenticated USING (true);

-- PFLID: owner-based write
CREATE POLICY "pflid_followups_manage_own" ON pflid.followups
  FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Analytics: insert from authenticated users, read own
CREATE POLICY "reco_events_insert_auth" ON analytics.recommendation_events
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "reco_events_read_own" ON analytics.recommendation_events
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "conversion_insert_auth" ON analytics.conversion_events
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "conversion_read_own" ON analytics.conversion_events
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "ctr_read_auth" ON analytics.ctr_logs
  FOR SELECT TO authenticated USING (true);

-- AI: read own, insert auth
CREATE POLICY "model_outputs_read_auth" ON ai.model_outputs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reco_cache_read_own" ON ai.recommendation_cache
  FOR SELECT TO authenticated USING (profile_id = auth.uid() OR profile_id IS NULL);

CREATE POLICY "agent_logs_read_auth" ON ai.agent_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "semantic_queries_manage_own" ON ai.semantic_queries
  FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- 6. FUNCTIONS & TRIGGERS
-- =============================================

-- 6.1 Auto-update updated_at for pflid core tables
CREATE OR REPLACE FUNCTION pflid.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pflid_products_updated_at BEFORE UPDATE ON pflid.products
  FOR EACH ROW EXECUTE FUNCTION pflid.update_updated_at();

CREATE TRIGGER pflid_reviews_updated_at BEFORE UPDATE ON pflid.reviews
  FOR EACH ROW EXECUTE FUNCTION pflid.update_updated_at();

CREATE TRIGGER pflid_followups_updated_at BEFORE UPDATE ON pflid.followups
  FOR EACH ROW EXECUTE FUNCTION pflid.update_updated_at();

CREATE TRIGGER pflid_risk_events_updated_at BEFORE UPDATE ON pflid.risk_events
  FOR EACH ROW EXECUTE FUNCTION pflid.update_updated_at();

-- 6.2 Auto-update updated_at for ai cache
CREATE OR REPLACE FUNCTION ai.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reco_cache_updated_at BEFORE UPDATE ON ai.recommendation_cache
  FOR EACH ROW EXECUTE FUNCTION ai.update_updated_at();

-- 6.3 Invalidate expired recommendation cache entries
CREATE OR REPLACE FUNCTION ai.purge_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai.recommendation_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 7. SCHEMA USAGE GRANTS
-- =============================================
GRANT USAGE ON SCHEMA pflid TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA analytics TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA ai TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pflid TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA analytics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai TO service_role;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA pflid TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA analytics TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ai TO service_role;
