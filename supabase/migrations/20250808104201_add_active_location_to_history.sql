-- Add active_location column to status history for audit trail
ALTER TABLE public.equipment_status_history
ADD COLUMN IF NOT EXISTS active_location TEXT;

COMMENT ON COLUMN public.equipment_status_history.active_location
IS 'If from_status = active, the location the equipment was active in at the time of change';