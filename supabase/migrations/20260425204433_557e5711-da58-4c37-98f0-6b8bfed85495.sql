DROP POLICY IF EXISTS "Admins can update businesses" ON public.client_businesses;

CREATE POLICY "Admins can update businesses"
ON public.client_businesses FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));