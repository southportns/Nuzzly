-- =============================================
-- PFLID Phase 3.9: Global Policy Intelligence Layer
-- Timeline First Architecture — Multi-objective + Cross-segment + Strategy Synthesis
-- =============================================
-- Purely additive meta-layer. Does NOT modify Phase 3.6–3.8 tables or logic.
-- Operates ABOVE the bandit layer, coordinating all optimization mechanisms.

-- 1. GLOBAL POLICY CONFIGURATION — current active global policy
CREATE TABLE IF NOT EXISTS pflid.global_policy_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version             text NOT NULL,
  status              text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived', 'simulated')),
  -- Multi-objective weights (must sum to ~1.0)
  objective_weights   jsonb NOT NULL DEFAULT '{
    "ctr": 0.30,
    "conversion": 0.25,
    "retention": 0.20,
    "diversity": 0.15,
    "stability": 0.10
  }',
  -- Global constraints
  hard_constraints    jsonb NOT NULL DEFAULT '{
    "max_latency_ms": 200,
    "min_quality_score": 0.3,
    "rollback_safety": true
  }',
  soft_constraints    jsonb NOT NULL DEFAULT '{
    "min_diversity_threshold": 0.1,
    "max_exploration_cap_pct": 15,
    "fairness_min_exposure_pct": 2
  }',
  -- Per-segment weight adjustments
  segment_adjustments jsonb NOT NULL DEFAULT '{}',
  -- Strategy mix: which strategies are globally approved
  approved_strategies text[] DEFAULT '{}',
  -- Exploration bounds set by global policy
  exploration_bounds  jsonb NOT NULL DEFAULT '{"min_pct": 5, "max_pct": 15}',
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  activated_at        timestamptz,
  archived_at         timestamptz,
  metadata            jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_global_policy_status ON pflid.global_policy_config(status);
CREATE INDEX IF NOT EXISTS idx_global_policy_version ON pflid.global_policy_config(version);

-- 2. SEGMENT POLICY DEFINITIONS — per-segment bandit weight overrides
CREATE TABLE IF NOT EXISTS pflid.segment_policies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key         text NOT NULL UNIQUE,
  description         text,
  -- Bandit arm weight overrides for this segment
  arm_weight_overrides jsonb NOT NULL DEFAULT '{}',
  -- Reward priority overrides
  reward_priority     jsonb NOT NULL DEFAULT '{}',
  -- Exploration constraints specific to this segment
  exploration_cap_pct numeric NOT NULL DEFAULT 15,
  -- Minimum quality threshold
  min_quality_score   numeric NOT NULL DEFAULT 0.2,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_segment_policies_active ON pflid.segment_policies(is_active);

-- Seed default segment policies
INSERT INTO pflid.segment_policies (segment_key, description, arm_weight_overrides, reward_priority, exploration_cap_pct) VALUES
  ('global', 'Default global segment', '{}', '{}', 15),
  ('new_user', 'New users — prioritize trust signals',
   '{"review_only": 1.2, "blend_30_70": 1.1}',
   '{"dwell": 1.3, "bounce": 1.3, "ctr": 0.8}', 10),
  ('returning_user', 'Returning users — prioritize conversion',
   '{"blend_70_30": 1.1, "timeline_only": 1.05}',
   '{"conversion": 1.2, "ctr": 1.1}', 15),
  ('high_intent', 'High-intent users — conversion-dominant',
   '{"blend_70_30": 1.15, "timeline_only": 1.1}',
   '{"conversion": 1.4, "ctr": 0.7}', 12),
  ('low_intent', 'Low-intent users — exploration-friendly',
   '{"blend_50_50": 1.1, "blend_30_70": 1.05}',
   '{"ctr": 1.3, "dwell": 1.1}', 20)
ON CONFLICT (segment_key) DO NOTHING;

-- 3. STRATEGY SYNTHESIS LOG — record of synthesized hybrid strategies
CREATE TABLE IF NOT EXISTS pflid.strategy_synthesis_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synthesis_id        text NOT NULL,
  parent_strategies   text[] NOT NULL,
  new_strategy_id     uuid REFERENCES pflid.strategy_registry(strategy_id),
  synthesis_method    text NOT NULL
    CHECK (synthesis_method IN ('mutation', 'crossover', 'historical_best', 'manual')),
  parameter_changes   jsonb NOT NULL DEFAULT '{}',
  expected_uplift     numeric,
  actual_uplift       numeric,
  status              text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'approved', 'rejected', 'deployed', 'pruned')),
  evaluated_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synthesis_status ON pflid.strategy_synthesis_log(status);
