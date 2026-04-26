CREATE POLICY "Inspectors can view assigned applications"
ON public.certification_applications
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT i.application_id
    FROM inspections i
    JOIN inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  )
);