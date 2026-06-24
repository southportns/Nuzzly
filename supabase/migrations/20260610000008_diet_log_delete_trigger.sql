-- Migration: Add trigger to delete pet_events when diet_logs is deleted
-- This ensures health timeline stays in sync when diet records are removed

-- Function to delete associated pet_events when a diet_log is deleted
CREATE OR REPLACE FUNCTION public.delete_event_on_diet_log_delete()
RETURNS trigger AS $$
DECLARE
  target_id uuid;
BEGIN
  -- Find the matching pet_event (pick the most recent one)
  SELECT pe.id INTO target_id
  FROM public.pet_events pe
  WHERE pe.pet_id = OLD.pet_id
    AND pe.event_type = 'food_start'
    AND pe.source_type = 'user_input'
    AND pe.review_id IS NULL
    AND (
      (OLD.notes IS NOT NULL AND pe.notes = OLD.notes)
      OR (OLD.notes IS NULL AND pe.notes IS NULL)
    )
    AND pe.product_id IS NOT DISTINCT FROM OLD.product_id
  ORDER BY pe.event_time DESC
  LIMIT 1;

  -- Delete the found event
  IF target_id IS NOT NULL THEN
    DELETE FROM public.pet_events WHERE id = target_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on diet_logs DELETE
DROP TRIGGER IF EXISTS after_diet_log_delete_event ON public.diet_logs;
CREATE TRIGGER after_diet_log_delete_event
  AFTER DELETE ON public.diet_logs
  FOR EACH ROW EXECUTE FUNCTION public.delete_event_on_diet_log_delete();
