-- =============================================
-- Review Timeline & Trust Engine — PFLID Core Upgrade
-- Transforms independent reviews into longitudinal outcome records
-- =============================================

-- 1. REVIEW TIMELINE GROUPS
CREATE TABLE pflid.review_timeline_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id           text NOT NULL,
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  first_review_date   timestamptz NOT NULL,
  last_review_date    timestamptz NOT NULL,
  review_count        integer NOT NULL DEFAULT 1 CHECK (review_count >= 1),
  total_days_span     integer GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (last_review_date - first_review_date))::integer
  ) STORED,
  timeline_score      numeric(4,1) DEFAULT 50.0 CHECK (timeline_score >= 0 AND timeline_score <= 100),
  trust_factors       jsonb DEFAULT '{}',
  has_photos          boolean DEFAULT false,
  has_repurchase      boolean DEFAULT false,
  has_opinion_change  boolean DEFAULT false,
  is_active           boolean DEFAULT true,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(author_id, product_id, first_review_date)
);

CREATE INDEX idx_tlg_product ON pflid.review_timeline_groups(product_id, first_review_date DESC);
CREATE INDEX idx_tlg_author ON pflid.review_timeline_groups(author_id, product_id);
CREATE INDEX idx_tlg_score ON pflid.review_timeline_groups(timeline_score DESC);
CREATE INDEX idx_tlg_span ON pflid.review_timeline_groups(total_days_span DESC) WHERE review_count >= 3;

-- 2. REVIEW TIMELINE EVENTS
CREATE TABLE pflid.review_timeline_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_group_id   uuid NOT NULL REFERENCES pflid.review_timeline_groups(id) ON DELETE CASCADE,
  review_id           uuid REFERENCES pflid.reviews(id) ON DELETE SET NULL,
  source_review_id    uuid REFERENCES public.product_reviews(id) ON DELETE SET NULL,
  event_day           integer NOT NULL CHECK (event_day >= 0),
  event_type          text NOT NULL DEFAULT 'status_update',
  status              text,
  symptom             text,
  symptom_severity    numeric(3,2) CHECK (symptom_severity >= 0 AND symptom_severity <= 1),
  sentiment           text,
  sentiment_score     numeric(3,2),
  confidence          numeric(3,2) DEFAULT 1.0,
  extracted_text      text,
  extraction_model    text,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tle_group ON pflid.review_timeline_events(timeline_group_id, event_day);
CREATE INDEX idx_tle_symptom ON pflid.review_timeline_events(symptom) WHERE symptom IS NOT NULL;

-- 3. REVIEW FINGERPRINTS
CREATE TABLE pflid.review_fingerprints (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  pflid_review_id     uuid REFERENCES pflid.reviews(id) ON DELETE SET NULL,
  author_id           text NOT NULL,
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content_hash        text NOT NULL,
  simhash             text,
  duplicate_score     numeric(5,4) DEFAULT 0,
  is_duplicate        boolean DEFAULT false,
  duplicate_of        uuid REFERENCES public.product_reviews(id) ON DELETE SET NULL,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id)
);

CREATE INDEX idx_fp_author_product ON pflid.review_fingerprints(author_id, product_id);
CREATE INDEX idx_fp_content_hash ON pflid.review_fingerprints(content_hash);

-- 4. JUNCTION TABLE
CREATE TABLE pflid.review_to_timeline (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_group_id   uuid NOT NULL REFERENCES pflid.review_timeline_groups(id) ON DELETE CASCADE,
  pflid_review_id     uuid REFERENCES pflid.reviews(id) ON DELETE SET NULL,
  source_review_id    uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  review_date         timestamptz NOT NULL,
  review_order        integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timeline_group_id, source_review_id)
);

CREATE INDEX idx_r2t_group ON pflid.review_to_timeline(timeline_group_id, review_order);
CREATE INDEX idx_r2t_review ON pflid.review_to_timeline(source_review_id);

