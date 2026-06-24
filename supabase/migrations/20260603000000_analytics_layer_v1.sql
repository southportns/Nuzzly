-- =============================================
-- Pet RWD Analytics Layer v1
-- Data Analytics Infrastructure
-- =============================================

-- 1. NEW ENUMS
-- =============================================

CREATE TYPE risk_level_t AS ENUM ('low', 'medium', 'high', 'critical');

-- 2. NEW TABLES
-- =============================================

-- 2.1 health_metrics (标准化指标层)
CREATE TABLE public.health_metrics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  date              date NOT NULL,

  -- 核心健康指标 (0-5 分)
  stool_score       numeric(3,1) CHECK (stool_score >= 0 AND stool_score <= 5),
  appetite_score    numeric(3,1) CHECK (appetite_score >= 0 AND appetite_score <= 5),
  activity_score    numeric(3,1) CHECK (activity_score >= 0 AND activity_score <= 5),
  weight_delta      numeric(5,2),  -- 体重变化百分比
  symptom_severity_score numeric(3,1) CHECK (symptom_severity_score >= 0 AND symptom_severity_score <= 5),

  -- 元数据
  raw_data_count    integer DEFAULT 0,  -- 原始数据点数量
  calculation_method text DEFAULT 'rule_based',
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(pet_id, date)
);

-- 2.2 daily_summary (日级总结表)
CREATE TABLE public.daily_summary (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  date              date NOT NULL,

  -- 分析输出
  summary_text      text,
  risk_level        risk_level_t NOT NULL DEFAULT 'low',
  anomaly_flags     jsonb DEFAULT '[]',

  -- 指标快照
  metrics_snapshot  jsonb DEFAULT '{}',

  -- 元数据
  generated_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(pet_id, date)
);

-- 2.3 analytics_jobs (分析任务记录)
CREATE TABLE public.analytics_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type          text NOT NULL CHECK (job_type IN ('daily_summary', 'metrics_calc', 'trend_analysis')),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  pet_id            uuid REFERENCES public.pets(id) ON DELETE CASCADE,

  -- 执行信息
  started_at        timestamptz,
  completed_at      timestamptz,
  error_message     text,

  -- 结果统计
  records_processed integer DEFAULT 0,
  metrics_generated integer DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. INDEXES
-- =============================================

CREATE INDEX idx_health_metrics_pet_date ON public.health_metrics(pet_id, date DESC);
CREATE INDEX idx_health_metrics_date ON public.health_metrics(date DESC);

CREATE INDEX idx_daily_summary_pet_date ON public.daily_summary(pet_id, date DESC);
CREATE INDEX idx_daily_summary_risk ON public.daily_summary(risk_level, date DESC);

CREATE INDEX idx_analytics_jobs_status ON public.analytics_jobs(status, created_at DESC);
CREATE INDEX idx_analytics_jobs_pet ON public.analytics_jobs(pet_id, created_at DESC);

-- 4. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_jobs ENABLE ROW LEVEL SECURITY;

-- Public read for metrics and summaries
CREATE POLICY "health_metrics_read_auth" ON public.health_metrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "daily_summary_read_auth" ON public.daily_summary
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "analytics_jobs_read_auth" ON public.analytics_jobs
  FOR SELECT TO authenticated USING (true);

-- 5. HELPER FUNCTIONS
-- =============================================

-- 5.1 计算排便评分
CREATE OR REPLACE FUNCTION public.calculate_stool_score(
  p_pet_id uuid,
  p_date date,
  p_window_days integer DEFAULT 7
)
RETURNS numeric AS $$
DECLARE
  v_score numeric := 5.0;
  v_soft_count integer;
  v_diarrhea_count integer;
  v_total_records integer;
