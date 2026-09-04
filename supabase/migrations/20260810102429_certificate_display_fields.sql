ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_business_name text,
  ADD COLUMN IF NOT EXISTS certificate_location text;
