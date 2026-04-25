
-- 1. invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoice items"
  ON public.invoice_items FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Clients view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (invoice_id IN (
    SELECT i.id FROM public.invoices i
    JOIN public.profiles p ON p.organization_id = i.organization_id
    WHERE p.id = auth.uid()
  ));

-- 2. invoices: add fields for pro invoicing
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS recipient_emails text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS issue_date date DEFAULT CURRENT_DATE;

-- 3. certificates: manual issuance audit
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS manually_issued boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS issued_notes text;
