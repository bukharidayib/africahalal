-- Add ZynlePay tracking columns to payment_transactions
ALTER TABLE public.payment_transactions 
  ADD COLUMN IF NOT EXISTS zynlepay_transaction_id text,
  ADD COLUMN IF NOT EXISTS zynlepay_reference text;

-- Allow authenticated clients to insert their own payment transactions
CREATE POLICY "Clients can insert own payment transactions"
  ON public.payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (paid_by = auth.uid());