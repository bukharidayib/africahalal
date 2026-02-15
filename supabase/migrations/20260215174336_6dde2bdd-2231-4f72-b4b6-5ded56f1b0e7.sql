CREATE POLICY "Clients can update own draft applications"
  ON certification_applications FOR UPDATE
  USING (
    status = 'draft'
    AND organization_id IN (
      SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );