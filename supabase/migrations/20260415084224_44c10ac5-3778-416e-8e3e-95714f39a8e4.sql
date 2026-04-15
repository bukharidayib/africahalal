
-- Create offline_payments table
CREATE TABLE public.offline_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  amount numeric NOT NULL,
  transaction_reference text,
  screenshot_path text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending_review',
  submitted_by uuid NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offline_payments ENABLE ROW LEVEL SECURITY;

-- Clients can submit offline payments
CREATE POLICY "Clients can insert offline payments"
ON public.offline_payments
FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

-- Clients can view their own offline payments
CREATE POLICY "Clients can view own offline payments"
ON public.offline_payments
FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT i.id FROM public.invoices i
    WHERE i.organization_id IN (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);

-- Admins can view all offline payments
CREATE POLICY "Admins can view all offline payments"
ON public.offline_payments
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Admins can update offline payments (approve/reject)
CREATE POLICY "Admins can update offline payments"
ON public.offline_payments
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));
