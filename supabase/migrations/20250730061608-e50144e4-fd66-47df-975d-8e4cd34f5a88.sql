-- Create motors table
CREATE TABLE public.motors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  hp NUMERIC NOT NULL,
  rpm INTEGER NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gearboxes table
CREATE TABLE public.gearboxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  reduction_ratio TEXT NOT NULL,
  shaft_diameter NUMERIC NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pumps table
CREATE TABLE public.pumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  rpm INTEGER NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.motors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gearboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for QR code scanning)
CREATE POLICY "Allow public read access to motors" 
ON public.motors 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to gearboxes" 
ON public.gearboxes 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to pumps" 
ON public.pumps 
FOR SELECT 
USING (true);

-- Create policies for authenticated users to manage equipment
CREATE POLICY "Authenticated users can insert motors" 
ON public.motors 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update motors" 
ON public.motors 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete motors" 
ON public.motors 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert gearboxes" 
ON public.gearboxes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update gearboxes" 
ON public.gearboxes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete gearboxes" 
ON public.gearboxes 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pumps" 
ON public.pumps 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pumps" 
ON public.pumps 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pumps" 
ON public.pumps 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_motors_updated_at
  BEFORE UPDATE ON public.motors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gearboxes_updated_at
  BEFORE UPDATE ON public.gearboxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pumps_updated_at
  BEFORE UPDATE ON public.pumps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better search performance
CREATE INDEX idx_motors_serial_number ON public.motors(serial_number);
CREATE INDEX idx_motors_location ON public.motors(location);
CREATE INDEX idx_gearboxes_serial_number ON public.gearboxes(serial_number);
CREATE INDEX idx_gearboxes_location ON public.gearboxes(location);
CREATE INDEX idx_pumps_serial_number ON public.pumps(serial_number);
CREATE INDEX idx_pumps_location ON public.pumps(location);