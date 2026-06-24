-- =============================================
-- PFLID Phase 3.95: Data Flywheel & Intelligence Validation Layer
-- Timeline First Architecture — Outcome Intelligence & Evidence System
-- =============================================

-- 1. OUTCOME ATTRIBUTION TABLE
-- Records why a recommendation succeeded or failed with contribution breakdown
CREATE TABLE IF NOT EXISTS pflid.outcome_attribution (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id     uuid NOT NULL,
  pet_id                uuid NOT NULL,
  product_id            uuid NOT NULL,
  -- Outcome windows
  outcome_window_days   int NOT NULL CHECK (outcome_window_days IN (7, 30, 90, 180)),
  -- Outcome determination
  outcome_success       boolean NOT NULL,
  outcome_confidence    numeric(5, 4) NOT NULL CHECK (outcome_confidence BETWEEN 0 AND 1),
  success_probability   numeric(5, 4) NOT NULL CHECK (success_probability BETWEEN 0 AND 1),
  -- Contribution breakdown (must sum to ~1.0)
  contribution_timeline numeric(5, 4) DEFAULT 0,
  contribution_strategy numeric(5, 4) DEFAULT 0,
  contribution_bandit   numeric(5, 4) DEFAULT 0,
  contribution_segment  numeric(5, 4) DEFAULT 0,
  contribution_random   numeric(5, 4) DEFAULT 0,
  -- Health outcome metrics
  health_score_delta    numeric(5, 2),
  symptom_improvement   jsonb DEFAULT '{}',
  owner_adherence       numeric(5, 4),
  -- Metadata
  strategy_id           text,
  policy_version        text,
  segment_key           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  metadata              jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_outcome_attribution_rec
  ON pflid.outcome_attribution (recommendation_id);
CREATE INDEX IF NOT EXISTS idx_outcome_attribution_pet
  ON pflid.outcome_attribution (pet_id, outcome_window_days);
CREATE INDEX IF NOT EXISTS idx_outcome_attribution_product
  ON pflid.outcome_attribution (product_id, outcome_success);
CREATE INDEX IF NOT EXISTS idx_outcome_attribution_window
  ON pflid.outcome_attribution (outcome_window_days, outcome_success);

-- 2. LONGITUDINAL OUTCOME TRACKING
-- Tracks outcomes over multiple time horizons per pet/product
CREATE TABLE IF NOT EXISTS pflid.longitudinal_outcomes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id                uuid NOT NULL,
  product_id            uuid NOT NULL,
  -- Time horizon
  horizon_days          int NOT NULL CHECK (horizon_days IN (7, 30, 90, 180)),
  -- Health metrics at this horizon
  health_score          numeric(5, 2),
  health_score_baseline numeric(5, 2),
  health_score_delta    numeric(5, 2),
  symptom_count         int DEFAULT 0,
  symptom_recurrence    int DEFAULT 0,
  diet_stability        boolean,
  owner_adherence       numeric(5, 4),
  -- Outcome classification
  outcome_class         text NOT NULL DEFAULT 'unknown'
    CHECK (outcome_class IN ('improved', 'stable', 'worsened', 'unknown')),
  -- Measurement
  measured_at           timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  metadata              jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_longitudinal_pet_horizon
  ON pflid.longitudinal_outcomes (pet_id, horizon_days);
CREATE INDEX IF NOT EXISTS idx_longitudinal_product
  ON pflid.longitudinal_outcomes (product_id, horizon_days);
CREATE INDEX IF NOT EXISTS idx_longitudinal_class
  ON pflid.longitudinal_outcomes (outcome_class, horizon_days);

-- 3. PET HEALTH BENCHMARK DATASET
-- Aggregated outcome performance by health category
CREATE TABLE IF NOT EXISTS pflid.health_benchmarks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Benchmark category
  category              text NOT NULL,
  -- e.g., soft_stool_improvement, vomiting_reduction, weight_gain_success, etc.
  subcategory           text DEFAULT '',
  -- Statistics
  sample_size           int NOT NULL DEFAULT 0,
  median_improvement    numeric(5, 2),
  mean_improvement      numeric(5, 2),
  std_deviation         numeric(5, 2),
  confidence_level      numeric(5, 4) DEFAULT 0.95,
  confidence_interval_lower numeric(5, 2),
  confidence_interval_upper numeric(5, 2),
  -- Timeline to improvement
  median_days_to_improvement int,
  p75_days_to_improvement    int,
  -- Versioning
  version               int NOT NULL DEFAULT 1,
  computed_at           timestamptz NOT NULL DEFAULT now(),
  valid_from            timestamptz NOT NULL DEFAULT now(),
  valid_to              timestamptz,
  metadata              jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_health_benchmarks_category
  ON pflid.health_benchmarks (category, version);

-- 4. RECOMMENDATION EFFECTIVENESS SCORES
-- Effectiveness scoring for products, strategies, policies, categories
CREATE TABLE IF NOT EXISTS pflid.effectiveness_scores (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Scored entity
  entity_type           text NOT NULL
    CHECK (entity_type IN ('product', 'strategy', 'policy', 'category')),
  entity_id             text NOT NULL,
  -- Effectiveness components (0-100)
  quality_score         numeric(5, 2) DEFAULT 0,
  accuracy_score        numeric(5, 2) DEFAULT 0,
  consistency_score     numeric(5, 2) DEFAULT 0,
  safety_score          numeric(5, 2) DEFAULT 0,
  -- Composite
  effectiveness_score   numeric(5, 2) NOT NULL DEFAULT 0
    CHECK (effectiveness_score BETWEEN 0 AND 100),
  -- Supporting data
  sample_count          int DEFAULT 0,
  outcome_success_rate  numeric(5, 4),
  avg_confidence        numeric(5, 4),
  -- Versioning
  version               int NOT NULL DEFAULT 1,
  computed_at           timestamptz NOT NULL DEFAULT now(),
  metadata              jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_effectiveness_entity
  ON pflid.effectiveness_scores (entity_type, entity_id, version);
CREATE INDEX IF NOT EXISTS idx_effectiveness_score
  ON pflid.effectiveness_scores (effectiveness_score DESC);

-- 5. EXPLAINABILITY RECORDS
-- Human-readable explanations for recommendations
CREATE TABLE IF NOT EXISTS pflid.explainability_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id     uuid NOT NULL,
  pet_id                uuid NOT NULL,
  product_id            uuid NOT NULL,
  -- Explanation
  explanation_summary   text NOT NULL,
  evidence_list         jsonb NOT NULL DEFAULT '[]',
  timeline_signals      jsonb NOT NULL DEFAULT '[]',
  similar_cases         jsonb DEFAULT '[]',
  -- Confidence
  confidence_level      text NOT NULL DEFAULT 'medium'
    CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
  confidence_score      numeric(5, 4),
  -- Metadata
  strategy_id           text,
  policy_version        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  metadata              jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_explainability_rec
  ON pflid.explainability_records (recommendation_id);
CREATE INDEX IF NOT EXISTS idx_explainability_pet
  ON pflid.explainability_records (pet_id);

-- 6. COHORT INTELLIGENCE
-- Cohort-level outcome metrics and comparisons
CREATE TABLE IF NOT EXISTS pflid.cohort_intelligence (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_key            text NOT NULL,
  -- e.g., kittens, adults, sensitive_stomach, obesity, indoor, outdoor
  cohort_definition     jsonb NOT NULL DEFAULT '{}',
  -- Metrics
  member_count          int NOT NULL DEFAULT 0,
  avg_health_score      numeric(5, 2),
  avg_improvement_rate  numeric(5, 4),
  avg_effectiveness_score numeric(5, 2),
  top_products          jsonb DEFAULT '[]',
  -- Comparison to baseline
  baseline_comparison   jsonb DEFAULT '{}',
  -- Versioning
  version               int NOT NULL DEFAULT 1,
  computed_at           timestamptz NOT NULL DEFAULT now(),
  metadata              jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_cohort_key
  ON pflid.cohort_intelligence (cohort_key, version);

-- 7. DATA FLYWHEEL LOG
-- Tracks the feedback loop iterations
CREATE TABLE IF NOT EXISTS pflid.flywheel_iterations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iteration_number      int NOT NULL,
  -- Inputs
  recommendations_processed int DEFAULT 0,
  outcomes_analyzed     int DEFAULT 0,
  attributions_computed int DEFAULT 0,
  -- Outputs
  benchmarks_updated    int DEFAULT 0,
  effectiveness_recalculated int DEFAULT 0,
  strategy_evaluations  int DEFAULT 0,
  -- Quality metrics
  evidence_quality_score numeric(5, 2),
  data_completeness     numeric(5, 4),
  -- Timing
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  status                text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  error_message         text,
  metadata              jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_flywheel_iteration
  ON pflid.flywheel_iterations (iteration_number DESC);

-- RLS Policies
ALTER TABLE pflid.outcome_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.longitudinal_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.health_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.effectiveness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.explainability_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.cohort_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.flywheel_iterations ENABLE ROW LEVEL SECURITY;

-- Service role policies (read)
CREATE POLICY "outcome_attribution_read_service" ON pflid.outcome_attribution
  FOR SELECT TO service_role USING (true);
CREATE POLICY "longitudinal_outcomes_read_service" ON pflid.longitudinal_outcomes
  FOR SELECT TO service_role USING (true);
CREATE POLICY "health_benchmarks_read_service" ON pflid.health_benchmarks
  FOR SELECT TO service_role USING (true);
CREATE POLICY "effectiveness_scores_read_service" ON pflid.effectiveness_scores
  FOR SELECT TO service_role USING (true);
CREATE POLICY "explainability_records_read_service" ON pflid.explainability_records
  FOR SELECT TO service_role USING (true);
CREATE POLICY "cohort_intelligence_read_service" ON pflid.cohort_intelligence
  FOR SELECT TO service_role USING (true);
CREATE POLICY "flywheel_iterations_read_service" ON pflid.flywheel_iterations
  FOR SELECT TO service_role USING (true);

-- Service role policies (insert)
CREATE POLICY "outcome_attribution_insert_service" ON pflid.outcome_attribution
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "longitudinal_outcomes_insert_service" ON pflid.longitudinal_outcomes
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "health_benchmarks_insert_service" ON pflid.health_benchmarks
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "effectiveness_scores_insert_service" ON pflid.effectiveness_scores
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "explainability_records_insert_service" ON pflid.explainability_records
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "cohort_intelligence_insert_service" ON pflid.cohort_intelligence
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "flywheel_iterations_insert_service" ON pflid.flywheel_iterations
  FOR INSERT TO service_role WITH CHECK (true);

-- Seed: Initial health benchmark categories
INSERT INTO pflid.health_benchmarks (category, subcategory, sample_size, version)
VALUES
  ('soft_stool_improvement', '', 0, 1),
  ('vomiting_reduction', '', 0, 1),
  ('weight_gain_success', '', 0, 1),
  ('weight_loss_success', '', 0, 1),
  ('allergy_improvement', '', 0, 1),
  ('skin_condition_improvement', '', 0, 1),
  ('tear_stain_improvement', '', 0, 1),
  ('digestive_stability', '', 0, 1),
  ('coat_quality_improvement', '', 0, 1),
  ('energy_level_improvement', '', 0, 1)
ON CONFLICT DO NOTHING;

-- Seed: Initial cohort definitions
INSERT INTO pflid.cohort_intelligence (cohort_key, cohort_definition, version)
VALUES
  ('kittens', '{"age_max": 12}', 1),
  ('adults', '{"age_min": 12, "age_max": 84}', 1),
  ('seniors', '{"age_min": 84}', 1),
  ('sensitive_stomach', '{"stomach_health": ["sensitive", "very_sensitive"]}', 1),
  ('normal_digestion', '{"stomach_health": ["normal"]}', 1),
  ('indoor', '{"lifestyle": "indoor"}', 1),
  ('outdoor', '{"lifestyle": "outdoor"}', 1),
  ('obesity', '{"weight_status": "overweight"}', 1),
  ('food_allergy', '{"allergies": ["food"]}', 1)
ON CONFLICT DO NOTHING;
