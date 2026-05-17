ALTER TABLE public.quotations
  ALTER COLUMN organization_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_address text;

ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_customer_or_org_chk;

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_customer_or_org_chk
  CHECK (organization_id IS NOT NULL OR customer_name IS NOT NULL);