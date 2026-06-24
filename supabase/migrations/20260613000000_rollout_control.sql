-- =============================================
-- PFLID Phase 3.6: Production Gradual Rollout Control System
-- Timeline First Architecture — Feature Flags, A/B Testing, Rollback
-- =============================================
-- Purpose: Safe progressive rollout from Shadow Mode → Partial → Full Production
--          with instant rollback capability and deterministic A/B assignment.

-- 1. FEATURE FLAGS TABLE
CREATE TABLE pflid.feature_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key        text NOT NULL UNIQUE,
  flag_value      jsonb NOT NULL DEFAULT '{}',
  description     text,
  environment     text NOT NULL DEFAULT 'prod' CHECK (environment IN ('dev', 'staging', 'prod')),
  updated_by      uuid REFERENCES auth.users(id),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ff_key ON pflid.feature_flags(flag_key);
CREATE INDEX idx_ff_env ON pflid.feature_flags(environment);

-- Seed default flags
INSERT INTO pflid.feature_flags (flag_key, flag_value, description, environment) VALUES
  ('timeline_score_enabled', '{"enabled": false}', 'Master switch for Timeline Score engine', 'prod'),
  ('timeline_score_rollout_percentage', '{"percentage": 0}', 'Percentage of traffic routed to Timeline (0-100)', 'prod'),
  ('shadow_mode_enabled', '{"enabled": true}', 'Enable dual-scoring shadow mode for comparison', 'prod'),
  ('ab_test_timeline_enabled', '{"enabled": false}', 'Enable A/B test between Review and Timeline scoring', 'prod'),
  ('ab_test_timeline_ratio', '{"control": 90, "timeline": 10}', 'A/B test traffic split (control=Review, timeline=Timeline)', 'prod'),
  ('auto_rollback_enabled', '{"enabled": true}', 'Enable automatic rollback on anomaly detection', 'prod'),
  ('auto_rollback_thresholds', '{"failure_rate_pct": 5, "latency_p95_ms": 3000, "score_drift_threshold": 30}', 'Auto-rollback trigger thresholds', 'prod'),
  ('blend_weights', '{"timeline": 0.7, "review": 0.3}', 'Scoring blend weights when Timeline is active', 'prod')
ON CONFLICT (flag_key) DO NOTHING;

-- 2. ROLLOUT STATE TABLE (tracks current rollout status)
CREATE TABLE pflid.rollout_state (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_phase           text NOT NULL DEFAULT 'shadow' CHECK (current_phase IN ('shadow', 'ab_test', 'partial', 'full', 'rolled_back')),
  timeline_traffic_pct    integer NOT NULL DEFAULT 0 CHECK (timeline_traffic_pct BETWEEN 0 AND 100),
  active_experiment_id    uuid,
  last_rollback_at        timestamptz,
  last_rollback_reason    text,
  rollback_count          integer DEFAULT 0,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Seed initial state
INSERT INTO pflid.rollout_state (current_phase, timeline_traffic_pct)
VALUES ('shadow', 0)
ON CONFLICT DO NOTHING;

-- 3. A/B EXPERIMENT TABLE
CREATE TABLE pflid.ab_experiments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  control_group   text NOT NULL DEFAULT 'review_score',
  treatment_group text NOT NULL DEFAULT 'timeline_score',
  traffic_split   jsonb NOT NULL DEFAULT '{"control": 90, "treatment": 10}',
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  started_at      timestamptz,
  ended_at        timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ab_exp_status ON pflid.ab_experiments(status);

-- 4. A/B ASSIGNMENT LOG (for audit & analysis)
CREATE TABLE pflid.ab_assignment_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid,
  session_id      text,
  experiment_id   uuid REFERENCES pflid.ab_experiments(id),
  assigned_group  text NOT NULL,
  pet_id          uuid,
  request_id      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ab_log_user ON pflid.ab_assignment_log(user_id);
CREATE INDEX idx_ab_exp ON pflid.ab_assignment_log(experiment_id);
CREATE INDEX idx_ab_log_created ON pflid.ab_assignment_log(created_at DESC);

-- 5. ROLLOUT EVENT LOG (audit trail)
CREATE TABLE pflid.rollout_event_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL CHECK (event_type IN ('rollout_increase', 'rollout_decrease', 'rollback', 'flag_change', 'experiment_start', 'experiment_end', 'auto_rollback')),
  previous_value  jsonb,
  new_value       jsonb,
  reason          text,
  triggered_by    text NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'auto', 'system')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rollout_event_type ON pflid.rollout_event_log(event_type);
