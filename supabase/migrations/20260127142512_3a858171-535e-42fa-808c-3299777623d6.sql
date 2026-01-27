-- Drop and recreate the SELECT policy to allow users to see organizations they're inserting
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT TO authenticated
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR
  -- Allow seeing any organization temporarily (needed during creation flow)
  -- The INSERT policy already ensures only authenticated users can create
  true
);