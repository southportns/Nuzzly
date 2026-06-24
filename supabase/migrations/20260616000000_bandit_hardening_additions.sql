-- =============================================
-- PFLID Phase 3.8.1: Bandit Hardening Additions
-- Timeline First Architecture — Delayed Reward + Forced Exploration + Propensity Calibration
-- =============================================
-- Three additive tables, zero modification to Phase 3.8 core.
-- All constraints from Phase 3.8 spec still hold.

-- 1. DELAYED REWARDS — long-term signals tied back to original bandit decisions
--    Records arrive days/weeks after the original impression.  Each row
--    is one (request, arm, event) tuple that adjusts the historical
--    reward for that arm.
CREATE TABLE IF NOT EXISTS pflid.delayed_rewards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          text NOT NULL,
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  user_id             uuid,
  session_id          text,
  segment             text NOT NULL DEFAULT 'global',
  event_type          text NOT NULL
    CHECK (event_type IN ('retention_d7', 'revisit', 'session_continuity',
                          'repeat_purchase', 'subscriber_keep')),
  event_value         numeric NOT NULL
    CHECK (event_value >= 0 AND event_value <= 1),
  lookback_days       integer NOT NULL,
  window_start        timestamptz NOT NULL,
  window_end          timestamptz NOT NULL,
  applied_to_bandit   boolean NOT NULL DEFAULT false,
  applied_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delayed_rewards_arm_time
  ON pflid.delayed_rewards(arm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delayed_rewards_unapplied
  ON pflid.delayed_rewards(applied_to_bandit, created_at DESC)
  WHERE applied_to_bandit = false;
CREATE INDEX IF NOT EXISTS idx_delayed_rewards_request
  ON pflid.delayed_rewards(request_id);
CREATE INDEX IF NOT EXISTS idx_delayed_rewards_user
  ON pflid.delayed_rewards(user_id, created_at DESC);

-- 2. ARM EXPOSURE LOG — per-hour exposure counts for forced-exploration scheduler
--    Row granularity: (arm, segment, hour-bucket).  Updated on every
--    bandit selection.  The scheduler reads this to enforce minimum
--    exposure quotas.
CREATE TABLE IF NOT EXISTS pflid.arm_exposure_log (
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  segment             text NOT NULL DEFAULT 'global',
  bucket_start        timestamptz NOT NULL,
  exposure_count      integer NOT NULL DEFAULT 0,
  last_updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (arm_id, segment, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_arm_exposure_bucket
  ON pflid.arm_exposure_log(bucket_start DESC);

-- 3. PROPENSITY CALIBRATION — observed vs intended selection rates
--    Intended = what the rollout controller + AB config would suggest.
--    Observed  = what the bandit actually picked in the window.
--    calibration_ratio = observed / intended.  Used by counterfactual-eval
--    to correct for selection bias in IPS estimates.
CREATE TABLE IF NOT EXISTS pflid.propensity_calibration (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arm_id              text NOT NULL REFERENCES pflid.bandit_arms(arm_id),
  segment             text NOT NULL DEFAULT 'global',
  period_start        timestamptz NOT NULL,
  period_end          timestamptz NOT NULL,
  intended_propensity numeric NOT NULL,
  observed_propensity numeric NOT NULL,
  calibration_ratio   numeric NOT NULL,
  sample_size         integer NOT NULL,
  computed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propensity_calibration_arm_period
  ON pflid.propensity_calibration(arm_id, period_end DESC);

-- 4. RLS — service-role access
ALTER TABLE pflid.delayed_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.arm_exposure_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.propensity_calibration ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['delayed_rewards', 'arm_exposure_log', 'propensity_calibration'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read_service ON pflid.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read_service ON pflid.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_service ON pflid.%I', t, t);
    EXECUTE format('CREATE POLICY %I_insert_service ON pflid.%I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_service ON pflid.%I', t, t);
    EXECUTE format('CREATE POLICY %I_update_service ON pflid.%I FOR UPDATE USING (true)', t, t);
  END LOOP;
END $$;

-- 6. Atomic exposure counter (called from forced-exploration.recordArmExposure)
CREATE OR REPLACE FUNCTION pflid.arm_exposure_bump(
  p_arm_id        text,
  p_segment       text,
  p_bucket_start  timestamptz
)
RETURNS void AS $$
BEGIN
  INSERT INTO pflid.arm_exposure_log (arm_id, segment, bucket_start, exposure_count, last_updated_at)
  VALUES (p_arm_id, p_segment, p_bucket_start, 1, now())
  ON CONFLICT (arm_id, segment, bucket_start)
  DO UPDATE SET
    exposure_count  = pflid.arm_exposure_log.exposure_count + 1,
    last_updated_at = now();
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 7. Feature flag for the three enhancements
INSERT INTO pflid.feature_flags (flag_key, flag_value, description, environment)
VALUES (
  'bandit_delayed_reward',
  '{"enabled": true, "weight": 0.3, "retention_window_days": 7, "max_lookback_days": 30}',
  'Delayed-reward proxy: 7-day retention, revisit, session continuity',
  'prod'
)
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO pflid.feature_flags (flag_key, flag_value, description, environment)
VALUES (
  'bandit_forced_exploration',
  '{"enabled": true, "min_exposure_pct": 5, "window_hours": 24, "lookback_hours": 1}',
  'Forced-exploration scheduler: guarantee each arm minimum exposure',
  'prod'
)
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO pflid.feature_flags (flag_key, flag_value, description, environment)
VALUES (
  'bandit_propensity_calibration',
  '{"enabled": true, "min_samples": 100, "max_calibration_ratio": 2.0}',
  'Propensity calibration for IPS-based counterfactual estimates',
  'prod'
)
ON CONFLICT (flag_key) DO NOTHING;
