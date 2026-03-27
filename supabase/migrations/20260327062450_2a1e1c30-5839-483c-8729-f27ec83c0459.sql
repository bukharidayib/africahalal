CREATE POLICY "Clients can view own inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (
  application_id IN (
    SELECT ca.id FROM certification_applications ca
    JOIN profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);