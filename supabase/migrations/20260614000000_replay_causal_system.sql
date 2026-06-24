-- =============================================
-- PFLID Phase 3.7: Decision Replay + Causal Debug System
-- Timeline First Architecture — Offline Replay, Diff, Causal Analysis
-- =============================================
-- Purpose: Enable engineers to replay past decisions, compare scoring engines,
--          perform causal analysis on A/B results, and diagnose rollback root causes.
--          This is an OFFLINE diagnostic layer — does NOT affect production traffic.

-- 1. EXTEND decision_trace_log with replay-critical fields
ALTER TABLE pflid.decision_trace_log
ADD COLUMN IF NOT EXISTS feature_flags_snapshot jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS scoring_inputs jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS product_scores jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ranking_output jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS replayable boolean DEFAULT false;

-- 2. REPLAY JOBS TABLE
-- Stores replay execution requests and results
CREATE TABLE pflid.replay_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type            text NOT NULL CHECK (job_type IN ('decision_replay', 'diff', 'causal_analysis', 'rollback_root_cause')),
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  request_id          text,
  user_id             uuid,
  time_range_start    timestamptz,
  time_range_end      timestamptz,
  replay_config       jsonb NOT NULL DEFAULT '{}',
  original_trace      jsonb,
  replayed_trace      jsonb,
  diff_result         jsonb,
  causal_result       jsonb,
  root_cause_result   jsonb,
  error_message       text,
  started_at          timestamptz,
  completed_at        timestamptz,
  duration_ms         integer,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_replay_jobs_status ON pflid.replay_jobs(status);
CREATE INDEX idx_replay_jobs_type ON pflid.replay_jobs(job_type);
CREATE INDEX idx_replay_jobs_request ON pflid.replay_jobs(request_id);
CREATE INDEX idx_replay_jobs_time ON pflid.replay_jobs(created_at DESC);

-- 3. REPLAY SNAPSHOTS TABLE
-- Stores minimal replayable snapshots of scoring inputs/outputs
CREATE TABLE pflid.replay_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key        text NOT NULL UNIQUE,
  request_id          text,
  user_id             uuid,
  pet_id              uuid,
  feature_flags       jsonb NOT NULL DEFAULT '{}',
  rollout_state       jsonb NOT NULL DEFAULT '{}',
  ab_assignment       jsonb,
  review_scores       jsonb NOT NULL DEFAULT '[]',
  timeline_scores     jsonb NOT NULL DEFAULT '[]',
  final_ranking       jsonb NOT NULL DEFAULT '[]',
  scoring_metadata    jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_replay_snapshots_request ON pflid.replay_snapshots(request_id);
CREATE INDEX idx_replay_snapshots_user ON pflid.replay_snapshots(user_id);
CREATE INDEX idx_replay_snapshots_time ON pflid.replay_snapshots(created_at DESC);

-- 4. CAUSAL ANALYSIS RESULTS TABLE
-- Stores offline causal analysis outputs
CREATE TABLE pflid.causal_analysis_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id         uuid NOT NULL,
  hypothesis          text NOT NULL,
  confidence          numeric(5,4) DEFAULT 0,
  effect_size         numeric(10,4),
  p_value             numeric(10,6),
  correlated_changes  jsonb DEFAULT '[]',
  supporting_traces   jsonb DEFAULT '[]',
  anomaly_signals     jsonb DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_causal_analysis_id ON pflid.causal_analysis_results(analysis_id);
CREATE INDEX idx_causal_confidence ON pflid.causal_analysis_results(confidence DESC);

-- RLS
ALTER TABLE pflid.replay_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.replay_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.causal_analysis_results ENABLE ROW LEVEL SECURITY;

-- Replay jobs: insert and read by service
CREATE POLICY "replay_jobs_service" ON pflid.replay_jobs
  FOR ALL USING (true);

-- Replay snapshots: insert and read by service
CREATE POLICY "replay_snapshots_service" ON pflid.replay_snapshots
  FOR ALL USING (true);

-- Causal results: insert and read by service
CREATE POLICY "causal_results_service" ON pflid.causal_analysis_results
  FOR ALL USING (true);
