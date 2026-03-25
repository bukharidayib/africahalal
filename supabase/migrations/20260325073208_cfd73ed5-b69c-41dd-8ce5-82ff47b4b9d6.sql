-- Allow inspectors to view their own record
CREATE POLICY "Inspectors can view own record"
ON public.inspectors
FOR SELECT
TO authenticated
USING (user_id = auth.uid());