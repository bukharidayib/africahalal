-- Allow any authenticated user to insert an organization (used when registering a new business)
DROP POLICY IF EXISTS "Users can create their own organization" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow clients to view organizations linked to any of their client_businesses
DROP POLICY IF EXISTS "Users can view organizations of their businesses" ON public.organizations;
CREATE POLICY "Users can view organizations of their businesses"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cb.organization_id
      FROM public.client_businesses cb
      WHERE cb.user_id = auth.uid()
        AND cb.organization_id IS NOT NULL
    )
  );