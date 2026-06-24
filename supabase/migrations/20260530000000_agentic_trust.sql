-- Phase 5: Agentic Trust System — multi-agent arbitration tables

-- 1. agent_decision_log: records each agent's decision step
CREATE TABLE public.agent_decision_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id        uuid NOT NULL,
  agent_name      text NOT NULL CHECK (agent_name IN ('recommendation','trust_evaluation','risk_sentinel','arbitration','explainability','audit')),
  input_state     jsonb NOT NULL DEFAULT '{}',
  output_state    jsonb NOT NULL DEFAULT '{}',
  confidence      numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_log_trace ON public.agent_decision_log(trace_id, agent_name);

ALTER TABLE public.agent_decision_log ENABLE ROW LEVEL SECURITY;

-- 2. trust_arbitration_log: records the final arbitration vote
CREATE TABLE public.trust_arbitration_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id          uuid NOT NULL,
  recommendation_id text,
  agent_votes       jsonb NOT NULL DEFAULT '{}',
  final_decision    text NOT NULL CHECK (final_decision IN ('approve','reject','flag')),
  final_score       numeric(4,1),
  override_reason   text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_arbitration_trace ON public.trust_arbitration_log(trace_id);

ALTER TABLE public.trust_arbitration_log ENABLE ROW LEVEL SECURITY;

-- 3. risk_event_graph: tracks risk event relationships for dedup & propagation
CREATE TABLE public.risk_event_graph (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.risk_events(id) ON DELETE CASCADE,
  cluster_id    text NOT NULL,
  severity      text NOT NULL,
  decay_score   numeric(5,3) NOT NULL DEFAULT 0,
  connections   uuid[] NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_graph_cluster ON public.risk_event_graph(cluster_id);
CREATE INDEX idx_risk_graph_event ON public.risk_event_graph(event_id);

ALTER TABLE public.risk_event_graph ENABLE ROW LEVEL SECURITY;

-- RLS: read for authenticated
CREATE POLICY "agent_log_read_auth" ON public.agent_decision_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "arbitration_read_auth" ON public.trust_arbitration_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_graph_read_auth" ON public.risk_event_graph FOR SELECT TO authenticated USING (true);
