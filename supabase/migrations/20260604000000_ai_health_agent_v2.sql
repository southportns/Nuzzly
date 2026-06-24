-- =============================================
-- Pet RWD AI Health Agent v2
-- AI Health Intelligence Layer
-- =============================================

-- 1. NEW TABLES
-- =============================================

-- 1.1 ai_health_reports (AI 健康报告)
CREATE TABLE public.ai_health_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  report_date       date NOT NULL,
  date_range        text NOT NULL DEFAULT '7d',

  -- AI 输出
  summary_text      text NOT NULL,
  risk_level        risk_level_t NOT NULL DEFAULT 'low',
  causes            jsonb DEFAULT '[]',
  recommendations   jsonb DEFAULT '[]',
  monitoring_plan   text,

  -- 输入数据快照
  metrics_snapshot  jsonb DEFAULT '{}',
  summary_snapshot  jsonb DEFAULT '{}',
  anomaly_snapshot  jsonb DEFAULT '[]',

  -- LLM 元数据
  model_used        text DEFAULT 'claude',
  prompt_tokens     integer,
  completion_tokens integer,
  processing_time_ms integer,

  -- 元数据
  generated_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(pet_id, report_date, date_range)
);

-- 1.2 health_chat_sessions (健康对话记录)
CREATE TABLE public.health_chat_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 对话内容
  user_message      text NOT NULL,
  ai_response       text NOT NULL,

  -- 上下文
  context_snapshot  jsonb DEFAULT '{}',
  report_id         uuid REFERENCES public.ai_health_reports(id) ON DELETE SET NULL,

  -- 元数据
  model_used        text DEFAULT 'claude',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 1.3 health_memory (长期健康记忆)
