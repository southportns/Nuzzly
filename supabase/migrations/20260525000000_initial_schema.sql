-- =============================================
-- PetTrust — Initial Database Migration
-- =============================================

-- 1. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. ENUMS
-- =============================================
CREATE TYPE stomach_health_t AS ENUM ('normal', 'sensitive', 'very_sensitive');
CREATE TYPE pet_gender_t AS ENUM ('male', 'female', 'unknown');
CREATE TYPE pet_species_t AS ENUM ('cat', 'dog', 'other');
CREATE TYPE usage_duration_t AS ENUM ('just_started', '7d', '14d', '30d', '60d', '90d', '180d+');
CREATE TYPE risk_severity_t AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE risk_event_type_t AS ENUM ('batch_abnormality', 'formula_change', 'dispute_surge', 'recall', 'quality_issue', 'other');
CREATE TYPE risk_trend_t AS ENUM ('rising', 'declining', 'stable');
CREATE TYPE insight_type_t AS ENUM ('product_summary', 'risk_analysis', 'breed_match', 'comparison', 'ingredient_analysis', 'trend_prediction', 'recommendation');
CREATE TYPE behavior_event_t AS ENUM ('review_posted', 'review_edited', 'voucher_uploaded', 'review_deleted', 'rapid_posting', 'duplicate_content', 'suspicious_pattern', 'account_flag');
CREATE TYPE ingredient_type_t AS ENUM ('protein', 'fat', 'carbohydrate', 'fiber', 'vitamin', 'mineral', 'preservative', 'additive', 'flavoring', 'colorant', 'other');

-- 3. TABLES
-- =============================================

-- 3.1 profiles
CREATE TABLE public.profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username           text UNIQUE NOT NULL,
  display_name       text,
  avatar_url         text,
  bio                text,
  trust_score               integer DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  review_count              integer DEFAULT 0,
  verified_purchase_count   integer DEFAULT 0,
  long_term_review_count    integer DEFAULT 0,
  pet_profile_completeness  integer DEFAULT 0 CHECK (pet_profile_completeness >= 0 AND pet_profile_completeness <= 100),
  behavior_score            integer DEFAULT 100 CHECK (behavior_score >= 0 AND behavior_score <= 100),
  is_flagged                boolean DEFAULT false,
  flag_reason               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 3.2 pets
CREATE TABLE public.pets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  species          pet_species_t NOT NULL DEFAULT 'cat',
  breed            text,
  age_years        integer NOT NULL DEFAULT 0,
  age_months       integer NOT NULL DEFAULT 0,
  gender           pet_gender_t NOT NULL DEFAULT 'unknown',
  weight_kg        numeric(4,1),
  neutered         boolean DEFAULT false,
  stomach_health   stomach_health_t NOT NULL DEFAULT 'normal',
  disease_history  text,
  medication_log   text,
  photo_url        text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 3.3 pet_allergies
CREATE TABLE public.pet_allergies (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id    uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  allergen  text NOT NULL,
  severity  text NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild', 'moderate', 'severe')),
  confirmed boolean DEFAULT false,
  UNIQUE(pet_id, allergen)
);

-- 3.4 product_categories
CREATE TABLE public.product_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text UNIQUE NOT NULL,
  slug          text UNIQUE NOT NULL,
  icon          text,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.5 products
CREATE TABLE public.products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  brand             text NOT NULL,
  category_id       uuid NOT NULL REFERENCES public.product_categories(id),
  origin_country    text,
  manufacturer      text,
  description       text,
  image_url         text,
  applicable_species text NOT NULL DEFAULT 'cats' CHECK (applicable_species IN ('cats', 'dogs', 'both')),
  applicable_age    text NOT NULL DEFAULT 'all' CHECK (applicable_age IN ('kitten', 'adult', 'senior', 'all')),
  price_min         numeric(8,2),
  price_max         numeric(8,2),
  transparency_score       integer DEFAULT 0,
  ingredient_transparency  integer DEFAULT 0,
  factory_transparency     integer DEFAULT 0,
  testing_disclosure       integer DEFAULT 0,
  embedding          vector(1536),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3.6 product_images
CREATE TABLE public.product_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url     text NOT NULL,
  is_primary    boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0
);

