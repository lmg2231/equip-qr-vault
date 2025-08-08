-- Harden trigger function by setting fixed search_path
CREATE OR REPLACE FUNCTION public.prevent_defunct_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'defunct'::public.status_enum AND NEW.status <> 'defunct'::public.status_enum THEN
      RAISE EXCEPTION 'Cannot change status from DEFUNCT to another status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;