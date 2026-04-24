ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_fee_type_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_fee_type_check
  CHECK (fee_type IN (
    'application_fee','certification','renewal',
    'inspection','subscription','quotation','other'
  ));