CREATE INDEX IF NOT EXISTS idx_synthesis_created ON pflid.strategy_synthesis_log(created_at DESC);

-- 4. CONSTRAINT VIOLATION LOG — record of constraint violations
CREATE TABLE IF NOT EXISTS pflid.constraint_violation_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type      text NOT NULL
    CHECK (violation_type IN ('latency_budget', 'rollback_safety', 'min_quality',
                              'diversity_threshold', 'fairness', 'exploration_cap')),
  severity            text NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('warning', 'error', 'critical')),
  constraint_name     text,
  actual_value        numeric,
  threshold_value     numeric,
  affected_segment    text,
  affected_arm        text,
  context             jsonb DEFAULT '{}',
  resolved            boolean NOT NULL DEFAULT false,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_constraint_violation_type ON pflid.constraint_violation_log(violation_type);
CREATE INDEX IF NOT EXISTS idx_constraint_violation_unresolved
  ON pflid.constraint_violation_log(resolved, created_at DESC) WHERE resolved = false;

-- 5. POLICY SIMULATION RESULTS — offline what-if analysis results
CREATE TABLE IF NOT EXISTS pflid.policy_simulation_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id       text NOT NULL,
  policy_version      text NOT NULL,
  baseline_policy_version text,
  -- Per-segment results
  segment_results     jsonb NOT NULL DEFAULT '{}',
  -- System-wide metrics
  system_uplift       jsonb NOT NULL DEFAULT '{}',
  -- Pareto frontier data
  pareto_frontier     jsonb DEFAULT '[]',
  -- Constraint violations found during simulation
  constraint_violations jsonb DEFAULT '[]',
  -- Overall recommendation
  recommendation      text DEFAULT 'neutral'
    CHECK (recommendation IN ('approve', 'reject', 'neutral', 'needs_tuning')),
  status              text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_simulation_status ON pflid.policy_simulation_results(status);
CREATE INDEX IF NOT EXISTS idx_simulation_created ON pflid.policy_simulation_results(created_at DESC);

-- 6. POLICY HISTORY — audit trail of all policy changes
CREATE TABLE IF NOT EXISTS pflid.policy_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          text NOT NULL
    CHECK (event_type IN ('policy_created', 'policy_activated', 'policy_archived',
                          'policy_simulated', 'policy_applied', 'constraint_updated',
                          'segment_policy_updated')),
  policy_version      text,
  previous_state      jsonb,
  new_state           jsonb,
  triggered_by        text NOT NULL DEFAULT 'manual'
    CHECK (triggered_by IN ('manual', 'auto', 'simulation')),
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_history_event ON pflid.policy_history(event_type);
CREATE INDEX IF NOT EXISTS idx_policy_history_time ON pflid.policy_history(created_at DESC);

-- 7. GLOBAL POLICY FEATURE FLAG
INSERT INTO pflid.feature_flags (flag_key, flag_value, description, environment)
VALUES (
  'global_policy_enabled',
  '{"enabled": false, "compute_interval_hours": 24, "auto_apply": false}',
  'Master switch for Phase 3.9 global policy intelligence layer',
  'prod'
)
ON CONFLICT (flag_key) DO NOTHING;

-- 8. RLS
ALTER TABLE pflid.global_policy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.segment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.strategy_synthesis_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.constraint_violation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.policy_simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.policy_history ENABLE ROW LEVEL SECURITY;

-- Service-role read access for all Phase 3.9 tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'global_policy_config', 'segment_policies', 'strategy_synthesis_log',
    'constraint_violation_log', 'policy_simulation_results', 'policy_history'
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
    'strategy_synthesis_log', 'constraint_violation_log',
    'policy_simulation_results', 'policy_history'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_service ON pflid.%I', t, t);
    EXECUTE format('CREATE POLICY %I_insert_service ON pflid.%I FOR INSERT WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Service-role write for global_policy_config and segment_policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['global_policy_config', 'segment_policies'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_write_service ON pflid.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write_service ON pflid.%I FOR ALL USING (true)', t, t);
  END LOOP;
END $$;
