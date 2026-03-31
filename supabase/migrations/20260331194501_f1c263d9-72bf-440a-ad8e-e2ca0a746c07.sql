CREATE POLICY "Supervisors can create own sites"
ON public.supervisor_sites
FOR INSERT TO authenticated
WITH CHECK (supervisor_id = auth.uid());