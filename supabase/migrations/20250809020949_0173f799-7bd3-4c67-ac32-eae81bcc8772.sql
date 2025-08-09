-- Update RLS policies to allow public updates for equipment tables
-- This allows status changes without requiring authentication

-- Motors table
DROP POLICY IF EXISTS "Authenticated users can update motors" ON public.motors;
CREATE POLICY "Allow public updates to motors" 
ON public.motors 
FOR UPDATE 
USING (true);

-- Gearboxes table  
DROP POLICY IF EXISTS "Authenticated users can update gearboxes" ON public.gearboxes;
CREATE POLICY "Allow public updates to gearboxes" 
ON public.gearboxes 
FOR UPDATE 
USING (true);

-- Pumps table
DROP POLICY IF EXISTS "Authenticated users can update pumps" ON public.pumps;
CREATE POLICY "Allow public updates to pumps" 
ON public.pumps 
FOR UPDATE 
USING (true);