-- 5. FUNCTIONS

-- 5.1 SimHash for CJK+ASCII mixed text (bigram-based)
CREATE OR REPLACE FUNCTION pflid.compute_simhash(p_text text)
RETURNS text AS $$
DECLARE
  v_normalized text;
  v_hash bigint := 0;
  v_tokens text[];
  v_tok text;
  v_bit_vec integer[] := ARRAY[
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
  ];
  v_tok_hash bigint;
  v_bit integer;
  v_i integer;
BEGIN
  v_normalized := regexp_replace(lower(trim(p_text)), '\s+', '', 'g');
  IF length(v_normalized) < 4 THEN RETURN '0'; END IF;
  v_tokens := ARRAY(
    SELECT substring(v_normalized, gs.val, 2)
    FROM generate_series(1, greatest(1, length(v_normalized) - 1)) AS gs(val)
  );
  FOR v_i IN 1..array_length(v_tokens, 1) LOOP
    v_tok := v_tokens[v_i];
    v_tok_hash := hashtext(v_tok)::bigint + (hashtext('s_' || v_tok)::bigint << 32);
    FOR v_bit IN 0..63 LOOP
      IF (v_tok_hash >> v_bit) & 1 = 1 THEN
        v_bit_vec[v_bit + 1] := v_bit_vec[v_bit + 1] + 1;
      ELSE
        v_bit_vec[v_bit + 1] := v_bit_vec[v_bit + 1] - 1;
      END IF;
    END LOOP;
  END LOOP;
  FOR v_bit IN 0..63 LOOP
    IF v_bit_vec[v_bit + 1] > 0 THEN
      v_hash := v_hash | (1::bigint << v_bit);
    END IF;
  END LOOP;
  RETURN lpad(to_hex(v_hash), 16, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 5.2 Hamming distance between two SimHash hex strings
CREATE OR REPLACE FUNCTION pflid.hamming_distance(hash1 text, hash2 text)
RETURNS integer AS $$
DECLARE
  v_b1 bigint;
  v_b2 bigint;
  v_xor bigint;
  v_dist integer := 0;
BEGIN
  IF hash1 IS NULL OR hash2 IS NULL OR hash1 = '0' OR hash2 = '0' THEN
    RETURN 999;
  END IF;
  BEGIN
    v_b1 := ('x' || hash1)::bit(64)::bigint;
    v_b2 := ('x' || hash2)::bit(64)::bigint;
  EXCEPTION WHEN OTHERS THEN
    RETURN 999;
  END;
  v_xor := v_b1 # v_b2;
  WHILE v_xor != 0 LOOP
    v_dist := v_dist + 1;
    v_xor := v_xor & (v_xor - 1);
  END LOOP;
  RETURN v_dist;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.3 Build/update review fingerprint for duplicate detection
CREATE OR REPLACE FUNCTION pflid.build_review_fingerprint(
  p_review_id uuid,
  p_author_id text,
  p_product_id uuid,
  p_review_text text
)
RETURNS uuid AS $$
DECLARE
  v_content_hash text;
  v_simhash text;
  v_existing RECORD;
  v_dup_score numeric(5,4);
  v_is_dup boolean := false;
  v_dup_of uuid;
  v_fp_id uuid;
BEGIN
  v_content_hash := encode(
    digest(lower(trim(regexp_replace(p_review_text, '\s+', ' ', 'g'))), 'sha256'),
    'hex'
  );

  v_simhash := pflid.compute_simhash(p_review_text);

  -- Check exact content match
  SELECT fp.review_id INTO v_existing
  FROM pflid.review_fingerprints fp
  WHERE fp.content_hash = v_content_hash
    AND fp.review_id != p_review_id
  LIMIT 1;

  IF FOUND THEN
    v_is_dup := true;
    v_dup_of := v_existing.review_id;
    v_dup_score := 1.0;
  ELSE
    -- Check near-duplicate via SimHash (hamming distance <= 4)
    SELECT fp.review_id INTO v_existing
    FROM pflid.review_fingerprints fp
    WHERE fp.author_id = p_author_id
      AND fp.product_id = p_product_id
      AND fp.simhash IS NOT NULL
      AND pflid.hamming_distance(fp.simhash, v_simhash) <= 4
    ORDER BY fp.created_at
    LIMIT 1;

    IF FOUND THEN
      v_dup_score := 0.7 + (4.0 - pflid.hamming_distance(
        (SELECT simhash FROM pflid.review_fingerprints WHERE review_id = v_existing.review_id),
        v_simhash
      )) * 0.075;
      IF v_dup_score > 0.85 THEN
        v_is_dup := true;
        v_dup_of := v_existing.review_id;
      END IF;
    ELSE
      v_dup_score := 0.0;
    END IF;
  END IF;

  INSERT INTO pflid.review_fingerprints (
    review_id, author_id, product_id, content_hash, simhash,
    duplicate_score, is_duplicate, duplicate_of
  ) VALUES (
    p_review_id, p_author_id, p_product_id, v_content_hash, v_simhash,
    v_dup_score, v_is_dup, v_dup_of
  )
  ON CONFLICT (review_id) DO UPDATE SET
    content_hash = EXCLUDED.content_hash,
    simhash = EXCLUDED.simhash,
    duplicate_score = EXCLUDED.duplicate_score,
    is_duplicate = EXCLUDED.is_duplicate,
    duplicate_of = EXCLUDED.duplicate_of
  RETURNING id INTO v_fp_id;

  RETURN v_fp_id;
END;
$$ LANGUAGE plpgsql;


-- 5.4 CORE: Build or append to a timeline group
-- Rule 1: Same author + same product => same timeline
-- Rule 2: Gap > 365 days => new timeline
-- Rule 3: Repurchase keywords => new timeline
CREATE OR REPLACE FUNCTION pflid.build_timeline_group(
  p_review_id uuid,
  p_author_id text,
  p_product_id uuid,
  p_review_date timestamptz,
  p_review_text text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_group RECORD;
  v_new_group_id uuid;
  v_action text;
  v_review_order integer;
  v_gap_days integer;
  v_repurchase_keywords text[] := ARRAY[
    '重新购买','回购','第二次购买','再次购买','又买了','又买了一包',
    '复购','第二包','第二袋','换了一包','新的一包','再买','再购入'
  ];
  v_contains_repurchase boolean := false;
BEGIN
  -- Rule 3: Check for repurchase keywords
  IF p_review_text IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM unnest(v_repurchase_keywords) kw
      WHERE p_review_text ILIKE '%' || kw || '%'
    ) INTO v_contains_repurchase;
  END IF;

  -- Find existing active group for same author + product
  SELECT tg.id, tg.last_review_date, tg.review_count
  INTO v_group
  FROM pflid.review_timeline_groups tg
  WHERE tg.author_id = p_author_id
    AND tg.product_id = p_product_id
    AND tg.is_active = true
  ORDER BY tg.last_review_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_action := 'create';
  ELSIF v_contains_repurchase THEN
    v_action := 'create';
  ELSE
    v_gap_days := EXTRACT(DAY FROM (p_review_date - v_group.last_review_date))::integer;
    IF v_gap_days > 365 THEN
      v_action := 'create';
    ELSE
      v_action := 'append';
    END IF;
  END IF;

  IF v_action = 'create' THEN
    INSERT INTO pflid.review_timeline_groups (
      author_id, product_id, first_review_date, last_review_date, review_count
    ) VALUES (
      p_author_id, p_product_id, p_review_date, p_review_date, 1
    )
    RETURNING id INTO v_new_group_id;
    v_review_order := 1;
  ELSE
    v_new_group_id := v_group.id;
    v_review_order := v_group.review_count + 1;
    UPDATE pflid.review_timeline_groups
    SET last_review_date = p_review_date,
        review_count = review_count + 1,
        updated_at = now()
    WHERE id = v_group.id;
  END IF;

  -- Link review to timeline
  INSERT INTO pflid.review_to_timeline (
    timeline_group_id, source_review_id, review_date, review_order
  ) VALUES (
    v_new_group_id, p_review_id, p_review_date, v_review_order
  )
  ON CONFLICT (timeline_group_id, source_review_id) DO NOTHING;

  RETURN jsonb_build_object(
    'timeline_group_id', v_new_group_id,
    'action', v_action,
    'review_order', v_review_order
  );
END;
$$ LANGUAGE plpgsql;


-- 5.5 LONGITUDINAL TRUST ENGINE
-- Scores 0-100; higher = more trustworthy timeline
CREATE OR REPLACE FUNCTION pflid.calculate_timeline_trust_score(
  p_timeline_group_id uuid
)
RETURNS numeric(4,1) AS $$
DECLARE
  v_score numeric(4,1) := 50.0;
  v_total_days integer;
  v_review_count integer;
  v_event_count integer;
  v_has_photos boolean;
  v_has_repurchase boolean;
  v_has_opinion_change boolean;
  v_same_day_count integer;
  v_dup_reviews integer;
  v_details jsonb;
BEGIN
  SELECT tg.total_days_span, tg.review_count, tg.has_photos, tg.has_repurchase
  INTO v_total_days, v_review_count, v_has_photos, v_has_repurchase
  FROM pflid.review_timeline_groups tg
  WHERE tg.id = p_timeline_group_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_event_count
  FROM pflid.review_timeline_events
  WHERE timeline_group_id = p_timeline_group_id;

  -- Opinion change: detect sentiment flips across events
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT sentiment,
        LAG(sentiment) OVER (ORDER BY event_day) AS prev_sentiment
      FROM pflid.review_timeline_events
      WHERE timeline_group_id = p_timeline_group_id
        AND sentiment IS NOT NULL
    ) sub
    WHERE sentiment != prev_sentiment AND prev_sentiment IS NOT NULL
  ) INTO v_has_opinion_change;

  -- Same-day rapid posting detection
  SELECT COUNT(*) INTO v_same_day_count
  FROM (
    SELECT review_date::date AS rday,
      LAG(review_date::date) OVER (ORDER BY review_date) AS prev_day
    FROM pflid.review_to_timeline
    WHERE timeline_group_id = p_timeline_group_id
  ) sub
  WHERE rday = prev_day;

  -- Duplicate content count
  SELECT COUNT(*) INTO v_dup_reviews
  FROM pflid.review_to_timeline r2t
  JOIN pflid.review_fingerprints fp ON fp.review_id = r2t.source_review_id
  WHERE r2t.timeline_group_id = p_timeline_group_id AND fp.is_duplicate = true;

  -- === FACTOR SCORING ===

  -- LONG FOLLOW-UP (weight: high, up to +25)
  IF v_total_days >= 30 THEN v_score := v_score + 5; END IF;
  IF v_total_days >= 60 THEN v_score := v_score + 5; END IF;
  IF v_total_days >= 90 THEN v_score := v_score + 10; END IF;
  IF v_total_days >= 180 THEN v_score := v_score + 5; END IF;

  -- CONTINUOUS TRACKING > 90 DAYS with >= 3 checkpoints (weight: high, +30)
  IF v_total_days >= 90 AND v_review_count >= 3 THEN
    v_score := v_score + 30;
  ELSIF v_total_days >= 60 AND v_review_count >= 2 THEN
    v_score := v_score + 15;
  END IF;

  -- HAS PHOTOS (weight: medium, +15)
  IF v_has_photos THEN v_score := v_score + 15; END IF;

  -- REPURCHASE (weight: high, +20)
  IF v_has_repurchase THEN v_score := v_score + 20; END IF;

  -- OPINION CHANGE / CANDOR (weight: high, +25)
  IF v_has_opinion_change THEN v_score := v_score + 25; END IF;

  -- RISK: Same-day posts (penalty up to -30)
  IF v_same_day_count > 0 THEN
    v_score := v_score - LEAST(30, v_same_day_count * 15);
  END IF;

  -- RISK: Duplicate content (penalty up to -40)
  IF v_dup_reviews > 0 THEN
    v_score := v_score - LEAST(40, v_dup_reviews * 20);
  END IF;

  v_score := GREATEST(0, LEAST(100, v_score));

  -- Persist
  v_details := jsonb_build_object(
    'total_days_span', v_total_days,
    'review_count', v_review_count,
    'has_photos', v_has_photos,
    'has_repurchase', v_has_repurchase,
    'has_opinion_change', v_has_opinion_change,
    'same_day_posts', v_same_day_count,
    'duplicate_reviews', v_dup_reviews,
    'scored_at', now()
  );

  UPDATE pflid.review_timeline_groups
  SET timeline_score = v_score,
      trust_factors = v_details,
      has_opinion_change = v_has_opinion_change,
      updated_at = now()
  WHERE id = p_timeline_group_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;


