-- ============================================================
-- Helper: applications visible to a supervisor (their orgs)
-- ============================================================
CREATE OR REPLACE FUNCTION public.supervisor_application_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.id
  FROM public.certification_applications ca
  WHERE ca.organization_id IN (
    SELECT os.organization_id
    FROM public.organization_supervisors os
    WHERE os.supervisor_id = _user_id
  );
$$;

-- ============================================================
-- Helper: applications visible to an inspector (own orgs +
-- orgs of inspectors they manage if they are a manager)
-- ============================================================
CREATE OR REPLACE FUNCTION public.inspector_application_ids_full(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, is_manager FROM public.inspectors WHERE user_id = _user_id
  ),
  my_inspector_ids AS (
    SELECT id FROM me
    UNION
    SELECT imi.inspector_id
    FROM public.inspector_manager_inspectors imi
    JOIN me ON me.is_manager = true AND imi.manager_id = me.id
  ),
  my_org_ids AS (
    SELECT DISTINCT io.organization_id
    FROM public.inspector_organizations io
    WHERE io.inspector_id IN (SELECT id FROM my_inspector_ids)
  )
  SELECT ca.id
  FROM public.certification_applications ca
  WHERE ca.organization_id IN (SELECT organization_id FROM my_org_ids);
$$;

-- ============================================================
-- NCN visibility for field staff
-- ============================================================
DROP POLICY IF EXISTS "Supervisors view org NCRs" ON public.non_conformance_notices;
CREATE POLICY "Supervisors view org NCRs"
ON public.non_conformance_notices
FOR SELECT
TO authenticated
USING (application_id IN (SELECT public.supervisor_application_ids(auth.uid())));

DROP POLICY IF EXISTS "Inspectors view org NCRs" ON public.non_conformance_notices;
CREATE POLICY "Inspectors view org NCRs"
ON public.non_conformance_notices
FOR SELECT
TO authenticated
USING (application_id IN (SELECT public.inspector_application_ids_full(auth.uid())));

-- ============================================================
-- Corrective action visibility for field staff
-- ============================================================
DROP POLICY IF EXISTS "Supervisors view org corrective actions" ON public.corrective_actions;
CREATE POLICY "Supervisors view org corrective actions"
ON public.corrective_actions
FOR SELECT
TO authenticated
USING (
  ncn_id IN (
    SELECT n.id FROM public.non_conformance_notices n
    WHERE n.application_id IN (SELECT public.supervisor_application_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Inspectors view org corrective actions" ON public.corrective_actions;
CREATE POLICY "Inspectors view org corrective actions"
ON public.corrective_actions
FOR SELECT
TO authenticated
USING (
  ncn_id IN (
    SELECT n.id FROM public.non_conformance_notices n
    WHERE n.application_id IN (SELECT public.inspector_application_ids_full(auth.uid()))
  )
);