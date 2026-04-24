
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_organization_id_fkey') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_application_id_fkey') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.certification_applications(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_organization_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_application_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.certification_applications(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_certificate_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_subscription_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_quotation_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certification_applications_organization_id_fkey') THEN
    ALTER TABLE public.certification_applications ADD CONSTRAINT certification_applications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END$$;
