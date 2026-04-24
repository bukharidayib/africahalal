CREATE TABLE IF NOT EXISTS public.accountant_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id UUID,
  actor_email TEXT,
  invoice_id UUID,
  quotation_id UUID,
  organization_id UUID,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acc_audit_invoice ON public.accountant_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_acc_audit_quotation ON public.accountant_audit_log(quotation_id);
CREATE INDEX IF NOT EXISTS idx_acc_audit_org ON public.accountant_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_acc_audit_created ON public.accountant_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acc_audit_event ON public.accountant_audit_log(event_type);

ALTER TABLE public.accountant_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view accountant audit log"
ON public.accountant_audit_log FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Authenticated can insert accountant audit log"
ON public.accountant_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);