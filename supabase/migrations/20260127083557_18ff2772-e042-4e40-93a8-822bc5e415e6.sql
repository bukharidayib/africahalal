-- Add organization_id column to profiles to link clients to their organizations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Allow clients to view their own organization's certificates
CREATE POLICY "Clients can view own organization certificates"
ON public.certificates
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow clients to view their own organization's applications
CREATE POLICY "Clients can view own organization applications"
ON public.certification_applications
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow clients to insert their own applications
CREATE POLICY "Clients can insert own organization applications"
ON public.certification_applications
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow clients to view documents for their applications
CREATE POLICY "Clients can view own documents"
ON public.application_documents
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid() OR
  application_id IN (
    SELECT ca.id FROM public.certification_applications ca
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);

-- Allow clients to insert documents for their applications
CREATE POLICY "Clients can insert own documents"
ON public.application_documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
);

-- Allow clients to view corrective actions for their applications
CREATE POLICY "Clients can view own corrective actions"
ON public.corrective_actions
FOR SELECT
TO authenticated
USING (
  ncn_id IN (
    SELECT n.id FROM public.non_conformance_notices n
    JOIN public.certification_applications ca ON ca.id = n.application_id
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);

-- Allow clients to view inspection reports for their applications  
CREATE POLICY "Clients can view own inspection reports"
ON public.inspection_reports
FOR SELECT
TO authenticated
USING (
  inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.certification_applications ca ON ca.id = i.application_id
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);