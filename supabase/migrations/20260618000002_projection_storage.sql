-- Phase 1.2.3: Projection Storage Layer
-- Stores deterministic projection states derived from Event Store

-- ── Projection State Table ──
CREATE TABLE IF NOT EXISTS projection_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_name text NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 0,
  last_processed_event_id uuid,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Projection Checkpoints Table ──
CREATE TABLE IF NOT EXISTS projection_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_name text NOT NULL,
  checkpoint_version integer NOT NULL,
  event_id uuid NOT NULL,
  state_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_projection
    FOREIGN KEY (projection_name)
    REFERENCES projection_states(projection_name)
    ON DELETE CASCADE
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_projection_checkpoints_name
  ON projection_checkpoints(projection_name, checkpoint_version DESC);

-- ── RLS ──
ALTER TABLE projection_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE projection_checkpoints ENABLE ROW LEVEL SECURITY;

-- TIER 2: System data — service_role only
CREATE POLICY projection_states_service_role
  ON projection_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY projection_checkpoints_service_role
  ON projection_checkpoints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Helper Functions ──

-- Get projection state by name
CREATE OR REPLACE FUNCTION projection_get_state(p_name text)
RETURNS TABLE (
  projection_name text,
  version integer,
  last_processed_event_id uuid,
  state jsonb,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ps.projection_name, ps.version, ps.last_processed_event_id, ps.state, ps.updated_at
  FROM projection_states ps
  WHERE ps.projection_name = p_name;
END;
$$;

-- Upsert projection state (idempotent)
CREATE OR REPLACE FUNCTION projection_upsert_state(
  p_name text,
  p_version integer,
  p_event_id uuid,
  p_state jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO projection_states (projection_name, version, last_processed_event_id, state)
  VALUES (p_name, p_version, p_event_id, p_state)
  ON CONFLICT (projection_name) DO UPDATE
  SET
    version = EXCLUDED.version,
    last_processed_event_id = EXCLUDED.last_processed_event_id,
    state = EXCLUDED.state,
    updated_at = now();
END;
$$;

-- Create checkpoint for projection
CREATE OR REPLACE FUNCTION projection_create_checkpoint(
  p_name text,
  p_version integer,
  p_event_id uuid,
  p_snapshot jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkpoint_id uuid;
BEGIN
  INSERT INTO projection_checkpoints (projection_name, checkpoint_version, event_id, state_snapshot)
  VALUES (p_name, p_version, p_event_id, p_snapshot)
  RETURNING id INTO v_checkpoint_id;

  RETURN v_checkpoint_id;
END;
$$;

-- Reset projection state
CREATE OR REPLACE FUNCTION projection_reset(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM projection_checkpoints WHERE projection_name = p_name;
  DELETE FROM projection_states WHERE projection_name = p_name;
END;
$$;

-- Get latest checkpoint for projection
CREATE OR REPLACE FUNCTION projection_get_latest_checkpoint(p_name text)
RETURNS TABLE (
  checkpoint_version integer,
  event_id uuid,
  state_snapshot jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pc.checkpoint_version, pc.event_id, pc.state_snapshot, pc.created_at
  FROM projection_checkpoints pc
  WHERE pc.projection_name = p_name
  ORDER BY pc.checkpoint_version DESC
  LIMIT 1;
END;
$$;
