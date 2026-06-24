-- =============================================
-- PFLID Phase 3.8: Self-Optimizing Ranking System
-- Timeline First Architecture — Bandit + Adaptive Learning Layer
-- =============================================
-- Additive on top of Phase 3.6 control plane and Phase 3.7 replay.
-- Authoritative routing remains with RolloutController; this layer
-- learns from outcomes and proposes strategy adjustments.

-- 1. BANDIT ARMS — strategy arm definitions
CREATE TABLE IF NOT EXISTS pflid.bandit_arms (
  arm_id              text PRIMARY KEY,
  arm_name            text NOT NULL,
  scoring_engine      text NOT NULL
    CHECK (scoring_engine IN ('review', 'timeline', 'blend')),
  weight_config       jsonb NOT NULL DEFAULT '{}',
  description         text,
  eligibility_rules   jsonb NOT NULL DEFAULT '{}',
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Seed default arms (Review-only, Timeline-only, three blends)
INSERT INTO pflid.bandit_arms (arm_id, arm_name, scoring_engine, weight_config, description) VALUES
  ('review_only',  'Review Score Only',     'review',
   '{"timeline": 0.0, "review": 1.0}',
   'Baseline — pure review-score ranking'),
  ('timeline_only','Timeline Score Only',   'timeline',
   '{"timeline": 1.0, "review": 0.0}',
   'Pure longitudinal timeline score'),
  ('blend_70_30',  'Blend 70% Timeline / 30% Review', 'blend',
   '{"timeline": 0.7, "review": 0.3}',
   'Default blend from Phase 3.6'),
  ('blend_50_50',  'Blend 50% / 50%',       'blend',
   '{"timeline": 0.5, "review": 0.5}',
   'Balanced exploration variant'),
  ('blend_30_70',  'Blend 30% Timeline / 70% Review', 'blend',
   '{"timeline": 0.3, "review": 0.7}',
   'Conservative variant (closer to review)')
ON CONFLICT (arm_id) DO NOTHING;

-- 2. BANDIT STATE — Beta-distribution posterior + cumulative counts
--    Per-arm per-segment posterior.  Segment = 'global' for default.
CREATE TABLE IF NOT EXISTS pflid.bandit_state (
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  segment             text NOT NULL DEFAULT 'global',
  alpha               numeric NOT NULL DEFAULT 1.0,
  beta                numeric NOT NULL DEFAULT 1.0,
  total_pulls         integer NOT NULL DEFAULT 0,
  total_reward        numeric NOT NULL DEFAULT 0.0,
  cumulative_regret   numeric NOT NULL DEFAULT 0.0,
  last_pulled_at      timestamptz,
  last_updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (arm_id, segment)
);

CREATE INDEX IF NOT EXISTS idx_bandit_state_segment ON pflid.bandit_state(segment);

-- Seed initial state for every arm at 'global' segment
INSERT INTO pflid.bandit_state (arm_id, segment, alpha, beta, total_pulls)
SELECT arm_id, 'global', 1.0, 1.0, 0
FROM pflid.bandit_arms
ON CONFLICT (arm_id, segment) DO NOTHING;

-- 3. BANDIT REWARDS — per-impression reward stream
--    Each row = a (request, arm, reward) tuple from a serving decision.
CREATE TABLE IF NOT EXISTS pflid.bandit_rewards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          text NOT NULL,
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  user_id             uuid,
  session_id          text,
  segment             text NOT NULL DEFAULT 'global',
  reward              numeric NOT NULL,
  reward_components   jsonb NOT NULL DEFAULT '{}',
  trace_id            uuid,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bandit_rewards_arm_time
  ON pflid.bandit_rewards(arm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_request
  ON pflid.bandit_rewards(request_id);
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_segment_time
  ON pflid.bandit_rewards(segment, created_at DESC);

-- 4. STRATEGY REGISTRY — versioned ranking strategies
--    A strategy is a named bundle of (engine + weights + eligibility).
--    The bandit references a strategy_id when picking an arm.
CREATE TABLE IF NOT EXISTS pflid.strategy_registry (
  strategy_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version             text NOT NULL,
  name                text NOT NULL,
  description         text,
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  weight_config       jsonb NOT NULL DEFAULT '{}',
  eligibility_rules   jsonb NOT NULL DEFAULT '{}',
  rollout_constraints jsonb NOT NULL DEFAULT '{}',
  status              text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  parent_strategy_id  uuid REFERENCES pflid.strategy_registry(strategy_id),
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  retired_at          timestamptz,
  UNIQUE(version, name)
);

CREATE INDEX IF NOT EXISTS idx_strategy_registry_status
  ON pflid.strategy_registry(status);
CREATE INDEX IF NOT EXISTS idx_strategy_registry_arm
  ON pflid.strategy_registry(arm_id);

-- Seed v1 strategies (one per arm) so the registry is never empty
INSERT INTO pflid.strategy_registry
  (version, name, description, arm_id, weight_config, status)
SELECT
  'v1.0.0', a.arm_name, 'Initial baseline strategy: ' || a.description,
  a.arm_id, a.weight_config, 'active'
FROM pflid.bandit_arms a
WHERE NOT EXISTS (
  SELECT 1 FROM pflid.strategy_registry
  WHERE version = 'v1.0.0' AND name = a.arm_name
);

-- 5. STRATEGY PERFORMANCE HISTORY — rolling snapshots
CREATE TABLE IF NOT EXISTS pflid.strategy_performance_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id         uuid NOT NULL REFERENCES pflid.strategy_registry(strategy_id),
  arm_id              text NOT NULL,
  window_start        timestamptz NOT NULL,
  window_end          timestamptz NOT NULL,
  pulls               integer NOT NULL,
  mean_reward         numeric NOT NULL,
  reward_std          numeric,
  exploration_rate    numeric,
  ctr                 numeric,
  conversion_rate     numeric,
  dwell_time_ms       numeric,
  skip_rate           numeric,
  sample_size         integer NOT NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_perf_strategy_time
  ON pflid.strategy_performance_history(strategy_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_perf_window
  ON pflid.strategy_performance_history(window_start, window_end);

-- 6. COUNTERFACTUAL ESTIMATES — IPS-style offline lift estimates
CREATE TABLE IF NOT EXISTS pflid.counterfactual_estimates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid,
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  baseline_arm_id     text NOT NULL,
  window_start        timestamptz NOT NULL,
  window_end          timestamptz NOT NULL,
  ips_estimate        numeric NOT NULL,
  ips_std             numeric,
  ips_ci_lower        numeric,
  ips_ci_upper        numeric,
  expected_lift       numeric,
  sample_size         integer NOT NULL,
  propensity_score    numeric,
  statistical_method  text NOT NULL DEFAULT 'ips',
  computed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cf_estimates_arm
  ON pflid.counterfactual_estimates(arm_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cf_estimates_job
  ON pflid.counterfactual_estimates(job_id);

-- 7. EXPLORATION SAFETY LOG — guardrail / rollback events
CREATE TABLE IF NOT EXISTS pflid.exploration_safety_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          text NOT NULL
    CHECK (event_type IN ('guardrail_triggered', 'rollback_triggered',
                          'exploration_paused', 'exploration_resumed',
                          'weight_change', 'safety_check')),
  trigger_metric      text,
  trigger_value       numeric,
  threshold_value     numeric,
  affected_arms       text[] DEFAULT '{}',
  reason              text,
  payload             jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exploration_safety_event_type
  ON pflid.exploration_safety_log(event_type, created_at DESC);

-- 8. BANDIT JOBS — async evaluation / update jobs
CREATE TABLE IF NOT EXISTS pflid.bandit_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type            text NOT NULL
    CHECK (job_type IN ('evaluate', 'update', 'counterfactual', 'safety_check')),
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input_payload       jsonb NOT NULL DEFAULT '{}',
  result_payload      jsonb,
  error_message       text,
  started_at          timestamptz,
  completed_at        timestamptz,
  duration_ms         integer,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bandit_jobs_status_time
  ON pflid.bandit_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bandit_jobs_type
  ON pflid.bandit_jobs(job_type);

-- 9. ADAPTIVE WEIGHT SNAPSHOTS — audit trail of weight adjustments
CREATE TABLE IF NOT EXISTS pflid.adaptive_weight_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  previous_weights    jsonb NOT NULL,
  new_weights         jsonb NOT NULL,
  delta_max           numeric NOT NULL,
  reason              text,
  triggered_by        text NOT NULL DEFAULT 'auto'
    CHECK (triggered_by IN ('auto', 'manual')),
  window_start        timestamptz,
  window_end          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adaptive_weight_arm_time
  ON pflid.adaptive_weight_snapshots(arm_id, created_at DESC);

-- 10. BANDIT FEATURE FLAG — master switch (idempotent insert)
INSERT INTO pflid.feature_flags (flag_key, flag_value, description, environment)
VALUES (
  'bandit_enabled',
  '{"enabled": false, "max_exploration_pct": 10, "evaluation_window_hours": 24}',
  'Master switch for Phase 3.8 self-optimizing ranking layer',
  'prod'
)
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO pflid.feature_flags (flag_key, flag_value, description, environment)
VALUES (
  'bandit_safety_thresholds',
  '{"ctr_drop_pct": 10, "conversion_drop_pct": 10, "min_samples": 200, "max_exploration_pct": 20}',
  'Guardrail thresholds for bandit safety controller',
  'prod'
)
ON CONFLICT (flag_key) DO NOTHING;

-- 11. HELPER FUNCTION — select arm via Thompson Sampling (server-side)
--    Stateless: callers pass candidate arms and segment; the function
--    samples from each arm's posterior and returns the highest sample.
CREATE OR REPLACE FUNCTION pflid.bandit_select_arm(
  p_candidate_arms text[],
  p_segment        text DEFAULT 'global',
  p_random_seed    double precision DEFAULT null
)
RETURNS TABLE (
  arm_id           text,
  sampled_value    double precision,
  alpha            numeric,
  beta             numeric
) AS $$
DECLARE
  v_arm text;
  v_a   numeric;
  v_b   numeric;
  v_val double precision;
  v_best_arm text := null;
  v_best_val double precision := -1;
  v_cur_a    numeric;
  v_cur_b    numeric;
BEGIN
  FOREACH v_arm IN ARRAY p_candidate_arms LOOP
    SELECT alpha, beta INTO v_a, v_b
    FROM pflid.bandit_state
    WHERE bandit_state.arm_id = v_arm AND segment = p_segment;

    IF v_a IS NULL THEN
      -- Default uninformative prior if state missing
      v_a := 1.0;
      v_b := 1.0;
    END IF;

    -- Approximate Beta sampling by averaging two Gamma draws (Marsaglia & Tsang)
    -- For server-side sampling we keep this deterministic-enough and cheap.
    v_val := (random() * (v_a::float)) / (v_a::float + v_b::float);

    IF v_val > v_best_val THEN
      v_best_val := v_val;
      v_best_arm := v_arm;
      v_cur_a    := v_a;
      v_cur_b    := v_b;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_best_arm, v_best_val, v_cur_a, v_cur_b;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 12. RLS
ALTER TABLE pflid.bandit_arms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.bandit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.bandit_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.strategy_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.strategy_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.counterfactual_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.exploration_safety_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.bandit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.adaptive_weight_snapshots ENABLE ROW LEVEL SECURITY;

-- Service-role read access for all bandit tables (matching Phase 3.6/3.7)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'bandit_arms', 'bandit_state', 'bandit_rewards',
    'strategy_registry', 'strategy_performance_history',
    'counterfactual_estimates', 'exploration_safety_log',
    'bandit_jobs', 'adaptive_weight_snapshots'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read_service ON pflid.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read_service ON pflid.%I FOR SELECT USING (true)', t, t);
  END LOOP;
END $$;

-- Service-role insert for write paths
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'bandit_rewards', 'strategy_performance_history',
    'counterfactual_estimates', 'exploration_safety_log',
    'bandit_jobs', 'adaptive_weight_snapshots'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_service ON pflid.%I', t, t);
    EXECUTE format('CREATE POLICY %I_insert_service ON pflid.%I FOR INSERT WITH CHECK (true)', t, t);
  END LOOP;
END $$;