CREATE INDEX idx_rollout_event_time ON pflid.rollout_event_log(created_at DESC);

-- 6. GET FEATURE FLAG (function)
CREATE OR REPLACE FUNCTION pflid.get_feature_flag(
  p_flag_key text,
  p_environment text DEFAULT 'prod'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT flag_value INTO v_result
  FROM pflid.feature_flags
  WHERE flag_key = p_flag_key AND environment = p_environment
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. UPDATE FEATURE FLAG (function)
CREATE OR REPLACE FUNCTION pflid.update_feature_flag(
  p_flag_key text,
  p_flag_value jsonb,
  p_environment text DEFAULT 'prod'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE pflid.feature_flags
  SET flag_value = p_flag_value, updated_at = now()
  WHERE flag_key = p_flag_key AND environment = p_environment
  RETURNING flag_value INTO v_result;

  -- Log the change
  INSERT INTO pflid.rollout_event_log (event_type, previous_value, new_value, triggered_by)
  VALUES ('flag_change', pflid.get_feature_flag(p_flag_key, p_environment), p_flag_value, 'manual');

  RETURN COALESCE(v_result, p_flag_value);
END;
$$ LANGUAGE plpgsql;

-- 8. GET ROLLOUT STATUS (function)
CREATE OR REPLACE FUNCTION pflid.get_rollout_status()
RETURNS jsonb AS $$
DECLARE
  v_state record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_state FROM pflid.rollout_state LIMIT 1;

  v_result := jsonb_build_object(
    'current_phase', v_state.current_phase,
    'timeline_traffic_pct', v_state.timeline_traffic_pct,
    'active_experiment_id', v_state.active_experiment_id,
    'last_rollback_at', v_state.last_rollback_at,
    'last_rollback_reason', v_state.last_rollback_reason,
    'rollback_count', v_state.rollback_count,
    'flags', jsonb_build_object(
      'timeline_score_enabled', pflid.get_feature_flag('timeline_score_enabled'),
      'shadow_mode_enabled', pflid.get_feature_flag('shadow_mode_enabled'),
      'ab_test_enabled', pflid.get_feature_flag('ab_test_timeline_enabled'),
      'ab_test_ratio', pflid.get_feature_flag('ab_test_timeline_ratio'),
      'auto_rollback_enabled', pflid.get_feature_flag('auto_rollback_enabled'),
      'blend_weights', pflid.get_feature_flag('blend_weights')
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. EXECUTE ROLLBACK (function)
CREATE OR REPLACE FUNCTION pflid.execute_rollback(
  p_reason text DEFAULT 'Manual rollback'
)
RETURNS jsonb AS $$
DECLARE
  v_state record;
BEGIN
  SELECT * INTO v_state FROM pflid.rollout_state LIMIT 1;

  UPDATE pflid.rollout_state
  SET
    current_phase = 'rolled_back',
    timeline_traffic_pct = 0,
    last_rollback_at = now(),
    last_rollback_reason = p_reason,
    rollback_count = rollback_count + 1,
    updated_at = now();

  -- Disable timeline scoring
  UPDATE pflid.feature_flags
  SET flag_value = '{"enabled": false}', updated_at = now()
  WHERE flag_key = 'timeline_score_enabled';

  -- Pause any running experiments
  UPDATE pflid.ab_experiments
  SET status = 'paused', updated_at = now()
  WHERE status = 'running';

  -- Log event
  INSERT INTO pflid.rollout_event_log (event_type, previous_value, new_value, reason, triggered_by)
  VALUES (
    'rollback',
    jsonb_build_object('phase', v_state.current_phase, 'traffic_pct', v_state.timeline_traffic_pct),
    jsonb_build_object('phase', 'rolled_back', 'traffic_pct', 0),
    p_reason,
    'manual'
  );

  RETURN pflid.get_rollout_status();
END;
$$ LANGUAGE plpgsql;

-- 10. UPDATE ROLLOUT PERCENTAGE (function)
CREATE OR REPLACE FUNCTION pflid.update_rollout_percentage(
  p_percentage integer,
  p_reason text DEFAULT 'Manual rollout adjustment'
)
RETURNS jsonb AS $$
DECLARE
  v_state record;
  v_new_phase text;
BEGIN
  SELECT * INTO v_state FROM pflid.rollout_state LIMIT 1;

  -- Determine phase based on percentage
  v_new_phase := CASE
    WHEN p_percentage = 0 THEN 'shadow'
    WHEN p_percentage <= 50 THEN 'ab_test'
    WHEN p_percentage < 100 THEN 'partial'
    ELSE 'full'
  END;

  UPDATE pflid.rollout_state
  SET
    current_phase = v_new_phase,
    timeline_traffic_pct = p_percentage,
    updated_at = now();

  -- Update feature flag
  UPDATE pflid.feature_flags
  SET flag_value = jsonb_build_object('percentage', p_percentage), updated_at = now()
  WHERE flag_key = 'timeline_score_rollout_percentage';

  -- Enable timeline scoring if percentage > 0
  IF p_percentage > 0 THEN
    UPDATE pflid.feature_flags
    SET flag_value = '{"enabled": true}', updated_at = now()
    WHERE flag_key = 'timeline_score_enabled';
  END IF;

  -- Log event
  INSERT INTO pflid.rollout_event_log (event_type, previous_value, new_value, reason, triggered_by)
  VALUES (
    CASE WHEN p_percentage > v_state.timeline_traffic_pct THEN 'rollout_increase' ELSE 'rollout_decrease' END,
    jsonb_build_object('phase', v_state.current_phase, 'traffic_pct', v_state.timeline_traffic_pct),
    jsonb_build_object('phase', v_new_phase, 'traffic_pct', p_percentage),
    p_reason,
    'manual'
  );

  RETURN pflid.get_rollout_status();
END;
$$ LANGUAGE plpgsql;

-- 5. DECISION TRACE LOG (per-request decision audit trail)
-- Fix #5: Complete trace of WHY each request chose its scoring path
CREATE TABLE pflid.decision_trace_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          text,
  user_id             uuid,
  decision_path       text NOT NULL CHECK (decision_path IN ('ROLLBACK', 'MASTER_OFF', 'AB_CONTROL', 'AB_TREATMENT', 'ROLLOUT_PARTIAL', 'ROLLOUT_FULL', 'FALLBACK')),
  hash_bucket         integer,
  hash_source         text,
  rollout_percent     integer,
  ab_group            text,
  latency_ms          integer,
  scoring_path_steps  jsonb DEFAULT '[]',
  final_score_source  text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_decision_trace_user ON pflid.decision_trace_log(user_id);
CREATE INDEX idx_decision_trace_path ON pflid.decision_trace_log(decision_path);
CREATE INDEX idx_decision_trace_time ON pflid.decision_trace_log(created_at DESC);
CREATE INDEX idx_decision_trace_request ON pflid.decision_trace_log(request_id);

-- RLS
ALTER TABLE pflid.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.rollout_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.ab_assignment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.rollout_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.decision_trace_log ENABLE ROW LEVEL SECURITY;

-- Public read for flags (evaluated server-side, not exposed to client directly)
CREATE POLICY "flags_read_service" ON pflid.feature_flags
  FOR SELECT USING (true);

CREATE POLICY "rollout_state_read_service" ON pflid.rollout_state
  FOR SELECT USING (true);

-- Assignment log: insert only
CREATE POLICY "ab_log_insert_service" ON pflid.ab_assignment_log
  FOR INSERT WITH CHECK (true);

-- Rollout event log: read only
CREATE POLICY "rollout_log_read_service" ON pflid.rollout_event_log
  FOR SELECT USING (true);

-- Decision trace log: insert only (service-side)
CREATE POLICY "decision_trace_insert_service" ON pflid.decision_trace_log
  FOR INSERT WITH CHECK (true);

-- Decision trace log: admin read only
CREATE POLICY "decision_trace_read_service" ON pflid.decision_trace_log
  FOR SELECT USING (true);
