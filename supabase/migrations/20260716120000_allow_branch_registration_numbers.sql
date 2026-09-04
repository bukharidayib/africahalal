-- A registered company can have multiple independently certified branches.
-- Each certification unit has its own organizations row, while branches inherit
-- the legal registration/PACRA number from their parent business.
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS "Organizations_registration_number_key";

-- Preserve efficient registration-number searches without enforcing uniqueness.
CREATE INDEX IF NOT EXISTS idx_organizations_registration_number
  ON public.organizations (registration_number);
