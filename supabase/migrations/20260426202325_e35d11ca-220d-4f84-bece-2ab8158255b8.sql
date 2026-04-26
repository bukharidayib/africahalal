-- Drop the recursive policy
DROP POLICY IF EXISTS "Inspectors can view assigned applications" ON public.certification_applications;

-- Helper: get application IDs assigned to the current inspector user
CREATE OR REPLACE FUNCTION public.get_inspector_application_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.application_id
  FROM inspections i
  JOIN inspectors insp ON insp.id = i.inspector_id
  WHERE insp.user_id = _user_id;
$$;

-- Recreate policy using the security definer function (no recursion)
CREATE POLICY "Inspectors can view assigned applications"
ON public.certification_applications
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_inspector_application_ids(auth.uid()))
);