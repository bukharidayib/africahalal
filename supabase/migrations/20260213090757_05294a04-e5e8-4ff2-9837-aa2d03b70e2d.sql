-- Change default currency from USD to ZMW for invoices and payment_transactions
ALTER TABLE public.invoices ALTER COLUMN currency SET DEFAULT 'ZMW'::text;
ALTER TABLE public.payment_transactions ALTER COLUMN currency SET DEFAULT 'ZMW'::text;

-- Update any existing records that have USD to ZMW
UPDATE public.invoices SET currency = 'ZMW' WHERE currency = 'USD';
UPDATE public.payment_transactions SET currency = 'ZMW' WHERE currency = 'USD';