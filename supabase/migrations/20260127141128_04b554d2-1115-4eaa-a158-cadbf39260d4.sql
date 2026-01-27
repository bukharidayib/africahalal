-- Allow authenticated users to create their own organization during application submission
CREATE POLICY "Users can create their own organization"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users to view their own organization (the one linked to their profile)
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT TO authenticated
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);