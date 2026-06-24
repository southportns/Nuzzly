-- Migration: Sync health_records (weight) <-> pet_events
-- Pattern mirrors diet_logs sync (20260610000008_diet_log_delete_trigger.sql
-- and 20260602000000_pet_rwd_architecture.sql::create_event_from_diet_log).
--
-- 1. AFTER INSERT on health_records (record_type='weight')
--    -> create a matching weight_change event in pet_events
-- 2. AFTER DELETE on health_records (record_type='weight')
--    -> remove the matching weight_change event from pet_events
--
-- The link between the two rows is kept in pet_events.metadata:
--   { "source": "health_record", "source_id": "<health_record.id>", "weight_kg": <kg> }

-- =========================================================
-- 1) INSERT: health_records (weight) -> pet_events.weight_change
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_weight_change_event()
RETURNS trigger AS $$
BEGIN
  -- Only fan out for weight records that actually carry a value
  IF NEW.record_type = 'weight' AND NEW.weight_kg IS NOT NULL THEN
    INSERT INTO public.pet_events (
      pet_id,
      profile_id,
      event_type,
      event_time,
      source_type,
      metadata,
      notes
    ) VALUES (
      NEW.pet_id,
      NEW.profile_id,
      'weight_change',
      NEW.record_time,
      'user_input',
      jsonb_build_object(
        'source', 'health_record',
        'source_id', NEW.id,
        'weight_kg', NEW.weight_kg
      ),
      '体重记录：' || NEW.weight_kg::text || ' kg'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_health_record_weight_event ON public.health_records;
CREATE TRIGGER after_health_record_weight_event
  AFTER INSERT ON public.health_records
  FOR EACH ROW EXECUTE FUNCTION public.create_weight_change_event();

-- =========================================================
-- 2) DELETE: health_records (weight) -> remove matching pet_events.weight_change
-- =========================================================
CREATE OR REPLACE FUNCTION public.delete_weight_change_event()
RETURNS trigger AS $$
DECLARE
  target_id uuid;
BEGIN
  -- Only act on weight records
  IF OLD.record_type = 'weight' THEN
    -- Locate the single event created for this health_record (by source_id in metadata)
    SELECT pe.id INTO target_id
    FROM public.pet_events pe
    WHERE pe.pet_id = OLD.pet_id
      AND pe.event_type = 'weight_change'
      AND pe.source_type = 'user_input'
      AND pe.metadata->>'source' = 'health_record'
      AND pe.metadata->>'source_id' = OLD.id::text
    LIMIT 1;

    IF target_id IS NOT NULL THEN
      DELETE FROM public.pet_events WHERE id = target_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_health_record_weight_delete_event ON public.health_records;
CREATE TRIGGER after_health_record_weight_delete_event
  AFTER DELETE ON public.health_records
  FOR EACH ROW EXECUTE FUNCTION public.delete_weight_change_event();
