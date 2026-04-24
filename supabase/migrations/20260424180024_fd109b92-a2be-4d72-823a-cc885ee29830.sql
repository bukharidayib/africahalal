
-- ===== subscriptions =====
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  application_id uuid,
  plan_name text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','quarterly','yearly')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','expired')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date date,
  end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Clients view own subscriptions" ON public.subscriptions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_app ON public.subscriptions(application_id);

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== quotations =====
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  business_id uuid,
  application_id uuid,
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  notes text,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  converted_invoice_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quotations" ON public.quotations
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Clients view own quotations" ON public.quotations
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Clients update own quotation status" ON public.quotations
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  ) WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_quotations_org ON public.quotations(organization_id);
CREATE INDEX idx_quotations_app ON public.quotations(application_id);
CREATE INDEX idx_quotations_status ON public.quotations(status);

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== generate_quotation_number =====
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year text;
  _seq integer;
  _q_num text;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 11) AS integer)), 0) + 1
  INTO _seq
  FROM public.quotations
  WHERE quotation_number LIKE 'AHIS-QUO-' || _year || '-%';
  _q_num := 'AHIS-QUO-' || _year || '-' || LPAD(_seq::text, 5, '0');
  RETURN _q_num;
END;
$$;

-- ===== invoices: link to subscriptions/quotations =====
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subscription_id uuid,
  ADD COLUMN IF NOT EXISTS quotation_id uuid;

CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation ON public.invoices(quotation_id);

-- ===== migrate validity_period legacy values =====
UPDATE public.certification_applications
SET validity_period = CASE
  WHEN validity_period = '6_months' THEN '2_quarter'
  WHEN validity_period = '1_year' THEN '4_quarter'
  ELSE validity_period
END
WHERE validity_period IN ('6_months','1_year');
