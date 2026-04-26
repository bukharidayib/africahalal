-- Relax subscription billing_cycle and status checks
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle = ANY (ARRAY[
    '1_month','2_months','3_months','4_months','6_months','12_months',
    '1_quarter','2_quarters','3_quarters','4_quarters',
    'monthly','quarterly','yearly'
  ]));

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status = ANY (ARRAY['active','paused','suspended','cancelled','expired']));

-- Drop dual_control on certificates so manual single-admin issuance works
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS dual_control;