BEGIN
  -- 统计窗口期内的症状记录
  SELECT
    COUNT(*) FILTER (WHERE symptom_code = 'soft_stool'),
    COUNT(*) FILTER (WHERE symptom_code = 'diarrhea'),
    COUNT(*)
  INTO v_soft_count, v_diarrhea_count, v_total_records
  FROM public.pet_events
  WHERE pet_id = p_pet_id
    AND event_type = 'symptom_observed'
    AND event_time::date BETWEEN p_date - p_window_days AND p_date;

  -- 评分规则
  IF v_diarrhea_count >= 2 THEN
    v_score := 0.0;
  ELSIF v_diarrhea_count >= 1 THEN
    v_score := 1.0;
  ELSIF v_soft_count >= 3 THEN
    v_score := 1.5;
  ELSIF v_soft_count >= 2 THEN
    v_score := 2.0;
  ELSIF v_soft_count >= 1 THEN
    v_score := 3.5;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.2 计算食欲评分
CREATE OR REPLACE FUNCTION public.calculate_appetite_score(
  p_pet_id uuid,
  p_date date,
  p_window_days integer DEFAULT 7
)
RETURNS numeric AS $$
DECLARE
  v_score numeric := 5.0;
  v_appetite_events integer;
  v_food_logs integer;
BEGIN
  -- 统计食欲异常事件
  SELECT COUNT(*)
  INTO v_appetite_events
  FROM public.pet_events
  WHERE pet_id = p_pet_id
    AND event_type = 'appetite_change'
    AND event_time::date BETWEEN p_date - p_window_days AND p_date
    AND metadata->>'change_type' IN ('decreased', 'lost');

  -- 统计饮食记录（无记录可能表示食欲问题）
  SELECT COUNT(*)
  INTO v_food_logs
  FROM public.diet_logs
  WHERE pet_id = p_pet_id
    AND logged_date BETWEEN p_date - p_window_days AND p_date;

  -- 评分规则
  IF v_appetite_events >= 3 THEN
    v_score := 0.0;
  ELSIF v_appetite_events >= 2 THEN
    v_score := 1.5;
  ELSIF v_appetite_events >= 1 THEN
    v_score := 3.0;
  ELSIF v_food_logs = 0 AND p_window_days >= 3 THEN
    v_score := 2.0;  -- 无饮食记录
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.3 计算活跃度评分
CREATE OR REPLACE FUNCTION public.calculate_activity_score(
  p_pet_id uuid,
  p_date date,
  p_window_days integer DEFAULT 7
)
RETURNS numeric AS $$
DECLARE
  v_score numeric := 5.0;
  v_energy_events integer;
  v_lethargy_count integer;
BEGIN
  -- 统计活跃度相关事件
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE metadata->>'change_type' = 'decreased' OR symptom_code = 'lethargy')
  INTO v_energy_events, v_lethargy_count
  FROM public.pet_events
  WHERE pet_id = p_pet_id
    AND (event_type = 'energy_change' OR (event_type = 'symptom_observed' AND symptom_code = 'lethargy'))
    AND event_time::date BETWEEN p_date - p_window_days AND p_date;

  -- 评分规则
  IF v_lethargy_count >= 3 THEN
    v_score := 0.5;
  ELSIF v_lethargy_count >= 2 THEN
    v_score := 1.5;
  ELSIF v_lethargy_count >= 1 THEN
    v_score := 3.0;
  ELSIF v_energy_events >= 2 THEN
    v_score := 3.5;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.4 计算体重变化
CREATE OR REPLACE FUNCTION public.calculate_weight_delta(
  p_pet_id uuid,
  p_date date,
  p_window_days integer DEFAULT 7
)
RETURNS numeric AS $$
DECLARE
  v_weight_start numeric;
  v_weight_end numeric;
  v_delta numeric;
