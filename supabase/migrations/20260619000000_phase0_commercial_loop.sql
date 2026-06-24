-- =============================================
-- Phase 0: Commercial Loop Enhancement
-- Intent Events + Product Tags + Health Overview Support
-- =============================================

-- 1. Recommendation Contexts Table (create first for FK reference)
CREATE TABLE IF NOT EXISTS recommendation_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  recommendation_type TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recommendation_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendation_contexts_insert_own"
  ON recommendation_contexts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "recommendation_contexts_select_own"
  ON recommendation_contexts FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE INDEX idx_recommendation_contexts_profile ON recommendation_contexts(profile_id);
CREATE INDEX idx_recommendation_contexts_product ON recommendation_contexts(product_id);

-- 2. Intent Events Table (Purchase Intent Tracking)
CREATE TABLE IF NOT EXISTS intent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'product_view', 'product_click', 'product_bookmark', 'product_unbookmark',
    'product_review', 'product_followup',
    'recommendation_accept', 'recommendation_reject', 'recommendation_click'
  )),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES recommendation_contexts(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intent_events_profile ON intent_events(profile_id);
CREATE INDEX idx_intent_events_type ON intent_events(event_type);
CREATE INDEX idx_intent_events_product ON intent_events(product_id);
CREATE INDEX idx_intent_events_created ON intent_events(created_at DESC);

ALTER TABLE intent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intent_events_insert_own"
  ON intent_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "intent_events_select_own"
  ON intent_events FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- Admin can read all
CREATE POLICY "intent_events_select_admin"
  ON intent_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 2. Product Tags Table (成分/适用/风险标签)
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('ingredient', 'suitable_for', 'risk', 'certification', 'feature')),
  tag_key TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai_extracted', 'community')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_product_tags_product ON product_tags(product_id);
CREATE INDEX idx_product_tags_type ON product_tags(tag_type);
CREATE INDEX idx_product_tags_key ON product_tags(tag_key);

ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_tags_select_authenticated"
  ON product_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "product_tags_insert_admin"
  ON product_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "product_tags_update_admin"
  ON product_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 3. Function: Get pet health summary
CREATE OR REPLACE FUNCTION get_pet_health_summary(p_pet_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_pet RECORD;
  v_diet_count INT;
  v_weight_count INT;
  v_symptom_count INT;
  v_last_diet TIMESTAMPTZ;
  v_last_weight TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_pet FROM pets WHERE id = p_pet_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_diet_count FROM diet_logs WHERE pet_id = p_pet_id;
  SELECT COUNT(*) INTO v_weight_count FROM weight_logs WHERE pet_id = p_pet_id;
  SELECT COUNT(*) INTO v_symptom_count FROM pet_events WHERE pet_id = p_pet_id AND event_type = 'symptom';
  SELECT MAX(created_at) INTO v_last_diet FROM diet_logs WHERE pet_id = p_pet_id;
  SELECT MAX(created_at) INTO v_last_weight FROM weight_logs WHERE pet_id = p_pet_id;

  result := jsonb_build_object(
    'pet_id', v_pet.id,
    'name', v_pet.name,
    'species', v_pet.species,
    'breed', v_pet.breed,
    'age_years', v_pet.age_years,
    'age_months', v_pet.age_months,
    'weight_kg', v_pet.weight_kg,
    'stomach_health', v_pet.stomach_health,
    'neutered', v_pet.neutered,
    'disease_history', v_pet.disease_history,
    'stats', jsonb_build_object(
      'diet_log_count', v_diet_count,
      'weight_log_count', v_weight_count,
      'symptom_count', v_symptom_count,
      'last_diet_log', v_last_diet,
      'last_weight_log', v_last_weight
    )
  );

  RETURN result;
END;
$$;

-- 4. Function: Get user intent funnel stats
CREATE OR REPLACE FUNCTION get_user_intent_funnel(p_profile_id UUID, p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_views INT;
  v_clicks INT;
  v_bookmarks INT;
  v_reviews INT;
  v_accepts INT;
  v_rejects INT;
BEGIN
  SELECT COUNT(*) INTO v_views FROM intent_events
    WHERE profile_id = p_profile_id AND event_type = 'product_view'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  SELECT COUNT(*) INTO v_clicks FROM intent_events
    WHERE profile_id = p_profile_id AND event_type IN ('product_click', 'recommendation_click')
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  SELECT COUNT(*) INTO v_bookmarks FROM intent_events
    WHERE profile_id = p_profile_id AND event_type = 'product_bookmark'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  SELECT COUNT(*) INTO v_reviews FROM intent_events
    WHERE profile_id = p_profile_id AND event_type = 'product_review'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  SELECT COUNT(*) INTO v_accepts FROM intent_events
    WHERE profile_id = p_profile_id AND event_type = 'recommendation_accept'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  SELECT COUNT(*) INTO v_rejects FROM intent_events
    WHERE profile_id = p_profile_id AND event_type = 'recommendation_reject'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  result := jsonb_build_object(
    'period_days', p_days,
    'views', v_views,
    'clicks', v_clicks,
    'bookmarks', v_bookmarks,
    'reviews', v_reviews,
    'accepts', v_accepts,
    'rejects', v_rejects,
    'click_rate', CASE WHEN v_views > 0 THEN ROUND(v_clicks::NUMERIC / v_views, 3) ELSE 0 END,
    'bookmark_rate', CASE WHEN v_views > 0 THEN ROUND(v_bookmarks::NUMERIC / v_views, 3) ELSE 0 END,
    'review_rate', CASE WHEN v_views > 0 THEN ROUND(v_reviews::NUMERIC / v_views, 3) ELSE 0 END
  );

  RETURN result;
END;
$$;
