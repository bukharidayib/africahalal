ALTER TABLE public.client_businesses
  ADD COLUMN IF NOT EXISTS directory_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS directory_status text NOT NULL DEFAULT 'listed';

ALTER TABLE public.client_businesses
  DROP CONSTRAINT IF EXISTS client_businesses_directory_status_check,
  ADD CONSTRAINT client_businesses_directory_status_check
  CHECK (directory_status IN ('listed', 'hidden', 'pending_review'));

CREATE INDEX IF NOT EXISTS idx_client_businesses_directory
  ON public.client_businesses(directory_visible, directory_status);

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS directory_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_certificates_directory
  ON public.certificates(directory_visible, status);

DROP POLICY IF EXISTS "Public can view active certificates" ON public.certificates;
CREATE POLICY "Public can view active directory certificates"
ON public.certificates FOR SELECT
TO anon, authenticated
USING (
  status = 'active'
  AND directory_visible = true
  AND (
    NOT EXISTS (
      SELECT 1
      FROM public.certification_applications ca
      WHERE ca.id = certificates.application_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.certification_applications ca
      JOIN public.client_businesses cb ON cb.id = ca.business_id
      WHERE ca.id = certificates.application_id
        AND cb.status = 'active'
        AND cb.directory_visible = true
        AND cb.directory_status = 'listed'
    )
  )
);
