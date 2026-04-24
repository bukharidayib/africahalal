-- 1. Add business_id column linking applications to a specific client business
ALTER TABLE public.certification_applications
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.client_businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_certification_applications_business_status
  ON public.certification_applications(business_id, status);

-- 2. Backfill business_id for existing applications where we can find a matching business
UPDATE public.certification_applications ca
SET business_id = cb.id
FROM public.client_businesses cb
WHERE ca.business_id IS NULL
  AND cb.organization_id = ca.organization_id;

-- 3. Replace the enforce_single_active_application trigger with per-business logic
CREATE OR REPLACE FUNCTION public.enforce_single_active_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drafts are always allowed (unlimited per business)
  IF NEW.status = 'draft'::application_status THEN
    RETURN NEW;
  END IF;

  -- Terminal statuses don't need to lock anything
  IF NEW.status IN ('expired'::application_status, 'rejected'::application_status, 'withdrawn'::application_status) THEN
    RETURN NEW;
  END IF;

  -- Per-business enforcement when business_id is set
  IF NEW.business_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.certification_applications
      WHERE business_id = NEW.business_id
        AND status NOT IN (
          'draft'::application_status,
          'expired'::application_status,
          'rejected'::application_status,
          'withdrawn'::application_status
        )
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'This business already has an active application. You can apply again once it expires.'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- Legacy fallback: per-organization enforcement when no business_id is set
  IF EXISTS (
    SELECT 1 FROM public.certification_applications
    WHERE organization_id = NEW.organization_id
      AND business_id IS NULL
      AND status NOT IN (
        'draft'::application_status,
        'expired'::application_status,
        'rejected'::application_status,
        'withdrawn'::application_status
      )
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'This business already has an active application. You can apply again once it expires.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Recreate trigger to fire on INSERT and on UPDATE of status/business_id
DROP TRIGGER IF EXISTS trg_enforce_single_active_application ON public.certification_applications;
CREATE TRIGGER trg_enforce_single_active_application
BEFORE INSERT OR UPDATE OF status, business_id
ON public.certification_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_application();