-- Add QR code columns to store generated QR codes
ALTER TABLE public.motors ADD COLUMN qr_code TEXT;
ALTER TABLE public.gearboxes ADD COLUMN qr_code TEXT;
ALTER TABLE public.pumps ADD COLUMN qr_code TEXT;