-- 5.6 PRODUCT TIMELINE STATS: Aggregate all timelines for a product
CREATE OR REPLACE FUNCTION pflid.get_product_timeline_stats(p_product_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_total_timelines integer;
  v_day30_positive numeric(5,1);
  v_day90_soft_stool numeric(5,1);
  v_day180_repurchase numeric(5,1);
  v_day365_retention numeric(5,1);
  v_avg_trust_score numeric(4,1);
BEGIN
  SELECT COUNT(*) INTO v_total_timelines
  FROM pflid.review_timeline_groups
  WHERE product_id = p_product_id AND review_count >= 1;

  SELECT ROUND(
    COUNT(*) FILTER (WHERE status = 'positive')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) INTO v_day30_positive
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.event_day BETWEEN 25 AND 35;

  SELECT ROUND(
    COUNT(*) FILTER (WHERE symptom = 'soft_stool')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) INTO v_day90_soft_stool
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.event_day BETWEEN 80 AND 100;

  SELECT ROUND(
    COUNT(*) FILTER (WHERE event_type = 'repurchase')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) INTO v_day180_repurchase
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.event_day BETWEEN 170 AND 190;

  SELECT ROUND(
    COUNT(*) FILTER (WHERE event_type NOT IN ('food_stop','food_switch'))::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) INTO v_day365_retention
  FROM pflid.review_timeline_events e
  JOIN pflid.review_timeline_groups g ON e.timeline_group_id = g.id
  WHERE g.product_id = p_product_id
    AND e.event_day BETWEEN 355 AND 375;

  SELECT ROUND(AVG(timeline_score)::numeric, 1) INTO v_avg_trust_score
  FROM pflid.review_timeline_groups
  WHERE product_id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'timeline_count', v_total_timelines,
    'day_30_positive_rate', COALESCE(v_day30_positive, 0),
    'day_90_soft_stool_rate', COALESCE(v_day90_soft_stool, 0),
    'day_180_repurchase_rate', COALESCE(v_day180_repurchase, 0),
    'day_365_retention_rate', COALESCE(v_day365_retention, 0),
    'avg_timeline_trust_score', v_avg_trust_score,
    'generated_at', now()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.7 Upsert timeline events from AI extraction output
CREATE OR REPLACE FUNCTION pflid.upsert_timeline_events(
  p_timeline_group_id uuid,
  p_review_id uuid,
  p_source_review_id uuid,
  p_events jsonb
)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_ev jsonb;
BEGIN
  FOR v_ev IN SELECT * FROM jsonb_array_elements(p_events)
  LOOP
    INSERT INTO pflid.review_timeline_events (
      timeline_group_id, review_id, source_review_id,
      event_day, event_type, status, symptom, symptom_severity,
      sentiment, sentiment_score, confidence,
      extracted_text, extraction_model, metadata
    ) VALUES (
      p_timeline_group_id,
      p_review_id,
      p_source_review_id,
      COALESCE((v_ev->>'day')::integer, 0),
      COALESCE(v_ev->>'event_type', 'status_update'),
      v_ev->>'status',
      v_ev->>'symptom',
      (v_ev->>'severity')::numeric,
      v_ev->>'sentiment',
      (v_ev->>'sentiment_score')::numeric,
      COALESCE((v_ev->>'confidence')::numeric, 1.0),
      v_ev->>'extracted_text',
      v_ev->>'model',
      COALESCE(v_ev->'metadata', '{}'::jsonb)
    )
    ON CONFLICT DO NOTHING;

    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 5.8 Backfill timeline groups from existing reviews
CREATE OR REPLACE FUNCTION pflid.backfill_timeline_groups(
  p_product_id uuid DEFAULT NULL,
  p_author_id text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_review RECORD;
  v_result jsonb;
  v_count integer := 0;
  v_group_ids uuid[] := ARRAY[]::uuid[];
  v_group_id uuid;
BEGIN
  FOR v_review IN
    SELECT
      pr.id AS review_id,
      pr.profile_id::text AS author_id,
      pr.product_id,
      pr.created_at AS review_date,
      pr.review_text
    FROM public.product_reviews pr
    WHERE (p_product_id IS NULL OR pr.product_id = p_product_id)
      AND (p_author_id IS NULL OR pr.profile_id::text = p_author_id)
      AND NOT EXISTS (
        SELECT 1 FROM pflid.review_to_timeline r2t
        WHERE r2t.source_review_id = pr.id
      )
    ORDER BY pr.product_id, pr.profile_id, pr.created_at
  LOOP
    v_result := pflid.build_timeline_group(
      v_review.review_id,
      v_review.author_id,
      v_review.product_id,
      v_review.review_date,
      v_review.review_text
    );
    v_count := v_count + 1;
    
    -- Collect group IDs for trust score calculation
    v_group_id := (v_result->>'timeline_group_id')::uuid;
    IF NOT v_group_id = ANY(v_group_ids) THEN
      v_group_ids := array_append(v_group_ids, v_group_id);
    END IF;
  END LOOP;
  
  -- Calculate trust scores for all affected groups
  FOREACH v_group_id IN ARRAY v_group_ids
  LOOP
    PERFORM pflid.calculate_timeline_trust_score(v_group_id);
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- 6. TRIGGERS

-- 6.1 Auto-update updated_at
CREATE OR REPLACE FUNCTION pflid.tlg_update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tlg_updated_at BEFORE UPDATE ON pflid.review_timeline_groups
  FOR EACH ROW EXECUTE FUNCTION pflid.tlg_update_updated_at();

-- 6.2 Recalculate trust when events change
CREATE OR REPLACE FUNCTION pflid.auto_recalc_trust()
RETURNS trigger AS $$
BEGIN
  PERFORM pflid.calculate_timeline_trust_score(
    COALESCE(NEW.timeline_group_id, OLD.timeline_group_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tle_after_insert AFTER INSERT ON pflid.review_timeline_events
  FOR EACH ROW EXECUTE FUNCTION pflid.auto_recalc_trust();

CREATE TRIGGER tle_after_update AFTER UPDATE ON pflid.review_timeline_events
  FOR EACH ROW EXECUTE FUNCTION pflid.auto_recalc_trust();

-- 7. ROW LEVEL SECURITY

ALTER TABLE pflid.review_timeline_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.review_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.review_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflid.review_to_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tlg_read_public" ON pflid.review_timeline_groups
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "tle_read_public" ON pflid.review_timeline_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "fp_read_public" ON pflid.review_fingerprints
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "r2t_read_public" ON pflid.review_to_timeline
  FOR SELECT TO anon, authenticated USING (true);

-- 8. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pflid TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA pflid TO service_role;
