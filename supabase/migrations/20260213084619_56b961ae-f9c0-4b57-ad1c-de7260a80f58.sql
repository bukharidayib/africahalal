
-- 1. Drop the overly permissive public certificate policy
DROP POLICY IF EXISTS "Public can verify certificates" ON public.certificates;

-- 2. Create a SECURITY DEFINER function for public certificate verification
CREATE OR REPLACE FUNCTION public.verify_certificate_public(cert_number text)
RETURNS TABLE (
  certificate_number text,
  status public.certificate_status,
  issue_date text,
  expiry_date text,
  scope text,
  organization_name text,
  organization_registration_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    c.certificate_number,
    c.status,
    c.issue_date::text,
    c.expiry_date::text,
    c.scope,
    o.name AS organization_name,
    o.registration_number AS organization_registration_number
  FROM public.certificates c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE c.certificate_number = cert_number
  LIMIT 1;
$$;

-- 3. Also support lookup by ID (for QR code scans)
CREATE OR REPLACE FUNCTION public.verify_certificate_by_id(cert_id uuid)
RETURNS TABLE (
  certificate_number text,
  status public.certificate_status,
  issue_date text,
  expiry_date text,
  scope text,
  organization_name text,
  organization_registration_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    c.certificate_number,
    c.status,
    c.issue_date::text,
    c.expiry_date::text,
    c.scope,
    o.name AS organization_name,
    o.registration_number AS organization_registration_number
  FROM public.certificates c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE c.id = cert_id
  LIMIT 1;
$$;
