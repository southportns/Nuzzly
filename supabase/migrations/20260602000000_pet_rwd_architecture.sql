-- =============================================
-- Pet RWD Architecture Upgrade Migration
-- Pet Real World Data Infrastructure
-- =============================================

-- 1. NEW EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. NEW ENUMS FOR PET RWD
-- =============================================

-- 事件类型枚举
CREATE TYPE pet_event_type_t AS ENUM (
  -- 饮食事件
  'food_start',           -- 开始食用
  'food_stop',            -- 停止食用
  'food_switch',          -- 更换食品
  'food_amount_change',   -- 食量变化

  -- 健康事件
  'symptom_observed',     -- 观察到症状
  'symptom_resolved',     -- 症状消失
  'weight_change',        -- 体重变化
  'energy_change',        -- 活跃度变化
  'appetite_change',      -- 食欲变化

  -- 医疗事件
  'vet_visit',            -- 就医
  'diagnosis',            -- 诊断
  'medication_start',     -- 开始用药
  'medication_stop',      -- 停止用药
  'vaccination',          -- 疫苗接种

  -- 行为事件
  'behavior_change',      -- 行为变化
  'environment_change',   -- 环境变化

  -- 数据事件
  'review_posted',        -- 发布评价
  'followup_completed',   -- 完成追评
  'photo_uploaded'        -- 上传照片
);

-- 数据来源枚举
CREATE TYPE event_source_t AS ENUM (
  'user_input',           -- 用户输入
  'ai_extraction',        -- AI提取
  'system_generated',     -- 系统生成
  'imported'              -- 外部导入
);

-- 生命周期阶段枚举
CREATE TYPE life_stage_t AS ENUM (
  'kitten',               -- 幼年（0-1岁）
  'young_adult',          -- 青年（1-3岁）
  'adult',                -- 成年（3-7岁）
  'senior',               -- 中年（7-10岁）
  'geriatric'             -- 老年（10岁+）
);

-- 活跃度枚举
CREATE TYPE activity_level_t AS ENUM (
  'very_low',             -- 极低
  'low',                  -- 低
  'medium',               -- 中等
  'high',                 -- 高
  'very_high'             -- 极高
);

-- 气候类型枚举
CREATE TYPE climate_type_t AS ENUM (
  'tropical',             -- 热带
  'subtropical',          -- 亚热带
  'temperate',            -- 温带
  'continental',          -- 大陆性
  'arid',                 -- 干旱
  'cold'                  -- 寒冷
);

-- 3. CORE PET RWD TABLES
-- =============================================

-- 3.1 Pet Events (统一事件系统) - 最核心表
CREATE TABLE public.pet_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type        pet_event_type_t NOT NULL,
  event_time        timestamptz NOT NULL DEFAULT now(),
  source_type       event_source_t NOT NULL DEFAULT 'user_input',
  trust_score       integer DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),

  -- 关联实体
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,
  review_id         uuid REFERENCES public.product_reviews(id) ON DELETE SET NULL,

  -- 事件元数据（灵活存储）
  metadata          jsonb DEFAULT '{}',

  -- 结构化数据字段
  symptom_code      text,           -- 标准化症状代码
  severity          integer CHECK (severity >= 1 AND severity <= 5),
  duration_days     integer,
  notes             text,

  -- AI处理字段
  ai_extracted      boolean DEFAULT false,
  ai_confidence     numeric(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  raw_text          text,           -- 原始文本（用于AI训练）

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.2 Symptom Ontology (症状标准化词典)
CREATE TABLE public.symptom_ontology (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name    text NOT NULL UNIQUE,     -- 标准名称
  display_name      text NOT NULL,            -- 显示名称
  category          text NOT NULL,            -- 分类（消化/皮肤/行为等）
  aliases           jsonb DEFAULT '[]',       -- 别名列表
  description       text,
  severity_default  integer DEFAULT 3 CHECK (severity_default >= 1 AND severity_default <= 5),
  is_active         boolean DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.3 Environment Profiles (环境数据层)
CREATE TABLE public.environment_profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 地理环境
  region            text,                     -- 地区
  city              text,                     -- 城市
  climate_type      climate_type_t,

  -- 家庭环境
  multi_pet_household boolean DEFAULT false,
  pet_count         integer DEFAULT 1,
  has_children      boolean DEFAULT false,
  indoor_outdoor    text DEFAULT 'indoor' CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'both')),

  -- 生活环境
  activity_level    activity_level_t DEFAULT 'medium',
  water_source      text DEFAULT 'tap',       -- 水源
  living_space      text,                     -- 居住空间

  -- 元数据
  metadata          jsonb DEFAULT '{}',
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(pet_id)
);

