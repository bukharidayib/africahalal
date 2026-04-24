-- Subscriptions FKs
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD CONSTRAINT subscriptions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.certification_applications(id) ON DELETE SET NULL;

-- Quotations FKs
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD CONSTRAINT quotations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.client_businesses(id) ON DELETE SET NULL,
  ADD CONSTRAINT quotations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.certification_applications(id) ON DELETE SET NULL,
  ADD CONSTRAINT quotations_converted_invoice_id_fkey FOREIGN KEY (converted_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Invoices links
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  ADD CONSTRAINT invoices_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE SET NULL;