-- 3.7 product_ingredients
CREATE TABLE public.product_ingredients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  percentage      numeric(5,2),
  ingredient_type ingredient_type_t DEFAULT 'other',
  allergen_risk   text[] DEFAULT '{}',
  is_novel_protein boolean DEFAULT false,
  is_grain_free   boolean,
  nutrition_tags  text[] DEFAULT '{}',
  notes           text,
  display_order   integer NOT NULL DEFAULT 0,
  UNIQUE(product_id, ingredient_name)
);

-- 3.8 product_versions
CREATE TABLE public.product_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version_name        text NOT NULL,
  formula_changes     text,
  effective_date      date,
  end_date            date,
  ingredients_snapshot jsonb DEFAULT '[]',
  nutrition_snapshot  jsonb DEFAULT '{}',
  is_current          boolean DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 3.9 product_reviews
CREATE TABLE public.product_reviews (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_version_id    uuid REFERENCES public.product_versions(id) ON DELETE SET NULL,
  pet_id                uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_duration        usage_duration_t NOT NULL DEFAULT 'just_started',
  palatability_rating   integer CHECK (palatability_rating >= 1 AND palatability_rating <= 5),
  stool_rating          integer CHECK (stool_rating >= 1 AND stool_rating <= 5),
  coat_rating           integer CHECK (coat_rating >= 1 AND coat_rating <= 5),
  energy_rating         integer CHECK (energy_rating >= 1 AND energy_rating <= 5),
  overall_rating        integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  would_repurchase      boolean,
  review_text           text,
  pros                  text,
  cons                  text,
  verified_purchase     boolean NOT NULL DEFAULT false,
  has_voucher           boolean NOT NULL DEFAULT false,
  review_trust_score    integer DEFAULT 0 CHECK (review_trust_score >= 0 AND review_trust_score <= 100),
  helpful_count         integer DEFAULT 0,
  transition_period_days integer,
  embedding             vector(1536),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, pet_id, profile_id, usage_duration)
);

-- 3.10 review_followups
CREATE TABLE public.review_followups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id           uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  profile_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followup_day        integer NOT NULL CHECK (followup_day IN (7, 14, 30, 60, 90, 180)),
  stool_changes       text CHECK (stool_changes IN ('improved', 'worsened', 'unchanged', 'not_applicable')),
  coat_changes        text CHECK (coat_changes IN ('improved', 'worsened', 'unchanged', 'not_applicable')),
  weight_changes      text CHECK (weight_changes IN ('gained', 'lost', 'unchanged', 'not_applicable')),
  appetite_changes    text CHECK (appetite_changes IN ('improved', 'worsened', 'unchanged', 'not_applicable')),
  energy_changes      text CHECK (energy_changes IN ('improved', 'worsened', 'unchanged', 'not_applicable')),
  new_health_issues   text,
  continued_usage     boolean,
  repurchase_status   text CHECK (repurchase_status IN ('repurchased', 'will_repurchase', 'will_not', 'undecided')),
  overall_satisfaction integer CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
  followup_text       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, followup_day)
);

-- 3.11 risk_events
CREATE TABLE public.risk_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid REFERENCES public.products(id) ON DELETE CASCADE,
  brand         text NOT NULL,
  batch         text,
  title         text NOT NULL,
  description   text NOT NULL,
  severity      risk_severity_t NOT NULL DEFAULT 'low',
  event_type    risk_event_type_t NOT NULL DEFAULT 'other',
  report_count  integer NOT NULL DEFAULT 0,
  trend         risk_trend_t NOT NULL DEFAULT 'stable',
  source_urls   text[] DEFAULT '{}',
  event_date    date NOT NULL DEFAULT CURRENT_DATE,
  resolved      boolean NOT NULL DEFAULT false,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.12 product_metrics_daily
CREATE TABLE public.product_metrics_daily (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date              date NOT NULL,
  average_rating    numeric(3,2),
  review_count      integer DEFAULT 0,
  new_review_count  integer DEFAULT 0,
  stool_issue_rate  numeric(5,2),
  coat_improve_rate numeric(5,2),
  energy_improve_rate numeric(5,2),
  repurchase_rate   numeric(5,2),
  dispute_rate      numeric(5,2),
  risk_score        numeric(5,2),
  report_count      integer DEFAULT 0,
  sensitive_stomach_rating numeric(3,2),
  kitten_suitable_rating   numeric(3,2),
  senior_suitable_rating   numeric(3,2),
  total_reviews_cumulative integer DEFAULT 0,
  data_completeness  text NOT NULL DEFAULT 'partial' CHECK (data_completeness IN ('partial', 'full')),
  UNIQUE(product_id, date)
);