-- 3.4 Food Usage Periods (食品使用周期)
CREATE TABLE public.food_usage_periods (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_version_id uuid REFERENCES public.product_versions(id) ON DELETE SET NULL,

  -- 使用时间
  start_date        date NOT NULL,
  end_date          date,
  is_current        boolean DEFAULT true,

  -- 使用详情
  daily_amount      text,                     -- 每日用量
  feeding_frequency integer DEFAULT 2,        -- 每日喂食次数
  switch_reason     text,                     -- 更换原因

  -- 长期结果
  outcome_summary   text,                     -- 结果总结
  would_continue    boolean,
  stability_score   integer CHECK (stability_score >= 1 AND stability_score <= 5),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.5 Health Records (健康记录)
CREATE TABLE public.health_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 健康数据
  record_type       text NOT NULL CHECK (record_type IN ('weight', 'symptom', 'diagnosis', 'medication', 'vaccination', 'checkup')),
  record_time       timestamptz NOT NULL DEFAULT now(),

  -- 体重数据
  weight_kg         numeric(5,2),

  -- 症状数据
  symptom_code      text REFERENCES public.symptom_ontology(canonical_name),
  severity          integer CHECK (severity >= 1 AND severity <= 5),
  duration_days     integer,
  body_part         text,                     -- 身体部位

  -- 诊断数据
  diagnosis         text,
  diagnosis_code    text,                     -- ICD或自定义代码
  vet_clinic        text,
  vet_name          text,

  -- 用药数据
  medication_name   text,
  medication_dosage text,
  medication_frequency text,
  medication_start  date,
  medication_end    date,

  -- 关联
  related_food_period_id uuid REFERENCES public.food_usage_periods(id) ON DELETE SET NULL,
  related_event_id uuid REFERENCES public.pet_events(id) ON DELETE SET NULL,

  -- 元数据
  metadata          jsonb DEFAULT '{}',
  notes             text,
  attachments       jsonb DEFAULT '[]',       -- 附件URL列表

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.6 Life Stage History (生命周期历史)
CREATE TABLE public.life_stage_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  life_stage        life_stage_t NOT NULL,
  start_date        date NOT NULL,
  end_date          date,
  is_current        boolean DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.7 Causal Event Chains (因果事件链)
CREATE TABLE public.causal_event_chains (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,

  -- 链定义
  chain_name        text NOT NULL,
  chain_type        text NOT NULL CHECK (chain_type IN ('food_reaction', 'health_progression', 'treatment_outcome', 'custom')),

  -- 事件序列
  events            jsonb NOT NULL DEFAULT '[]',
  /* 示例结构：
  [
    {"event_id": "xxx", "day_offset": 0, "description": "开始食用猫粮A"},
    {"event_id": "yyy", "day_offset": 14, "description": "出现软便"},
    {"event_id": "zzz", "day_offset": 30, "description": "症状消失"}
  ]
  */

  -- 分析结果
  confidence        numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  is_causal         boolean,                  -- 是否存在因果关系
  causal_strength   numeric(3,2),             -- 因果强度

  -- 元数据
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.8 Stable Samples (长期稳定样本库)
CREATE TABLE public.stable_samples (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  food_period_id    uuid REFERENCES public.food_usage_periods(id) ON DELETE SET NULL,

  -- 稳定性数据
  stable_days       integer NOT NULL,         -- 稳定天数
  start_date        date NOT NULL,
  end_date          date NOT NULL,

  -- 健康指标
  weight_stable     boolean DEFAULT true,
  stool_stable      boolean DEFAULT true,
  coat_stable       boolean DEFAULT true,
  energy_stable     boolean DEFAULT true,
  no_symptoms       boolean DEFAULT true,

  -- 稳定性评分
  stability_score   integer NOT NULL CHECK (stability_score >= 1 AND stability_score <= 5),

  -- 用于AI训练
  is_training_sample boolean DEFAULT false,
  sample_quality    text DEFAULT 'good' CHECK (sample_quality IN ('excellent', 'good', 'fair', 'poor')),

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.9 Data Trust Scores (数据可信度评分)
CREATE TABLE public.data_trust_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       text NOT NULL CHECK (entity_type IN ('review', 'event', 'health_record', 'food_period')),
  entity_id         uuid NOT NULL,

  -- 评分维度
  trust_score       integer NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  suspicious_level  integer DEFAULT 0 CHECK (suspicious_level >= 0 AND suspicious_level <= 100),
  confidence_score  integer DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- 评分因子
  has_long_term_data boolean DEFAULT false,
  has_photos         boolean DEFAULT false,
  has_voucher        boolean DEFAULT false,
  is_continuous      boolean DEFAULT false,
  is_anomaly         boolean DEFAULT false,

  -- 详细评分
  factor_scores     jsonb DEFAULT '{}',
  /* 示例：
  {
    "long_term_bonus": 20,
    "photo_bonus": 10,
    "anomaly_penalty": -15,
    "consistency_bonus": 15
  }
  */

  calculated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- 3.10 NLP Extractions (NLP结构化抽取结果)
CREATE TABLE public.nlp_extractions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text       text NOT NULL,
  source_type       text NOT NULL CHECK (source_type IN ('review', 'post', 'comment', 'followup')),
  source_id         uuid,

  -- 抽取结果
  symptoms          jsonb DEFAULT '[]',       -- [{"code": "soft_stool", "confidence": 0.9}]
  timeline_events   jsonb DEFAULT '[]',       -- [{"time": "3_month", "event": "negative"}]
  food_mentions     jsonb DEFAULT '[]',       -- [{"product": "xxx", "sentiment": "negative"}]
  health_indicators jsonb DEFAULT '{}',       -- {"weight_trend": "increasing"}

  -- 处理状态
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  model_version     text,
  confidence        numeric(3,2),

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 4. ALTER EXISTING TABLES
-- =============================================

-- 4.1 扩展 pets 表支持生命周期
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS life_stage life_stage_t DEFAULT 'adult';
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS life_stage_updated_at timestamptz;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS environment_id uuid;

-- 4.2 扩展 product_reviews 表支持事件关联
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS event_id uuid;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS food_period_id uuid REFERENCES public.food_usage_periods(id) ON DELETE SET NULL;

-- 5. INDEXES FOR PET RWD
-- =============================================

-- pet_events 索引
CREATE INDEX idx_pet_events_pet_time ON public.pet_events(pet_id, event_time DESC);
CREATE INDEX idx_pet_events_type ON public.pet_events(event_type, event_time DESC);
CREATE INDEX idx_pet_events_product ON public.pet_events(product_id, event_time DESC) WHERE product_id IS NOT NULL;
CREATE INDEX idx_pet_events_symptom ON public.pet_events(symptom_code, event_time DESC) WHERE symptom_code IS NOT NULL;
CREATE INDEX idx_pet_events_trust ON public.pet_events(trust_score DESC);

-- symptom_ontology 索引
CREATE INDEX idx_symptom_category ON public.symptom_ontology(category);
CREATE INDEX idx_symptom_aliases ON public.symptom_ontology USING gin(aliases);

-- environment_profiles 索引
CREATE INDEX idx_env_climate ON public.environment_profiles(climate_type);
CREATE INDEX idx_env_multi_pet ON public.environment_profiles(multi_pet_household);

-- food_usage_periods 索引
CREATE INDEX idx_food_periods_pet ON public.food_usage_periods(pet_id, is_current);
CREATE INDEX idx_food_periods_product ON public.food_usage_periods(product_id, start_date DESC);
CREATE INDEX idx_food_periods_current ON public.food_usage_periods(pet_id, product_id) WHERE is_current = true;

-- health_records 索引
CREATE INDEX idx_health_records_pet ON public.health_records(pet_id, record_time DESC);
CREATE INDEX idx_health_records_type ON public.health_records(record_type, record_time DESC);
CREATE INDEX idx_health_records_symptom ON public.health_records(symptom_code) WHERE symptom_code IS NOT NULL;

-- life_stage_history 索引
CREATE INDEX idx_life_stage_pet ON public.life_stage_history(pet_id, is_current);

-- causal_event_chains 索引
CREATE INDEX idx_causal_chains_pet ON public.causal_event_chains(pet_id, chain_type);

-- stable_samples 索引
CREATE INDEX idx_stable_samples_product ON public.stable_samples(product_id, stable_days DESC);
CREATE INDEX idx_stable_samples_training ON public.stable_samples(is_training_sample, sample_quality) WHERE is_training_sample = true;

-- data_trust_scores 索引
CREATE INDEX idx_trust_entity ON public.data_trust_scores(entity_type, entity_id);
CREATE INDEX idx_trust_score ON public.data_trust_scores(trust_score DESC);

-- nlp_extractions 索引
CREATE INDEX idx_nlp_source ON public.nlp_extractions(source_type, source_id);
CREATE INDEX idx_nlp_status ON public.nlp_extractions(processing_status);

-- 6. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.pet_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_ontology ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.causal_event_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stable_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nlp_extractions ENABLE ROW LEVEL SECURITY;

-- 6.1 Public read access
CREATE POLICY "symptom_read_public" ON public.symptom_ontology
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- 6.2 Authenticated read access
CREATE POLICY "events_read_auth" ON public.pet_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "food_periods_read_auth" ON public.food_usage_periods
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "health_records_read_auth" ON public.health_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "life_stage_read_auth" ON public.life_stage_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stable_samples_read_auth" ON public.stable_samples
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trust_scores_read_auth" ON public.data_trust_scores
  FOR SELECT TO authenticated USING (true);

-- 6.3 Owner-based write access
CREATE POLICY "events_manage_own" ON public.pet_events
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "env_manage_own" ON public.environment_profiles
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "food_periods_manage_own" ON public.food_usage_periods
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "health_records_manage_own" ON public.health_records
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "life_stage_manage_own" ON public.life_stage_history
  FOR ALL TO authenticated
  USING (pet_id IN (SELECT id FROM public.pets WHERE profile_id = auth.uid()))
  WITH CHECK (pet_id IN (SELECT id FROM public.pets WHERE profile_id = auth.uid()));

CREATE POLICY "causal_chains_manage_own" ON public.causal_event_chains
  FOR ALL TO authenticated
  USING (pet_id IN (SELECT id FROM public.pets WHERE profile_id = auth.uid()))
  WITH CHECK (pet_id IN (SELECT id FROM public.pets WHERE profile_id = auth.uid()));

-- 7. TRIGGERS & FUNCTIONS
-- =============================================

-- 7.1 自动计算生命周期
CREATE OR REPLACE FUNCTION public.calculate_life_stage(birth_date date, species text)
RETURNS life_stage_t AS $$
DECLARE
  age_months integer;
BEGIN
  age_months := EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date)) * 12
              + EXTRACT(MONTH FROM age(CURRENT_DATE, birth_date));

  IF species = 'cat' THEN
    IF age_months < 12 THEN RETURN 'kitten';
    ELSIF age_months < 36 THEN RETURN 'young_adult';
    ELSIF age_months < 84 THEN RETURN 'adult';
    ELSIF age_months < 120 THEN RETURN 'senior';
    ELSE RETURN 'geriatric';
    END IF;
  ELSE -- dog
    IF age_months < 12 THEN RETURN 'kitten';
    ELSIF age_months < 36 THEN RETURN 'young_adult';
    ELSIF age_months < 84 THEN RETURN 'adult';
    ELSIF age_months < 120 THEN RETURN 'senior';
    ELSE RETURN 'geriatric';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7.2 自动更新宠物生命周期
CREATE OR REPLACE FUNCTION public.update_pet_life_stage()
RETURNS trigger AS $$
BEGIN
  IF NEW.age_years IS DISTINCT FROM OLD.age_years OR NEW.age_months IS DISTINCT FROM OLD.age_months THEN
    NEW.life_stage := public.calculate_life_stage(
      CURRENT_DATE - ((NEW.age_years * 12 + NEW.age_months) || ' months')::interval,
      NEW.species::text
    );
    NEW.life_stage_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pets_life_stage_update
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.update_pet_life_stage();

-- 7.3 从review自动创建事件
CREATE OR REPLACE FUNCTION public.create_event_from_review()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.pet_events (
    pet_id, profile_id, event_type, event_time,
    product_id, review_id, source_type,
    metadata
  ) VALUES (
    NEW.pet_id, NEW.profile_id, 'review_posted', NEW.created_at,
    NEW.product_id, NEW.id, 'user_input',
    jsonb_build_object(
      'usage_duration', NEW.usage_duration,
      'overall_rating', NEW.overall_rating,
      'stool_rating', NEW.stool_rating,
      'would_repurchase', NEW.would_repurchase
    )
  ) RETURNING id INTO NEW.event_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_review_create_event
  AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.create_event_from_review();

-- 7.4 从diet_log自动创建事件
CREATE OR REPLACE FUNCTION public.create_event_from_diet_log()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.pet_events (
    pet_id, profile_id, event_type, event_time,
    product_id, source_type, notes
  ) VALUES (
    NEW.pet_id, NEW.profile_id, 'food_start', NEW.created_at,
    NEW.product_id, 'user_input', NEW.notes
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_diet_log_create_event
  AFTER INSERT ON public.diet_logs
  FOR EACH ROW EXECUTE FUNCTION public.create_event_from_diet_log();

-- 7.5 自动计算数据可信度
CREATE OR REPLACE FUNCTION public.calculate_trust_score(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS integer AS $$
DECLARE
  score integer := 50;
  has_long_term boolean := false;
  has_photos boolean := false;
  is_continuous boolean := false;
BEGIN
  -- 根据实体类型计算
  IF p_entity_type = 'review' THEN
    SELECT
      r.usage_duration IN ('90d', '180d+'),
      r.has_voucher,
      EXISTS(SELECT 1 FROM public.review_followups rf WHERE rf.review_id = r.id AND rf.followup_day >= 90)
    INTO has_long_term, has_photos, is_continuous
    FROM public.product_reviews r
    WHERE r.id = p_entity_id;

    IF has_long_term THEN score := score + 20; END IF;
    IF has_photos THEN score := score + 10; END IF;
    IF is_continuous THEN score := score + 15; END IF;
  END IF;

  RETURN LEAST(100, GREATEST(0, score));
END;
$$ LANGUAGE plpgsql STABLE;

-- 7.6 更新updated_at触发器
CREATE OR REPLACE FUNCTION public.update_pet_rwd_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_usage_periods_updated_at
  BEFORE UPDATE ON public.food_usage_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_pet_rwd_updated_at();

CREATE TRIGGER environment_profiles_updated_at
  BEFORE UPDATE ON public.environment_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_pet_rwd_updated_at();

CREATE TRIGGER causal_event_chains_updated_at
  BEFORE UPDATE ON public.causal_event_chains
  FOR EACH ROW EXECUTE FUNCTION public.update_pet_rwd_updated_at();

-- 8. SEED DATA - 症状标准化词典
-- =============================================

INSERT INTO public.symptom_ontology (canonical_name, display_name, category, aliases) VALUES
-- 消化系统
('soft_stool', '软便', '消化', '["拉稀", "稀便", "便软", "拉肚子"]'::jsonb),
('vomiting', '呕吐', '消化', '["吐了", "反胃", "干呕"]'::jsonb),
('constipation', '便秘', '消化', '["拉不出", "排便困难"]'::jsonb),
('diarrhea', '腹泻', '消化', '["严重拉稀", "水便"]'::jsonb),
('loss_of_appetite', '食欲不振', '消化',	'["不吃东西", "食欲差", "挑食"]'::jsonb),

-- 皮肤问题
('black_chin', '黑下巴', '皮肤', '["下巴黑头", "毛囊炎", "黑下巴"]'::jsonb),
('tear_stain', '泪痕', '皮肤',	'["泪痕重", "眼屎多"]'::jsonb),
('hair_loss', '掉毛', '皮肤',	'["脱毛", "毛发稀疏", "掉毛严重"]'::jsonb),
('skin_redness', '皮肤发红', '皮肤', '["红疹", "皮肤红"]'::jsonb),
('itching', '瘙痒', '皮肤', '["挠痒痒", "抓挠"]'::jsonb),

-- 行为问题
('lethargy', '精神萎靡', '行为', '["没精神", "不爱动", "嗜睡"]'::jsonb),
('hyperactivity', '过度活跃', '行为', '["太兴奋", "停不下来"]'::jsonb),
('aggression', '攻击性', '行为', '["咬人", "凶"]'::jsonb),

-- 泌尿系统
('frequent_urination', '频繁排尿', '泌尿', '["尿频", "老上厕所"]'::jsonb),
('blood_in_urine', '血尿', '泌尿', '["尿血"]'::jsonb),
('urinary_blockage', '尿闭', '泌尿', '["尿不出", "排尿困难"]'::jsonb),

-- 体重问题
('weight_gain', '体重增加', '体重', '["变胖", "超重"]'::jsonb),
('weight_loss', '体重下降', '体重', '["变瘦", "消瘦"]'::jsonb),

-- 呼吸系统
('sneezing', '打喷嚏', '呼吸', '["喷嚏"]'::jsonb),
('coughing', '咳嗽', '呼吸', '["咳"]'::jsonb),
('nasal_discharge', '流鼻涕', '呼吸', '["鼻涕"]'::jsonb),

-- 眼部问题
('eye_discharge', '眼部分泌物', '眼部',	'["眼屎", "眼睛有分泌物"]'::jsonb),
('conjunctivitis', '结膜炎', '眼部', '["红眼", "眼睛发炎"]'::jsonb);

-- 9. VIEWS FOR ANALYTICS
-- =============================================

-- 9.1 宠物完整时间线视图
CREATE OR REPLACE VIEW public.pet_complete_timeline AS
SELECT
  pe.pet_id,
  pe.event_time,
  pe.event_type,
  pe.symptom_code,
  pe.severity,
  pe.notes,
  pe.metadata,
  p.name as pet_name,
  p.breed,
  p.species,
  pr.name as product_name,
  pr.brand as product_brand
FROM public.pet_events pe
JOIN public.pets p ON pe.pet_id = p.id
LEFT JOIN public.products pr ON pe.product_id = pr.id
ORDER BY pe.pet_id, pe.event_time DESC;

-- 9.2 食品长期结果视图
CREATE OR REPLACE VIEW public.food_long_term_outcomes AS
SELECT
  fup.product_id,
  fup.pet_id,
  p.breed,
  p.species,
  p.life_stage,
  fup.start_date,
  fup.end_date,
  fup.stability_score,
  fup.would_continue,
  pr.name as product_name,
  pr.brand,
  COUNT(DISTINCT pe.id) as event_count,
  COUNT(DISTINCT CASE WHEN pe.event_type = 'symptom_observed' THEN pe.id END) as symptom_count
FROM public.food_usage_periods fup
JOIN public.pets p ON fup.pet_id = p.id
JOIN public.products pr ON fup.product_id = pr.id
LEFT JOIN public.pet_events pe ON pe.pet_id = fup.pet_id
  AND pe.event_time >= fup.start_date
  AND (fup.end_date IS NULL OR pe.event_time <= fup.end_date)
GROUP BY fup.id, fup.product_id, fup.pet_id, p.breed, p.species, p.life_stage,
         fup.start_date, fup.end_date, fup.stability_score, fup.would_continue,
         pr.name, pr.brand;

-- 9.3 品种级风险分析视图
CREATE OR REPLACE VIEW public.breed_risk_analysis AS
SELECT
  p.breed,
  p.species,
  pe.symptom_code,
  so.display_name as symptom_name,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT pe.pet_id) as affected_pets,
  COUNT(DISTINCT pe.product_id) as products_involved,
  AVG(pe.severity) as avg_severity,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pe.severity) as median_severity
FROM public.pet_events pe
JOIN public.pets p ON pe.pet_id = p.id
LEFT JOIN public.symptom_ontology so ON pe.symptom_code = so.canonical_name
WHERE pe.event_type = 'symptom_observed'
  AND p.breed IS NOT NULL
GROUP BY p.breed, p.species, pe.symptom_code, so.display_name
HAVING COUNT(*) >= 5;  -- 至少5个样本

-- 10. HELPER FUNCTIONS
-- =============================================

-- 10.1 获取宠物完整健康时间线
CREATE OR REPLACE FUNCTION public.get_pet_health_timeline(p_pet_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'pet_info', (
      SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'breed', p.breed,
        'species', p.species,
        'life_stage', p.life_stage,
        'age', p.age_years || '岁' || p.age_months || '月'
      )
      FROM public.pets p WHERE p.id = p_pet_id
    ),
    'timeline', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'time', pe.event_time,
          'type', pe.event_type,
          'symptom', pe.symptom_code,
          'severity', pe.severity,
          'product', pr.name,
          'notes', pe.notes
        ) ORDER BY pe.event_time DESC
      )
      FROM public.pet_events pe
      LEFT JOIN public.products pr ON pe.product_id = pr.id
      WHERE pe.pet_id = p_pet_id
    ),
    'food_periods', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'product', pr.name,
          'brand', pr.brand,
          'start', fup.start_date,
          'end', fup.end_date,
          'is_current', fup.is_current,
          'stability', fup.stability_score
        ) ORDER BY fup.start_date DESC
      )
      FROM public.food_usage_periods fup
      JOIN public.products pr ON fup.product_id = pr.id
      WHERE fup.pet_id = p_pet_id
    ),
    'health_summary', (
      SELECT jsonb_build_object(
        'total_events', COUNT(*),
        'symptom_count', COUNT(*) FILTER (WHERE event_type = 'symptom_observed'),
        'vet_visits', COUNT(*) FILTER (WHERE event_type = 'vet_visit'),
        'stable_days', COALESCE(
          (SELECT SUM(stable_days) FROM public.stable_samples WHERE pet_id = p_pet_id),
          0
        )
      )
      FROM public.pet_events WHERE pet_id = p_pet_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 10.2 获取产品长期风险数据
CREATE OR REPLACE FUNCTION public.get_product_long_term_risk(p_product_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'product_id', p_product_id,
    'total_users', COUNT(DISTINCT fup.pet_id),
    'avg_stable_days', AVG(ss.stable_days),
    'symptom_rates', (
      SELECT jsonb_object_agg(
        symptom_code,
        ROUND(count * 100.0 / NULLIF(total, 0), 2)
      )
      FROM (
        SELECT
          pe.symptom_code,
          COUNT(*) as count,
          SUM(COUNT(*)) OVER () as total
        FROM public.pet_events pe
        WHERE pe.product_id = p_product_id
          AND pe.event_type = 'symptom_observed'
        GROUP BY pe.symptom_code
      ) t
    ),
    'life_stage_breakdown', (
      SELECT jsonb_object_agg(
        life_stage,
        jsonb_build_object(
          'count', user_count,
          'avg_stability', avg_stability
        )
      )
      FROM (
        SELECT
          p.life_stage,
          COUNT(DISTINCT fup.pet_id) as user_count,
          AVG(fup.stability_score) as avg_stability
        FROM public.food_usage_periods fup
        JOIN public.pets p ON fup.pet_id = p.id
        WHERE fup.product_id = p_product_id
        GROUP BY p.life_stage
      ) t
    )
  )
  FROM public.food_usage_periods fup
  LEFT JOIN public.stable_samples ss ON ss.pet_id = fup.pet_id AND ss.product_id = fup.product_id
  WHERE fup.product_id = p_product_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
