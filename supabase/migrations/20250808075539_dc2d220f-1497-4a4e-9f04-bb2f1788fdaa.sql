-- Create status enum
DO $$ BEGIN
  CREATE TYPE public.status_enum AS ENUM ('active', 'in_storage', 'for_repair', 'defunct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add status column to equipment tables
ALTER TABLE public.motors ADD COLUMN IF NOT EXISTS status public.status_enum NOT NULL DEFAULT 'active';
ALTER TABLE public.gearboxes ADD COLUMN IF NOT EXISTS status public.status_enum NOT NULL DEFAULT 'active';
ALTER TABLE public.pumps ADD COLUMN IF NOT EXISTS status public.status_enum NOT NULL DEFAULT 'active';

-- Create status history table
CREATE TABLE IF NOT EXISTS public.equipment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('motors','gearboxes','pumps')),
  equipment_id UUID NOT NULL,
  from_status public.status_enum NOT NULL,
  to_status public.status_enum NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_status_history_lookup 
  ON public.equipment_status_history (equipment_type, equipment_id, created_at DESC);

-- Enable RLS and policies similar to existing tables
ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can read status history" ON public.equipment_status_history
  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all to insert status history" ON public.equipment_status_history
  FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Prevent changing status once equipment is defunct
CREATE OR REPLACE FUNCTION public.prevent_defunct_status_change()
RETURNS trigger
LANGUAGE plpgsql
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

-- Attach triggers to equipment tables
DROP TRIGGER IF EXISTS trg_prevent_defunct_status_change_motors ON public.motors;
CREATE TRIGGER trg_prevent_defunct_status_change_motors
BEFORE UPDATE OF status ON public.motors
FOR EACH ROW EXECUTE FUNCTION public.prevent_defunct_status_change();

DROP TRIGGER IF EXISTS trg_prevent_defunct_status_change_gearboxes ON public.gearboxes;
CREATE TRIGGER trg_prevent_defunct_status_change_gearboxes
BEFORE UPDATE OF status ON public.gearboxes
FOR EACH ROW EXECUTE FUNCTION public.prevent_defunct_status_change();

DROP TRIGGER IF EXISTS trg_prevent_defunct_status_change_pumps ON public.pumps;
CREATE TRIGGER trg_prevent_defunct_status_change_pumps
BEFORE UPDATE OF status ON public.pumps
FOR EACH ROW EXECUTE FUNCTION public.prevent_defunct_status_change();