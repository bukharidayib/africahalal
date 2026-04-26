CREATE OR REPLACE FUNCTION public.get_inspector_assigned_organization_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT io.organization_id
  FROM public.inspector_organizations io
  JOIN public.inspectors insp ON insp.id = io.inspector_id
  WHERE insp.user_id = _user_id
    AND insp.is_active = true;
$$;

DROP POLICY IF EXISTS "Inspectors can view directly assigned organizations" ON public.organizations;

CREATE POLICY "Inspectors can view directly assigned organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_inspector_assigned_organization_ids(auth.uid()))
);