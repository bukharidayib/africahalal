
-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  application_id UUID REFERENCES public.certification_applications(id),
  certificate_id UUID REFERENCES public.certificates(id),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('certification', 'renewal', 'inspection', 'other')),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Clients can view their own invoices
CREATE POLICY "Clients can view own invoices"
ON public.invoices FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
ON public.invoices FOR SELECT
USING (public.is_admin_user(auth.uid()));

-- Admins can insert invoices
CREATE POLICY "Admins can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (public.is_admin_user(auth.uid()));

-- Admins can update invoices
CREATE POLICY "Admins can update invoices"
ON public.invoices FOR UPDATE
USING (public.is_admin_user(auth.uid()));

-- Payments / transaction logs
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  transaction_reference TEXT,
  payment_method TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  gateway_response JSONB,
  paid_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own transactions"
ON public.payment_transactions FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM public.invoices WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can view all transactions"
ON public.payment_transactions FOR SELECT
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert transactions"
ON public.payment_transactions FOR INSERT
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update transactions"
ON public.payment_transactions FOR UPDATE
USING (public.is_admin_user(auth.uid()));

-- Invoice activity log (timeline)
CREATE TABLE public.invoice_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  action TEXT NOT NULL,
  performed_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own invoice activity"
ON public.invoice_activity_log FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM public.invoices WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage invoice activity"
ON public.invoice_activity_log FOR ALL
USING (public.is_admin_user(auth.uid()));

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
  _inv_num TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 11) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.invoices
  WHERE invoice_number LIKE 'AHIS-INV-' || _year || '-%';
  _inv_num := 'AHIS-INV-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
  RETURN _inv_num;
END;
$$;

-- Auto-update updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