CREATE TABLE public.health_memory (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,

  -- 记忆类型
  memory_type       text NOT NULL CHECK (memory_type IN ('anomaly', 'trend', 'milestone', 'risk_pattern')),

  -- 记忆内容
  title             text NOT NULL,
  description       text,
  severity          text CHECK (severity IN ('low', 'medium', 'high')),

  -- 时间范围
  first_observed    date NOT NULL,
  last_observed     date NOT NULL,
  occurrence_count  integer DEFAULT 1,

  -- 关联数据
  related_metrics   jsonb DEFAULT '{}',
  is_active         boolean DEFAULT true,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. INDEXES
-- =============================================

CREATE INDEX idx_ai_health_reports_pet_date ON public.ai_health_reports(pet_id, report_date DESC);
CREATE INDEX idx_ai_health_reports_risk ON public.ai_health_reports(risk_level, report_date DESC);

CREATE INDEX idx_health_chat_sessions_pet ON public.health_chat_sessions(pet_id, created_at DESC);
CREATE INDEX idx_health_chat_sessions_profile ON public.health_chat_sessions(profile_id, created_at DESC);

CREATE INDEX idx_health_memory_pet ON public.health_memory(pet_id, is_active);
CREATE INDEX idx_health_memory_type ON public.health_memory(memory_type, severity);

-- 3. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.ai_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_memory ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "ai_health_reports_read_auth" ON public.ai_health_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "health_chat_sessions_read_own" ON public.health_chat_sessions
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "health_memory_read_auth" ON public.health_memory
  FOR SELECT TO authenticated USING (true);

-- Write access
CREATE POLICY "health_chat_sessions_insert_own" ON public.health_chat_sessions
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- 4. HELPER FUNCTIONS
-- =============================================

-- 4.1 构建 AI 上下文
CREATE OR REPLACE FUNCTION public.build_ai_context(
  p_pet_id uuid,
  p_date date DEFAULT CURRENT_DATE,
  p_range_days integer DEFAULT 7
)
RETURNS jsonb AS $$
DECLARE
  v_pet record;
  v_metrics jsonb;
  v_summary jsonb;
  v_anomalies jsonb;
  v_trends jsonb;
  v_history jsonb;
BEGIN
  -- 获取宠物信息
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id;

  -- 获取最近的指标
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date,
      'stool_score', stool_score,
      'appetite_score', appetite_score,
      'activity_score', activity_score,
      'weight_delta', weight_delta,
      'symptom_severity_score', symptom_severity_score
    ) ORDER BY date
  ) INTO v_metrics
  FROM public.health_metrics
  WHERE pet_id = p_pet_id
    AND date >= p_date - p_range_days
    AND date <= p_date;

  -- 获取最新的日总结
  SELECT jsonb_build_object(
    'date', date,
    'summary_text', summary_text,
    'risk_level', risk_level,
    'anomaly_flags', anomaly_flags
  ) INTO v_summary
  FROM public.daily_summary
  WHERE pet_id = p_pet_id
  ORDER BY date DESC
  LIMIT 1;

  -- 获取异常记录
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date,
      'type', jsonb_array_elements(anomaly_flags)->>'type',
      'severity', jsonb_array_elements(anomaly_flags)->>'severity',
      'message', jsonb_array_elements(anomaly_flags)->>'message'
    )
  ) INTO v_anomalies
  FROM public.daily_summary
  WHERE pet_id = p_pet_id
    AND date >= p_date - p_range_days
    AND anomaly_flags != '[]'::jsonb;

  -- 获取趋势数据
  v_trends := public.get_health_trends(p_pet_id, p_range_days);

  -- 获取历史记忆
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', memory_type,
      'title', title,
      'description', description,
      'severity', severity,
      'first_observed', first_observed,
      'occurrence_count', occurrence_count
    )
  ) INTO v_history
  FROM public.health_memory
  WHERE pet_id = p_pet_id
    AND is_active = true
  ORDER BY last_observed DESC
  LIMIT 10;

  -- 构建完整上下文
  RETURN jsonb_build_object(
    'pet', jsonb_build_object(
      'id', v_pet.id,
      'name', v_pet.name,
      'species', v_pet.species,
      'breed', v_pet.breed,
      'age_years', v_pet.age_years,
      'age_months', v_pet.age_months,
      'weight_kg', v_pet.weight_kg,
      'stomach_health', v_pet.stomach_health,
      'neutered', v_pet.neutered,
      'disease_history', v_pet.disease_history
    ),
    'date_range', jsonb_build_object(
      'start', p_date - p_range_days,
      'end', p_date,
      'days', p_range_days
    ),
    'metrics', COALESCE(v_metrics, '[]'::jsonb),
    'latest_summary', v_summary,
    'anomalies', COALESCE(v_anomalies, '[]'::jsonb),
    'trends', v_trends,
    'health_memory', COALESCE(v_history, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4.2 保存 AI 健康记忆
CREATE OR REPLACE FUNCTION public.save_health_memory(
  p_pet_id uuid,
  p_memory_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_severity text DEFAULT 'low',
  p_first_observed date DEFAULT CURRENT_DATE,
  p_related_metrics jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_memory_id uuid;
BEGIN
  -- 检查是否已有相同类型的记忆
  SELECT id INTO v_memory_id
  FROM public.health_memory
  WHERE pet_id = p_pet_id
    AND memory_type = p_memory_type
    AND title = p_title
    AND is_active = true;

  IF v_memory_id IS NOT NULL THEN
    -- 更新现有记忆
    UPDATE public.health_memory
    SET last_observed = CURRENT_DATE,
        occurrence_count = occurrence_count + 1,
        description = COALESCE(p_description, description),
        severity = p_severity,
        related_metrics = p_related_metrics,
        updated_at = now()
    WHERE id = v_memory_id;
  ELSE
    -- 创建新记忆
    INSERT INTO public.health_memory (
      pet_id, memory_type, title, description, severity,
      first_observed, last_observed, related_metrics
    ) VALUES (
      p_pet_id, p_memory_type, p_title, p_description, p_severity,
      p_first_observed, p_first_observed, p_related_metrics
    )
    RETURNING id INTO v_memory_id;
  END IF;

  RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql;
