
-- 1. Drop the overly permissive "Public view of organizations" policy
DROP POLICY IF EXISTS "Public view of organizations" ON public.organizations;

-- 2. Fix the "Users can view their own organization" policy to remove OR true
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT TO authenticated
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. Add a scoped policy for inspectors/supervisors who need to see orgs they're assigned to
CREATE POLICY "Inspectors can view assigned organizations"
ON public.organizations FOR SELECT TO authenticated
USING (
  id IN (
    SELECT ca.organization_id FROM certification_applications ca
    JOIN inspections i ON i.application_id = ca.id
    JOIN inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can view assigned organizations"
ON public.organizations FOR SELECT TO authenticated
USING (
  id IN (
    SELECT organization_id FROM organization_supervisors WHERE supervisor_id = auth.uid()
  )
);

-- 4. Add client SELECT policy on application_status_history
CREATE POLICY "Clients can view own application status history"
ON public.application_status_history FOR SELECT TO authenticated
USING (
  application_id IN (
    SELECT ca.id FROM certification_applications ca
    JOIN profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);

-- 5. Restrict organization creation to users who don't already have one
DROP POLICY IF EXISTS "Users can create their own organization" ON public.organizations;
CREATE POLICY "Users can create their own organization"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
  )
);

-- 6. Remove storage UPDATE policy for application-documents to enforce append-only
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
