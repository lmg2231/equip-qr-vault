BEGIN;

-- Membership is administered in the Supabase dashboard/SQL editor, never by clients.
CREATE TABLE public.equipment_editors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_editors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipment_editors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.equipment_editors TO authenticated;
CREATE POLICY "Editors can read their own membership" ON public.equipment_editors
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.can_edit_equipment()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.equipment_editors WHERE user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.can_edit_equipment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_equipment() TO authenticated;

-- Replace every write policy, including an unexpected permissive ALL policy.
-- Keep the existing public SELECT policies: scanning QR codes is intentionally public.
DO $$
DECLARE entry record;
BEGIN
  FOR entry IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('motors', 'gearboxes', 'pumps', 'equipment_status_history')
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', entry.policyname, entry.tablename);
  END LOOP;
END;
$$;

REVOKE ALL ON public.motors, public.gearboxes, public.pumps,
  public.equipment_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.motors, public.gearboxes, public.pumps,
  public.equipment_status_history TO anon, authenticated;
GRANT INSERT, DELETE ON public.motors, public.gearboxes, public.pumps TO authenticated;
-- Status/location changes must use the transaction below; QR caches may still be updated.
GRANT UPDATE (qr_code) ON public.motors, public.gearboxes, public.pumps TO authenticated;

DO $$
DECLARE equipment_table text;
BEGIN
  FOREACH equipment_table IN ARRAY ARRAY['motors', 'gearboxes', 'pumps'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', equipment_table);
    EXECUTE format('CREATE POLICY "Approved editors can insert" ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.can_edit_equipment()))', equipment_table);
    EXECUTE format('CREATE POLICY "Approved editors can update" ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.can_edit_equipment())) WITH CHECK ((SELECT public.can_edit_equipment()))', equipment_table);
    EXECUTE format('CREATE POLICY "Approved editors can delete" ON public.%I FOR DELETE TO authenticated USING ((SELECT public.can_edit_equipment()))', equipment_table);
  END LOOP;
END;
$$;
ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.change_equipment_status(
  p_equipment_type text,
  p_equipment_id uuid,
  p_status public.status_enum,
  p_reason text DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  previous_status public.status_enum;
  previous_location text;
  next_location text;
  updated_equipment jsonb;
BEGIN
  IF NOT public.can_edit_equipment() THEN
    RAISE EXCEPTION 'Approved equipment editor access is required' USING ERRCODE = '42501';
  END IF;
  IF p_equipment_type IS NULL OR p_equipment_type NOT IN ('motors', 'gearboxes', 'pumps') THEN
    RAISE EXCEPTION 'Invalid equipment type' USING ERRCODE = '22023';
  END IF;
  IF p_status IS NULL THEN
    RAISE EXCEPTION 'Status is required' USING ERRCODE = '22023';
  END IF;
  p_reason := nullif(btrim(p_reason), '');
  p_location := nullif(btrim(p_location), '');
  IF length(p_reason) > 2000 OR length(p_location) > 200 THEN
    RAISE EXCEPTION 'Reason or location is too long' USING ERRCODE = '22023';
  END IF;

  EXECUTE format('SELECT status, location FROM public.%I WHERE id = $1 FOR UPDATE', p_equipment_type)
    INTO previous_status, previous_location USING p_equipment_id;
  IF previous_status IS NULL THEN
    RAISE EXCEPTION 'Equipment not found' USING ERRCODE = 'P0002';
  END IF;
  IF previous_status = 'defunct' AND p_status <> 'defunct' THEN
    RAISE EXCEPTION 'Defunct equipment status cannot be changed' USING ERRCODE = '22023';
  END IF;
  IF previous_status = p_status THEN
    RAISE EXCEPTION 'Choose a different status' USING ERRCODE = '22023';
  END IF;
  IF (p_status = 'defunct' OR (previous_status = 'active' AND p_status = 'for_repair'))
      AND p_reason IS NULL THEN
    RAISE EXCEPTION 'A reason is required' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'active' AND p_location IS NULL THEN
    RAISE EXCEPTION 'A location is required' USING ERRCODE = '22023';
  END IF;

  next_location := CASE p_status
    WHEN 'active' THEN p_location
    WHEN 'in_storage' THEN 'Storage'
    WHEN 'for_repair' THEN 'For Repair'
    WHEN 'defunct' THEN 'Defunct'
  END;
  EXECUTE format('UPDATE public.%I SET status = $1, location = $2 WHERE id = $3 RETURNING to_jsonb(%I.*)', p_equipment_type, p_equipment_type)
    INTO updated_equipment USING p_status, next_location, p_equipment_id;
  INSERT INTO public.equipment_status_history
    (equipment_type, equipment_id, from_status, to_status, reason, active_location)
  VALUES (p_equipment_type, p_equipment_id, previous_status, p_status, p_reason,
    CASE WHEN previous_status = 'active' THEN previous_location ELSE NULL END);
  RETURN updated_equipment;
END;
$$;
REVOKE ALL ON FUNCTION public.change_equipment_status(text, uuid, public.status_enum, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_equipment_status(text, uuid, public.status_enum, text, text) TO authenticated;

COMMIT;
