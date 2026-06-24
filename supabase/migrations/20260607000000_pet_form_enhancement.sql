-- Pet Form Enhancement
-- 1) Add pet_source enum (origin of pet: purchased / wild-rescued / home-raised / other)
-- 2) Add home_age years/months to pets (age at arrival)
-- 3) Increase weight_kg precision to 2 decimals
-- 4) Create pet_disease_records table (multi-entry, attachment-supported)
-- 5) Create pet_medication_records table (multi-entry, attachment-supported)
-- 6) Create pet_attachments table (polymorphic by owner_type)
-- 7) Create pet-attachments storage bucket (private, per-user folder)

-- =============================================
-- 1. ENUM: pet_source_t
-- =============================================
DO $$ BEGIN
  CREATE TYPE pet_source_t AS ENUM ('purchased', 'wild_rescued', 'home_raised', 'stray_adopted', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================
-- 2. ALTER pets: add pet_source + home_age + relax weight_kg
-- =============================================
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS pet_source pet_source_t DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS home_age_years integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_age_months integer NOT NULL DEFAULT 0,
  ALTER COLUMN weight_kg TYPE numeric(5,2);

-- =============================================
-- 3. pet_disease_records (multi-entry disease history)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pet_disease_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id       uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  name         text NOT NULL,
  diagnosed_on date,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'recovered', 'chronic', 'unknown')),
  severity     text NOT NULL DEFAULT 'unknown' CHECK (severity IN ('mild', 'moderate', 'severe', 'unknown')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pet_disease_records_pet_id_idx ON public.pet_disease_records(pet_id);

-- =============================================
-- 4. pet_medication_records (multi-entry medication log)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pet_medication_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id       uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  name         text NOT NULL,
  dosage       text,
  frequency    text,
  started_on   date,
  ended_on     date,
  is_ongoing   boolean NOT NULL DEFAULT true,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pet_medication_records_pet_id_idx ON public.pet_medication_records(pet_id);

-- =============================================
-- 5. pet_attachments (polymorphic by owner_type)
-- owner_type ∈ { 'pet_avatar', 'pet_disease', 'pet_medication', 'pet_general',
--                'review_voucher', 'purchase_proof', 'medical_record' }
-- =============================================
CREATE TABLE IF NOT EXISTS public.pet_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id       uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_type   text NOT NULL CHECK (owner_type IN (
                 'pet_avatar', 'pet_disease', 'pet_medication',
                 'purchase_proof', 'medical_record', 'pet_general'
               )),
  owner_id     uuid,
  category     text NOT NULL DEFAULT 'other',
  file_name    text NOT NULL,
  file_path    text NOT NULL,
  file_url     text NOT NULL,
  file_type    text,
  file_size    integer,
  uploaded_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pet_attachments_pet_id_idx ON public.pet_attachments(pet_id);
CREATE INDEX IF NOT EXISTS pet_attachments_owner_idx ON public.pet_attachments(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS pet_attachments_uploader_idx ON public.pet_attachments(uploaded_by);

-- =============================================
-- 6. RLS for new tables
-- =============================================
ALTER TABLE public.pet_disease_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_medication_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_attachments ENABLE ROW LEVEL SECURITY;

-- disease / medication: owner can manage via pet_id → profile_id
CREATE POLICY "pet_disease_owner_all" ON public.pet_disease_records
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.profile_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.profile_id = auth.uid())
  );

CREATE POLICY "pet_medication_owner_all" ON public.pet_medication_records
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.profile_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.profile_id = auth.uid())
  );

-- attachments: uploader can manage their own
CREATE POLICY "pet_attachments_owner_all" ON public.pet_attachments
  FOR ALL TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- =============================================
-- 7. Storage bucket: pet-attachments (private, per-pet folder)
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-attachments',
  'pet-attachments',
  false,
  20971520, -- 20 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Folder convention: pet-attachments/{pet_id}/{timestamp}-{rand}.{ext}
CREATE POLICY "pet_attachments_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pet-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pet_attachments_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pet-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pet_attachments_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pet-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- 8. updated_at trigger for new tables
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pet_disease_records_updated_at ON public.pet_disease_records;
CREATE TRIGGER trg_pet_disease_records_updated_at
  BEFORE UPDATE ON public.pet_disease_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pet_medication_records_updated_at ON public.pet_medication_records;
CREATE TRIGGER trg_pet_medication_records_updated_at
  BEFORE UPDATE ON public.pet_medication_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