-- 3.13 ai_insights
CREATE TABLE public.ai_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid REFERENCES public.products(id) ON DELETE CASCADE,
  insight_type    insight_type_t NOT NULL,
  title           text,
  summary         text NOT NULL,
  detail          text,
  confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  embedding       vector(1536),
  source_reviews  uuid[] DEFAULT '{}',
  source_metrics  jsonb DEFAULT '{}',
  metadata        jsonb DEFAULT '{}',
  is_published    boolean NOT NULL DEFAULT true,
  version         integer DEFAULT 1,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3.14 user_behavior_log
CREATE TABLE public.user_behavior_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type  behavior_event_t NOT NULL,
  context     jsonb DEFAULT '{}',
  severity    integer DEFAULT 0 CHECK (severity >= 0 AND severity <= 10),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3.15 review_vouchers
CREATE TABLE public.review_vouchers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  file_url   text NOT NULL,
  file_type  text NOT NULL DEFAULT 'image' CHECK (file_type IN ('image', 'video', 'pdf')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.16 diet_logs
CREATE TABLE public.diet_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_name   text NOT NULL,
  food_type   text NOT NULL DEFAULT 'dry_food',
  notes       text,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3.17 product_bookmarks
CREATE TABLE public.product_bookmarks (
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, product_id)
);

-- 4. INDEXES
-- =============================================
CREATE INDEX idx_products_category_active ON public.products(category_id) WHERE is_active = true;
CREATE INDEX idx_products_brand ON public.products(brand);
CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX idx_product_versions_product ON public.product_versions(product_id, effective_date DESC);

CREATE INDEX idx_reviews_product_duration ON public.product_reviews(product_id, usage_duration);
CREATE INDEX idx_reviews_created ON public.product_reviews(created_at DESC);
CREATE INDEX idx_reviews_pet ON public.product_reviews(pet_id);
CREATE INDEX idx_reviews_profile ON public.product_reviews(profile_id);
CREATE INDEX idx_reviews_trust ON public.product_reviews(review_trust_score DESC);

CREATE INDEX idx_followups_review ON public.review_followups(review_id, followup_day);

CREATE INDEX idx_risk_product_severity ON public.risk_events(product_id, severity, event_date DESC);
CREATE INDEX idx_risk_active ON public.risk_events(event_date DESC) WHERE resolved = false;

CREATE INDEX idx_metrics_product_date ON public.product_metrics_daily(product_id, date DESC);
CREATE INDEX idx_metrics_date ON public.product_metrics_daily(date DESC);

CREATE INDEX idx_insights_product ON public.ai_insights(product_id, insight_type, generated_at DESC);
CREATE INDEX idx_insights_embedding ON public.ai_insights USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_behavior_profile ON public.user_behavior_log(profile_id, created_at DESC);
CREATE INDEX idx_diet_pet_date ON public.diet_logs(pet_id, logged_date DESC);

-- 5. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bookmarks ENABLE ROW LEVEL SECURITY;

-- 5.1 Public read access (anon + authenticated)
CREATE POLICY "products_read_public" ON public.products
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "categories_read_public" ON public.product_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ingredients_read_public" ON public.product_ingredients
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "versions_read_public" ON public.product_versions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "images_read_public" ON public.product_images
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "risk_read_public" ON public.risk_events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "metrics_read_public" ON public.product_metrics_daily
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insights_read_public" ON public.ai_insights
  FOR SELECT TO anon, authenticated USING (is_published = true);

-- 5.2 Authenticated read access
CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pets_select_auth" ON public.pets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "allergies_select_auth" ON public.pet_allergies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews_read_auth" ON public.product_reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "followups_read_auth" ON public.review_followups
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vouchers_read_auth" ON public.review_vouchers
  FOR SELECT TO authenticated USING (true);

-- 5.3 Owner-based write access
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "pets_manage_own" ON public.pets
  FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "allergies_manage_own" ON public.pet_allergies
  FOR ALL TO authenticated
  USING (pet_id IN (SELECT id FROM public.pets WHERE profile_id = auth.uid()))
  WITH CHECK (pet_id IN (SELECT id FROM public.pets WHERE profile_id = auth.uid()));

CREATE POLICY "reviews_manage_own" ON public.product_reviews
  FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "followups_manage_own" ON public.review_followups
  FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "vouchers_insert_own" ON public.review_vouchers
  FOR INSERT TO authenticated
  WITH CHECK (review_id IN (SELECT id FROM public.product_reviews WHERE profile_id = auth.uid()));

