-- =============================================
-- Phase 3.7 Hardening Migration
-- Idempotency, Execution Fidelity, Tiered Storage, Confounders, Bootstrap
-- =============================================

-- ─── 1. Replay Jobs: Idempotency + Fidelity Level ─────────────────────────

ALTER TABLE pflid.replay_jobs
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS execution_fidelity text
    CHECK (execution_fidelity IN ('LOW', 'MED', 'HIGH')),
  ADD COLUMN IF NOT EXISTS fidelity_warnings jsonb DEFAULT '[]';

-- Backfill idempotency_key for existing rows
UPDATE pflid.replay_jobs
SET idempotency_key = md5(
  coalesce(request_id, '') || '|' ||
  coalesce(replay_config->>'mode', 'full') || '|' ||
  coalesce(replay_config->>'fidelity', 'AUTO')
)
WHERE idempotency_key IS NULL;

-- Enforce uniqueness for the same request + mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'replay_jobs_idempotency_key_unique'
  ) THEN
    ALTER TABLE pflid.replay_jobs
      ADD CONSTRAINT replay_jobs_idempotency_key_unique UNIQUE (idempotency_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_replay_jobs_idempotency_key
  ON pflid.replay_jobs(idempotency_key);

-- ─── 2. Decision Trace Log: Tiered Storage ────────────────────────────────

ALTER TABLE pflid.decision_trace_log
  ADD COLUMN IF NOT EXISTS storage_tier text DEFAULT 'hot'
    CHECK (storage_tier IN ('hot', 'cold', 'archived')),
  ADD COLUMN IF NOT EXISTS trace_size_bytes integer,
  ADD COLUMN IF NOT EXISTS compressed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS compression_strategy text;

-- Function: auto-tier traces based on age
-- Hot:   < 7 days
-- Cold:  7-30 days
-- Archived: > 30 days
CREATE OR REPLACE FUNCTION pflid.tier_decision_traces()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE pflid.decision_trace_log
  SET storage_tier = 'cold'
  WHERE storage_tier = 'hot'
    AND created_at < now() - interval '7 days';

  UPDATE pflid.decision_trace_log
  SET storage_tier = 'archived'
  WHERE storage_tier = 'cold'
    AND created_at < now() - interval '30 days';
END;
$$;

CREATE INDEX IF NOT EXISTS idx_decision_trace_log_storage_tier
  ON pflid.decision_trace_log(storage_tier, created_at DESC);

-- ─── 3. Causal Confounders Table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pflid.causal_confounders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id         uuid NOT NULL,
  confounder_type     text NOT NULL
    CHECK (confounder_type IN ('time_of_day', 'user_activity', 'item_popularity', 'geo_region', 'device_type')),
  confounder_bucket   text NOT NULL,
  group_a_avg         numeric,
  group_b_avg         numeric,
  delta               numeric,
  sample_size         integer DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_causal_confounders_analysis
  ON pflid.causal_confounders(analysis_id, confounder_type);

-- ─── 4. Causal Analysis Results: Bootstrap & Effect Size ──────────────────

ALTER TABLE pflid.causal_analysis_results
  ADD COLUMN IF NOT EXISTS control_dimensions jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS bootstrap_iterations integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bootstrap_mean numeric,
  ADD COLUMN IF NOT EXISTS bootstrap_std numeric,
  ADD COLUMN IF NOT EXISTS effect_size_cohens_d numeric,
  ADD COLUMN IF NOT EXISTS effect_size_interpretation text,
  ADD COLUMN IF NOT EXISTS confidence_interval_lower numeric,
  ADD COLUMN IF NOT EXISTS confidence_interval_upper numeric,
  ADD COLUMN IF NOT EXISTS statistical_method text DEFAULT 'bootstrap';

-- ─── 5. Bootstrap Resampling Results Table ────────────────────────────────

CREATE TABLE IF NOT EXISTS pflid.bootstrap_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id         uuid NOT NULL,
  metric_name         text NOT NULL,
  observed_value      numeric NOT NULL,
  bootstrap_mean      numeric NOT NULL,
  bootstrap_std       numeric NOT NULL,
  ci_lower            numeric NOT NULL,
  ci_upper            numeric NOT NULL,
  ci_level            numeric DEFAULT 0.95,
  effect_size         numeric,
  iterations          integer NOT NULL,
  computed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bootstrap_results_analysis
  ON pflid.bootstrap_results(analysis_id, metric_name);

-- ─── 6. Replay Snapshots: Compressed Diff Storage ─────────────────────────

ALTER TABLE pflid.replay_snapshots
  ADD COLUMN IF NOT EXISTS storage_tier text DEFAULT 'hot'
    CHECK (storage_tier IN ('hot', 'cold', 'archived')),
  ADD COLUMN IF NOT EXISTS snapshot_size_bytes integer,
  ADD COLUMN IF NOT EXISTS diff_compressed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS diff_summary jsonb;

CREATE INDEX IF NOT EXISTS idx_replay_snapshots_storage_tier
  ON pflid.replay_snapshots(storage_tier, created_at DESC);

-- ─── 7. Helper View: Replay Health Monitoring ─────────────────────────────

CREATE OR REPLACE VIEW pflid.replay_health_summary AS
SELECT
  execution_fidelity,
  count(*) as replay_count,
  avg(duration_ms) as avg_duration_ms,
  max(duration_ms) as max_duration_ms
FROM pflid.replay_jobs
WHERE status = 'completed'
  AND created_at > now() - interval '7 days'
GROUP BY execution_fidelity
ORDER BY execution_fidelity;

-- ─── 8. Helper View: Trace Storage Distribution ───────────────────────────

CREATE OR REPLACE VIEW pflid.trace_storage_distribution AS
SELECT
  storage_tier,
  count(*) as trace_count,
  avg(coalesce(trace_size_bytes, 0)) as avg_size_bytes,
  sum(coalesce(trace_size_bytes, 0)) as total_size_bytes
FROM pflid.decision_trace_log
GROUP BY storage_tier
ORDER BY storage_tier;
