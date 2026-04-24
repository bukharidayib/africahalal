CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _year text;
  _seq integer;
  _inv_num text;
BEGIN
  _year := to_char(now(), 'YYYY');
  -- 'AHIS-INV-YYYY-' is 14 chars, sequence starts at position 15
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 15) AS integer)), 0) + 1
  INTO _seq
  FROM public.invoices
  WHERE invoice_number ~ ('^AHIS-INV-' || _year || '-[0-9]+$');
  _inv_num := 'AHIS-INV-' || _year || '-' || LPAD(_seq::text, 5, '0');
  RETURN _inv_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _year text;
  _seq integer;
  _q_num text;
BEGIN
  _year := to_char(now(), 'YYYY');
  -- 'AHIS-QUO-YYYY-' is 14 chars, sequence starts at position 15
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 15) AS integer)), 0) + 1
  INTO _seq
  FROM public.quotations
  WHERE quotation_number ~ ('^AHIS-QUO-' || _year || '-[0-9]+$');
  _q_num := 'AHIS-QUO-' || _year || '-' || LPAD(_seq::text, 5, '0');
  RETURN _q_num;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quotation_number() TO anon, authenticated;
