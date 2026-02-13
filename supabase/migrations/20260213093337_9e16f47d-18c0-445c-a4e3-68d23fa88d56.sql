-- Allow authenticated clients to insert invoices for their own organization
CREATE POLICY "Clients can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );