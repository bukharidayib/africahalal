
-- 1. Allow clients to view NCNs for their organization
DROP POLICY IF EXISTS "Clients can view own organization NCNs" ON public.non_conformance_notices;
CREATE POLICY "Clients can view own organization NCNs"
ON public.non_conformance_notices
FOR SELECT TO authenticated
USING (
  application_id IN (
    SELECT ca.id
    FROM public.certification_applications ca
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);

-- 2. Allow clients to insert corrective actions for their own NCNs
DROP POLICY IF EXISTS "Clients can insert own corrective actions" ON public.corrective_actions;
CREATE POLICY "Clients can insert own corrective actions"
ON public.corrective_actions
FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND ncn_id IN (
    SELECT n.id
    FROM public.non_conformance_notices n
    JOIN public.certification_applications ca ON ca.id = n.application_id
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);

-- 3. Allow clients to update NCN status to corrective_action_submitted after submitting CA
DROP POLICY IF EXISTS "Clients can mark NCN as corrective_action_submitted" ON public.non_conformance_notices;
CREATE POLICY "Clients can mark NCN as corrective_action_submitted"
ON public.non_conformance_notices
FOR UPDATE TO authenticated
USING (
  application_id IN (
    SELECT ca.id
    FROM public.certification_applications ca
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  application_id IN (
    SELECT ca.id
    FROM public.certification_applications ca
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);

-- 4. Storage bucket for client corrective-action evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-evidence', 'client-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Clients can upload own evidence" ON storage.objects;
CREATE POLICY "Clients can upload own evidence"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Clients can read own evidence" ON storage.objects;
CREATE POLICY "Clients can read own evidence"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'client-evidence'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_admin_user(auth.uid())
  )
);