CREATE POLICY "diet_manage_own" ON public.diet_logs
  FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "bookmarks_manage_own" ON public.product_bookmarks
  FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- 5.4 Behavior log — users can read their own, admins can read all
CREATE POLICY "behavior_read_own" ON public.user_behavior_log
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- 6. TRIGGERS & FUNCTIONS
-- =============================================

-- 6.1 Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6.2 Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER pets_updated_at BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6.3 Create review follow-ups on new review
CREATE OR REPLACE FUNCTION public.create_review_followups()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.review_followups (review_id, profile_id, followup_day)
  VALUES
    (NEW.id, NEW.profile_id, 7),
    (NEW.id, NEW.profile_id, 14),
    (NEW.id, NEW.profile_id, 30),
    (NEW.id, NEW.profile_id, 60),
    (NEW.id, NEW.profile_id, 90),
    (NEW.id, NEW.profile_id, 180);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_review_insert AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.create_review_followups();

-- 6.4 Calculate review trust score
CREATE OR REPLACE FUNCTION public.calculate_review_trust_score(review public.product_reviews)
RETURNS integer AS $$
DECLARE
  score integer := 30;
BEGIN
  IF review.usage_duration = '30d' THEN score := score + 10;
  ELSIF review.usage_duration IN ('60d', '90d') THEN score := score + 20;
  ELSIF review.usage_duration = '180d+' THEN score := score + 30;
  END IF;
  IF review.verified_purchase THEN score := score + 15; END IF;
  IF review.has_voucher THEN score := score + 5; END IF;
  IF review.review_text IS NOT NULL AND length(review.review_text) > 50 THEN score := score + 10; END IF;
  IF review.pros IS NOT NULL THEN score := score + 5; END IF;
  IF review.cons IS NOT NULL THEN score := score + 5; END IF;
  IF review.transition_period_days IS NOT NULL THEN score := score + 5; END IF;
  score := score
    + CASE WHEN review.palatability_rating IS NOT NULL THEN 3 ELSE 0 END
    + CASE WHEN review.stool_rating IS NOT NULL THEN 3 ELSE 0 END
    + CASE WHEN review.coat_rating IS NOT NULL THEN 3 ELSE 0 END
    + CASE WHEN review.energy_rating IS NOT NULL THEN 3 ELSE 0 END
    + CASE WHEN review.would_repurchase IS NOT NULL THEN 3 ELSE 0 END;
  RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql STABLE;

