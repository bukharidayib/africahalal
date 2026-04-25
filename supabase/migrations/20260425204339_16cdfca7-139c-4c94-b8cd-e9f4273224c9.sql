CREATE POLICY "Admins can view all businesses"
ON public.client_businesses FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update businesses"
ON public.client_businesses FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));