BEGIN
  -- 获取窗口期起始体重
  SELECT weight_kg INTO v_weight_start
  FROM public.health_records
  WHERE pet_id = p_pet_id
    AND record_type = 'weight'
    AND record_time::date <= p_date - p_window_days
  ORDER BY record_time DESC
  LIMIT 1;

  -- 获取窗口期结束体重
  SELECT weight_kg INTO v_weight_end
  FROM public.health_records
  WHERE pet_id = p_pet_id
    AND record_type = 'weight'
    AND record_time::date <= p_date
  ORDER BY record_time DESC
  LIMIT 1;

  -- 计算变化百分比
  IF v_weight_start IS NOT NULL AND v_weight_end IS NOT NULL AND v_weight_start > 0 THEN
    v_delta := ((v_weight_end - v_weight_start) / v_weight_start) * 100;
  ELSE
    v_delta := 0;
  END IF;

  RETURN ROUND(v_delta, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.5 计算症状严重度评分
CREATE OR REPLACE FUNCTION public.calculate_symptom_severity(
  p_pet_id uuid,
  p_date date,
  p_window_days integer DEFAULT 7
)
RETURNS numeric AS $$
DECLARE
  v_score numeric := 5.0;
  v_avg_severity numeric;
  v_high_severity_count integer;
BEGIN
  -- 统计症状严重度
  SELECT
    COALESCE(AVG(severity), 0),
    COUNT(*) FILTER (WHERE severity >= 4)
  INTO v_avg_severity, v_high_severity_count
  FROM public.pet_events
  WHERE pet_id = p_pet_id
    AND event_type = 'symptom_observed'
    AND severity IS NOT NULL
    AND event_time::date BETWEEN p_date - p_window_days AND p_date;

  -- 评分规则（5分表示无症状，0分表示严重）
  IF v_high_severity_count >= 3 THEN
    v_score := 0.0;
  ELSIF v_high_severity_count >= 2 THEN
    v_score := 1.0;
  ELSIF v_avg_severity >= 4 THEN
    v_score := 1.5;
  ELSIF v_avg_severity >= 3 THEN
    v_score := 2.5;
  ELSIF v_avg_severity >= 2 THEN
    v_score := 3.5;
  ELSIF v_avg_severity >= 1 THEN
    v_score := 4.0;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.6 计算单日健康指标
CREATE OR REPLACE FUNCTION public.calculate_daily_metrics(
  p_pet_id uuid,
  p_date date
)
RETURNS void AS $$
DECLARE
  v_stool numeric;
  v_appetite numeric;
  v_activity numeric;
  v_weight_delta numeric;
  v_symptom_severity numeric;
  v_raw_count integer;
BEGIN
  -- 计算各项指标
  v_stool := public.calculate_stool_score(p_pet_id, p_date, 7);
  v_appetite := public.calculate_appetite_score(p_pet_id, p_date, 7);
  v_activity := public.calculate_activity_score(p_pet_id, p_date, 7);
  v_weight_delta := public.calculate_weight_delta(p_pet_id, p_date, 7);
  v_symptom_severity := public.calculate_symptom_severity(p_pet_id, p_date, 7);

  -- 统计原始数据点
  SELECT COUNT(*)
  INTO v_raw_count
  FROM public.pet_events
  WHERE pet_id = p_pet_id
    AND event_time::date = p_date;

  -- 写入 health_metrics
  INSERT INTO public.health_metrics (
    pet_id, date,
    stool_score, appetite_score, activity_score,
    weight_delta, symptom_severity_score,
    raw_data_count
  ) VALUES (
    p_pet_id, p_date,
    v_stool, v_appetite, v_activity,
    v_weight_delta, v_symptom_severity,
    v_raw_count
  )
  ON CONFLICT (pet_id, date) DO UPDATE SET
    stool_score = EXCLUDED.stool_score,
    appetite_score = EXCLUDED.appetite_score,
    activity_score = EXCLUDED.activity_score,
    weight_delta = EXCLUDED.weight_delta,
    symptom_severity_score = EXCLUDED.symptom_severity_score,
    raw_data_count = EXCLUDED.raw_data_count,
    created_at = now();
END;
$$ LANGUAGE plpgsql;

-- 5.7 生成每日总结
CREATE OR REPLACE FUNCTION public.generate_daily_summary(
  p_pet_id uuid,
  p_date date
)
RETURNS void AS $$
DECLARE
  v_metrics record;
  v_risk_level risk_level_t := 'low';
  v_anomaly_flags jsonb := '[]'::jsonb;
  v_summary_text text := '';
  v_pet_name text;
  v_trend_text text := '';
BEGIN
  -- 获取宠物名称
  SELECT name INTO v_pet_name FROM public.pets WHERE id = p_pet_id;

  -- 获取当日指标
  SELECT * INTO v_metrics
  FROM public.health_metrics
  WHERE pet_id = p_pet_id AND date = p_date;

  IF v_metrics IS NULL THEN
    -- 如果没有指标，先计算
    PERFORM public.calculate_daily_metrics(p_pet_id, p_date);
    SELECT * INTO v_metrics
    FROM public.health_metrics
    WHERE pet_id = p_pet_id AND date = p_date;
  END IF;

  -- 异常检测规则
  -- 规则1: 软便 >= 2次/3天
  IF v_metrics.stool_score <= 2.0 THEN
    v_anomaly_flags := v_anomaly_flags || '{"type": "stool_issue", "severity": "warning", "message": "排便异常"}'::jsonb;
    v_risk_level := 'medium';
  END IF;

  -- 规则2: 体重下降 >= 5%
  IF v_metrics.weight_delta <= -5.0 THEN
    v_anomaly_flags := v_anomaly_flags || '{"type": "weight_loss", "severity": "high", "message": "体重显著下降"}'::jsonb;
    v_risk_level := 'high';
  ELSIF v_metrics.weight_delta <= -3.0 THEN
    v_anomaly_flags := v_anomaly_flags || '{"type": "weight_loss", "severity": "medium", "message": "体重下降"}'::jsonb;
    IF v_risk_level = 'low' THEN v_risk_level := 'medium'; END IF;
  END IF;

  -- 规则3: 食欲下降连续2天
  IF v_metrics.appetite_score <= 2.0 THEN
    v_anomaly_flags := v_anomaly_flags || '{"type": "appetite_issue", "severity": "warning", "message": "食欲异常"}'::jsonb;
    IF v_risk_level = 'low' THEN v_risk_level := 'medium'; END IF;
  END IF;

  -- 规则4: 活跃度低
  IF v_metrics.activity_score <= 2.0 THEN
    v_anomaly_flags := v_anomaly_flags || '{"type": "low_activity", "severity": "warning", "message": "活跃度低"}'::jsonb;
  END IF;

  -- 规则5: 症状严重度高
  IF v_metrics.symptom_severity_score <= 2.0 THEN
    v_anomaly_flags := v_anomaly_flags || '{"type": "high_severity", "severity": "high", "message": "症状严重"}'::jsonb;
    v_risk_level := 'high';
  END IF;

  -- 生成总结文本
  v_summary_text := '过去7天，';

  IF v_metrics.stool_score >= 4.0 THEN
    v_summary_text := v_summary_text || '排便正常，';
  ELSIF v_metrics.stool_score >= 3.0 THEN
    v_summary_text := v_summary_text || '排便偶有异常，';
  ELSE
    v_summary_text := v_summary_text || '排便稳定性降低，';
  END IF;

  IF v_metrics.appetite_score >= 4.0 THEN
    v_summary_text := v_summary_text || '食欲良好，';
  ELSIF v_metrics.appetite_score >= 3.0 THEN
    v_summary_text := v_summary_text || '食欲略有下降，';
  ELSE
    v_summary_text := v_summary_text || '食欲异常，';
  END IF;

  IF v_metrics.weight_delta > 1 THEN
    v_summary_text := v_summary_text || '体重增加' || ROUND(v_metrics.weight_delta, 1) || '%，';
  ELSIF v_metrics.weight_delta < -1 THEN
    v_summary_text := v_summary_text || '体重下降' || ROUND(ABS(v_metrics.weight_delta), 1) || '%，';
  ELSE
    v_summary_text := v_summary_text || '体重稳定，';
  END IF;

  -- 添加风险等级
  CASE v_risk_level
    WHEN 'low' THEN v_summary_text := v_summary_text || '整体健康状态良好。';
    WHEN 'medium' THEN v_summary_text := v_summary_text || '整体健康风险为中等，建议关注。';
    WHEN 'high' THEN v_summary_text := v_summary_text || '存在健康风险，建议及时就医。';
    ELSE v_summary_text := v_summary_text || '需要密切关注。';
  END CASE;

  -- 写入 daily_summary
  INSERT INTO public.daily_summary (
    pet_id, date,
    summary_text, risk_level, anomaly_flags,
    metrics_snapshot
  ) VALUES (
    p_pet_id, p_date,
    v_summary_text, v_risk_level, v_anomaly_flags,
    jsonb_build_object(
      'stool_score', v_metrics.stool_score,
      'appetite_score', v_metrics.appetite_score,
      'activity_score', v_metrics.activity_score,
      'weight_delta', v_metrics.weight_delta,
      'symptom_severity_score', v_metrics.symptom_severity_score
    )
  )
  ON CONFLICT (pet_id, date) DO UPDATE SET
    summary_text = EXCLUDED.summary_text,
    risk_level = EXCLUDED.risk_level,
    anomaly_flags = EXCLUDED.anomaly_flags,
    metrics_snapshot = EXCLUDED.metrics_snapshot,
    generated_at = now();
END;
$$ LANGUAGE plpgsql;

-- 5.8 运行每日分析任务
CREATE OR REPLACE FUNCTION public.run_analytics_job(
  p_pet_id uuid DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS uuid AS $$
DECLARE
  v_job_id uuid;
  v_pet record;
  v_processed integer := 0;
  v_generated integer := 0;
BEGIN
  -- 创建任务记录
  INSERT INTO public.analytics_jobs (job_type, status, pet_id, started_at)
  VALUES ('daily_summary', 'running', p_pet_id, now())
  RETURNING id INTO v_job_id;

  BEGIN
    IF p_pet_id IS NOT NULL THEN
      -- 处理单只宠物
      PERFORM public.calculate_daily_metrics(p_pet_id, p_date);
      PERFORM public.generate_daily_summary(p_pet_id, p_date);
      v_processed := 1;
      v_generated := 1;
    ELSE
      -- 处理所有活跃宠物
      FOR v_pet IN SELECT id FROM public.pets WHERE is_active = true
      LOOP
        PERFORM public.calculate_daily_metrics(v_pet.id, p_date);
        PERFORM public.generate_daily_summary(v_pet.id, p_date);
        v_processed := v_processed + 1;
        v_generated := v_generated + 1;
      END LOOP;
    END IF;

    -- 更新任务状态
    UPDATE public.analytics_jobs
    SET status = 'completed',
        completed_at = now(),
        records_processed = v_processed,
        metrics_generated = v_generated
    WHERE id = v_job_id;

  EXCEPTION WHEN OTHERS THEN
    -- 记录错误
    UPDATE public.analytics_jobs
    SET status = 'failed',
        completed_at = now(),
        error_message = SQLERRM
    WHERE id = v_job_id;
  END;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- 5.9 获取趋势数据
CREATE OR REPLACE FUNCTION public.get_health_trends(
  p_pet_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'weight', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'value', weight_delta,
          'trend', CASE
            WHEN weight_delta > 1 THEN 'increasing'
            WHEN weight_delta < -1 THEN 'decreasing'
            ELSE 'stable'
          END
        ) ORDER BY date
      )
      FROM public.health_metrics
      WHERE pet_id = p_pet_id
        AND date >= CURRENT_DATE - p_days
    ),
    'appetite', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'value', appetite_score,
          'trend', CASE
            WHEN appetite_score >= 4 THEN 'good'
            WHEN appetite_score >= 3 THEN 'fair'
            ELSE 'poor'
          END
        ) ORDER BY date
      )
      FROM public.health_metrics
      WHERE pet_id = p_pet_id
        AND date >= CURRENT_DATE - p_days
    ),
    'stool', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'value', stool_score,
          'trend', CASE
            WHEN stool_score >= 4 THEN 'stable'
            WHEN stool_score >= 3 THEN 'mild_issues'
            ELSE 'issues'
          END
        ) ORDER BY date
      )
      FROM public.health_metrics
      WHERE pet_id = p_pet_id
        AND date >= CURRENT_DATE - p_days
    ),
    'activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'value', activity_score,
          'trend', CASE
            WHEN activity_score >= 4 THEN 'active'
            WHEN activity_score >= 3 THEN 'normal'
            ELSE 'low'
          END
        ) ORDER BY date
      )
      FROM public.health_metrics
      WHERE pet_id = p_pet_id
        AND date >= CURRENT_DATE - p_days
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