-- 6.5 Auto-compute review trust score before insert/update
CREATE OR REPLACE FUNCTION public.set_review_trust_score()
RETURNS trigger AS $$
BEGIN
  NEW.review_trust_score := public.calculate_review_trust_score(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_review_insert BEFORE INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_trust_score();
CREATE TRIGGER before_review_update BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_trust_score();

-- 6.6 Refresh daily product metrics
CREATE OR REPLACE FUNCTION public.refresh_product_metrics(target_date date DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO public.product_metrics_daily (
    product_id, date, average_rating, review_count, new_review_count,
    stool_issue_rate, repurchase_rate, sensitive_stomach_rating,
    kitten_suitable_rating, senior_suitable_rating,
    total_reviews_cumulative, data_completeness
  )
  SELECT
    p.id,
    target_date,
    AVG(r.overall_rating) FILTER (WHERE r.created_at::date = target_date)::numeric(3,2),
    COUNT(r.id) FILTER (WHERE r.created_at::date = target_date),
    COUNT(r.id) FILTER (WHERE r.created_at::date = target_date),
    CASE
      WHEN COUNT(r.id) FILTER (WHERE r.stool_rating IS NOT NULL AND r.created_at::date = target_date) > 0
      THEN COUNT(*) FILTER (WHERE r.stool_rating <= 2 AND r.created_at::date = target_date)::float
           / COUNT(*) FILTER (WHERE r.stool_rating IS NOT NULL AND r.created_at::date = target_date)
      ELSE 0
    END,
    CASE
      WHEN COUNT(r.id) FILTER (WHERE r.would_repurchase IS NOT NULL AND r.created_at::date = target_date) > 0
      THEN COUNT(*) FILTER (WHERE r.would_repurchase = true AND r.created_at::date = target_date)::float
           / COUNT(*) FILTER (WHERE r.would_repurchase IS NOT NULL AND r.created_at::date = target_date)
      ELSE 0
    END,
    AVG(r.overall_rating) FILTER (WHERE pet.stomach_health = 'sensitive' AND r.created_at::date = target_date)::numeric(3,2),
    AVG(r.overall_rating) FILTER (WHERE p.applicable_age IN ('kitten','all') AND r.created_at::date = target_date)::numeric(3,2),
    AVG(r.overall_rating) FILTER (WHERE p.applicable_age IN ('senior','all') AND r.created_at::date = target_date)::numeric(3,2),
    (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = p.id AND created_at::date <= target_date),
    CASE
      WHEN target_date = CURRENT_DATE - 1 THEN 'full'
      ELSE 'partial'
    END
  FROM public.products p
  LEFT JOIN public.product_reviews r ON r.product_id = p.id
  LEFT JOIN public.pets pet ON r.pet_id = pet.id
  WHERE p.is_active = true
  GROUP BY p.id
  ON CONFLICT (product_id, date) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    review_count = EXCLUDED.review_count,
    new_review_count = EXCLUDED.new_review_count,
    stool_issue_rate = EXCLUDED.stool_issue_rate,
    repurchase_rate = EXCLUDED.repurchase_rate,
    sensitive_stomach_rating = EXCLUDED.sensitive_stomach_rating,
    kitten_suitable_rating = EXCLUDED.kitten_suitable_rating,
    senior_suitable_rating = EXCLUDED.senior_suitable_rating,
    total_reviews_cumulative = EXCLUDED.total_reviews_cumulative,
    data_completeness = EXCLUDED.data_completeness;
END;
$$ LANGUAGE plpgsql;

-- 6.7 Product search function
CREATE OR REPLACE FUNCTION public.search_products(
  search_term text,
  category_filter uuid DEFAULT NULL,
  species_filter text DEFAULT NULL
)
RETURNS SETOF public.products AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM public.products
    WHERE is_active = true
      AND (search_term IS NULL
           OR name % search_term
           OR name ILIKE '%' || search_term || '%'
           OR brand ILIKE '%' || search_term || '%')
      AND (category_filter IS NULL OR category_id = category_filter)
      AND (species_filter IS NULL OR applicable_species = species_filter)
    ORDER BY
      CASE WHEN name % search_term THEN similarity(name, search_term) ELSE 0 END DESC,
      name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6.8 Get product context for AI (RAG)
CREATE OR REPLACE FUNCTION public.get_product_context_for_ai(p_product_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'product', (SELECT row_to_json(p.*) FROM public.products p WHERE p.id = p_product_id),
    'ingredients', (SELECT jsonb_agg(row_to_json(i.*)) FROM public.product_ingredients i WHERE i.product_id = p_product_id),
    'versions', (SELECT jsonb_agg(row_to_json(v.*) ORDER BY v.effective_date DESC) FROM public.product_versions v WHERE v.product_id = p_product_id),
    'recent_reviews', (SELECT jsonb_agg(row_to_json(r.*)) FROM public.product_reviews r WHERE r.product_id = p_product_id ORDER BY r.created_at DESC LIMIT 50),
    'followups_summary', (
      SELECT jsonb_build_object(
        '30d_count', COUNT(*) FILTER (WHERE rf.followup_day = 30),
        '90d_count', COUNT(*) FILTER (WHERE rf.followup_day = 90),
        '180d_count', COUNT(*) FILTER (WHERE rf.followup_day = 180),
        'stool_improve_rate',
          CASE WHEN COUNT(*) FILTER (WHERE rf.stool_changes IS NOT NULL) > 0
          THEN COUNT(*) FILTER (WHERE rf.stool_changes = 'improved')::float
               / COUNT(*) FILTER (WHERE rf.stool_changes IS NOT NULL)
          ELSE 0 END,
        'continued_usage_rate',
          CASE WHEN COUNT(*) > 0
          THEN COUNT(*) FILTER (WHERE rf.continued_usage = true)::float / COUNT(*)
          ELSE 0 END
      )
      FROM public.review_followups rf
      JOIN public.product_reviews r ON rf.review_id = r.id
      WHERE r.product_id = p_product_id
    ),
    'metrics_90d', (SELECT jsonb_agg(row_to_json(m.*) ORDER BY m.date DESC) FROM public.product_metrics_daily m WHERE m.product_id = p_product_id AND m.date >= CURRENT_DATE - 90),
    'risk_events', (SELECT jsonb_agg(row_to_json(re.*) ORDER BY re.event_date DESC) FROM public.risk_events re WHERE re.product_id = p_product_id AND re.resolved = false)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
