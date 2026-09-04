-- Business branches and reusable business-level documents.
-- Branches are independent certification units, but PACRA remains owned by the parent business.

ALTER TABLE public.client_businesses
  ADD COLUMN IF NOT EXISTS parent_business_id uuid REFERENCES public.client_businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS branch_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.client_businesses
  DROP CONSTRAINT IF EXISTS client_businesses_user_id_pacra_number_key;

ALTER TABLE public.client_businesses
  DROP CONSTRAINT IF EXISTS client_businesses_business_type_check,
  ADD CONSTRAINT client_businesses_business_type_check
    CHECK (business_type IN ('business', 'branch'));

ALTER TABLE public.client_businesses
  DROP CONSTRAINT IF EXISTS client_businesses_status_check,
  ADD CONSTRAINT client_businesses_status_check
    CHECK (status IN ('active', 'inactive', 'suspended'));

ALTER TABLE public.client_businesses
  DROP CONSTRAINT IF EXISTS client_businesses_branch_parent_check,
  ADD CONSTRAINT client_businesses_branch_parent_check
    CHECK (
      (business_type = 'business' AND parent_business_id IS NULL)
      OR
      (business_type = 'branch' AND parent_business_id IS NOT NULL AND parent_business_id <> id)
    );

CREATE INDEX IF NOT EXISTS idx_client_businesses_parent_business_id
  ON public.client_businesses(parent_business_id);

CREATE INDEX IF NOT EXISTS idx_client_businesses_business_type
  ON public.client_businesses(business_type);

CREATE OR REPLACE FUNCTION public.update_client_businesses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_client_businesses_updated_at ON public.client_businesses;
CREATE TRIGGER update_client_businesses_updated_at
  BEFORE UPDATE ON public.client_businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_businesses_updated_at();

CREATE TABLE IF NOT EXISTS public.business_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.client_businesses(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at date,
  status text NOT NULL DEFAULT 'active',
  CONSTRAINT business_documents_status_check CHECK (status IN ('active', 'expired', 'archived', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_business_documents_business_id
  ON public.business_documents(business_id);

ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage business documents" ON public.business_documents;
CREATE POLICY "Admins can manage business documents"
ON public.business_documents FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins can manage business document files" ON storage.objects;
CREATE POLICY "Admins can manage business document files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND public.is_admin_user(auth.uid())
)
WITH CHECK (
  bucket_id = 'business-documents'
  AND public.is_admin_user(auth.uid())
);

-- Public certificate verification with branch-aware metadata.
DROP FUNCTION IF EXISTS public.verify_certificate_public(text);
CREATE OR REPLACE FUNCTION public.verify_certificate_public(cert_number text)
RETURNS TABLE (
  certificate_number text,
  status public.certificate_status,
  issue_date text,
  expiry_date text,
  scope text,
  organization_name text,
  organization_registration_number text,
  business_id uuid,
  business_type text,
  business_name text,
  parent_business_name text,
  pacra_number text,
  address text,
  city text,
  country text,
  contact_email text,
  contact_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    c.certificate_number,
    c.status,
    c.issue_date::text,
    c.expiry_date::text,
    c.scope,
    COALESCE(NULLIF(cb.branch_name, ''), cb.entity_name, o.name) AS organization_name,
    o.registration_number AS organization_registration_number,
    cb.id AS business_id,
    COALESCE(cb.business_type, 'business') AS business_type,
    COALESCE(NULLIF(cb.branch_name, ''), cb.entity_name, o.name) AS business_name,
    parent.entity_name AS parent_business_name,
    COALESCE(parent.pacra_number, cb.pacra_number, o.registration_number) AS pacra_number,
    COALESCE(cb.address, o.address) AS address,
    COALESCE(cb.city, o.city) AS city,
    COALESCE(cb.country, o.country) AS country,
    COALESCE(cb.contact_email, o.contact_email) AS contact_email,
    COALESCE(cb.contact_phone, o.contact_phone) AS contact_phone
  FROM public.certificates c
  JOIN public.organizations o ON o.id = c.organization_id
  LEFT JOIN public.certification_applications ca ON ca.id = c.application_id
  LEFT JOIN public.client_businesses cb ON cb.id = ca.business_id
  LEFT JOIN public.client_businesses parent ON parent.id = cb.parent_business_id
  WHERE c.certificate_number = cert_number
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.verify_certificate_by_id(uuid);
CREATE OR REPLACE FUNCTION public.verify_certificate_by_id(cert_id uuid)
RETURNS TABLE (
  certificate_number text,
  status public.certificate_status,
  issue_date text,
  expiry_date text,
  scope text,
  organization_name text,
  organization_registration_number text,
  business_id uuid,
  business_type text,
  business_name text,
  parent_business_name text,
  pacra_number text,
  address text,
  city text,
  country text,
  contact_email text,
  contact_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    c.certificate_number,
    c.status,
    c.issue_date::text,
    c.expiry_date::text,
    c.scope,
    COALESCE(NULLIF(cb.branch_name, ''), cb.entity_name, o.name) AS organization_name,
    o.registration_number AS organization_registration_number,
    cb.id AS business_id,
    COALESCE(cb.business_type, 'business') AS business_type,
    COALESCE(NULLIF(cb.branch_name, ''), cb.entity_name, o.name) AS business_name,
    parent.entity_name AS parent_business_name,
    COALESCE(parent.pacra_number, cb.pacra_number, o.registration_number) AS pacra_number,
    COALESCE(cb.address, o.address) AS address,
    COALESCE(cb.city, o.city) AS city,
    COALESCE(cb.country, o.country) AS country,
    COALESCE(cb.contact_email, o.contact_email) AS contact_email,
    COALESCE(cb.contact_phone, o.contact_phone) AS contact_phone
  FROM public.certificates c
  JOIN public.organizations o ON o.id = c.organization_id
  LEFT JOIN public.certification_applications ca ON ca.id = c.application_id
  LEFT JOIN public.client_businesses cb ON cb.id = ca.business_id
  LEFT JOIN public.client_businesses parent ON parent.id = cb.parent_business_id
  WHERE c.id = cert_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_business_deep(_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
  _app_ids uuid[];
  _insp_ids uuid[];
  _cert_ids uuid[];
  _ncn_ids uuid[];
  _inv_ids uuid[];
  _quo_ids uuid[];
  _sub_ids uuid[];
  _site_ids uuid[];
  _sup_report_ids uuid[];
  _ing_collection_ids uuid[];
  _ins_report_ids uuid[];
  _child_id uuid;
  _child_count integer := 0;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.client_businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  FOR _child_id IN
    SELECT id FROM public.client_businesses WHERE parent_business_id = _business_id
  LOOP
    PERFORM public.admin_delete_business_deep(_child_id);
    _child_count := _child_count + 1;
  END LOOP;

  SELECT organization_id INTO _org_id
  FROM public.client_businesses WHERE id = _business_id;

  SELECT COALESCE(array_agg(id), '{}') INTO _app_ids
  FROM public.certification_applications WHERE business_id = _business_id
     OR (_org_id IS NOT NULL AND organization_id = _org_id);

  IF array_length(_app_ids, 1) IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), '{}') INTO _insp_ids
    FROM public.inspections WHERE application_id = ANY(_app_ids);

    SELECT COALESCE(array_agg(id), '{}') INTO _cert_ids
    FROM public.certificates WHERE application_id = ANY(_app_ids)
       OR (_org_id IS NOT NULL AND organization_id = _org_id);

    SELECT COALESCE(array_agg(id), '{}') INTO _ncn_ids
    FROM public.non_conformance_notices
    WHERE application_id = ANY(_app_ids)
       OR (array_length(_insp_ids,1) IS NOT NULL AND inspection_id = ANY(_insp_ids));

    SELECT COALESCE(array_agg(id), '{}') INTO _inv_ids
    FROM public.invoices WHERE application_id = ANY(_app_ids)
       OR (_org_id IS NOT NULL AND organization_id = _org_id);

    SELECT COALESCE(array_agg(id), '{}') INTO _quo_ids
    FROM public.quotations WHERE business_id = _business_id
       OR application_id = ANY(_app_ids)
       OR (_org_id IS NOT NULL AND organization_id = _org_id);

    SELECT COALESCE(array_agg(id), '{}') INTO _sub_ids
    FROM public.subscriptions WHERE application_id = ANY(_app_ids)
       OR (_org_id IS NOT NULL AND organization_id = _org_id);
  ELSE
    _insp_ids := '{}'; _cert_ids := '{}'; _ncn_ids := '{}';
    _inv_ids := '{}'; _sub_ids := '{}';
    SELECT COALESCE(array_agg(id), '{}') INTO _quo_ids
    FROM public.quotations WHERE business_id = _business_id
       OR (_org_id IS NOT NULL AND organization_id = _org_id);
    IF _org_id IS NOT NULL THEN
      SELECT COALESCE(array_agg(id), '{}') INTO _cert_ids FROM public.certificates WHERE organization_id = _org_id;
      SELECT COALESCE(array_agg(id), '{}') INTO _inv_ids FROM public.invoices WHERE organization_id = _org_id;
      SELECT COALESCE(array_agg(id), '{}') INTO _sub_ids FROM public.subscriptions WHERE organization_id = _org_id;
    END IF;
  END IF;

  IF _org_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), '{}') INTO _site_ids
    FROM public.supervisor_sites WHERE organization_id = _org_id;
  ELSE
    _site_ids := '{}';
  END IF;

  IF array_length(_site_ids,1) IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), '{}') INTO _sup_report_ids
    FROM public.supervisor_reports WHERE site_id = ANY(_site_ids);
    SELECT COALESCE(array_agg(id), '{}') INTO _ing_collection_ids
    FROM public.supervisor_ingredient_collections WHERE site_id = ANY(_site_ids)
       OR (_org_id IS NOT NULL AND organization_id = _org_id);
  ELSE
    _sup_report_ids := '{}';
    SELECT COALESCE(array_agg(id), '{}') INTO _ing_collection_ids
    FROM public.supervisor_ingredient_collections
    WHERE _org_id IS NOT NULL AND organization_id = _org_id;
  END IF;

  IF _org_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), '{}') INTO _ins_report_ids
    FROM public.inspector_reports WHERE organization_id = _org_id;
  ELSE
    _ins_report_ids := '{}';
  END IF;

  IF array_length(_ing_collection_ids,1) IS NOT NULL THEN
    DELETE FROM public.supervisor_collected_ingredients WHERE collection_id = ANY(_ing_collection_ids);
  END IF;
  DELETE FROM public.supervisor_ingredient_collections WHERE id = ANY(_ing_collection_ids);

  IF array_length(_sup_report_ids,1) IS NOT NULL THEN
    DELETE FROM public.supervisor_checklist_items WHERE report_id = ANY(_sup_report_ids);
    DELETE FROM public.supervisor_compliance_scores WHERE report_id = ANY(_sup_report_ids);
    DELETE FROM public.supervisor_observations WHERE report_id = ANY(_sup_report_ids);
    DELETE FROM public.supervisor_ncrs WHERE report_id = ANY(_sup_report_ids);
  END IF;
  IF array_length(_site_ids,1) IS NOT NULL THEN
    DELETE FROM public.supervisor_observations WHERE site_id = ANY(_site_ids);
    DELETE FROM public.supervisor_ncrs WHERE site_id = ANY(_site_ids);
    DELETE FROM public.supervisor_compliance_scores WHERE site_id = ANY(_site_ids);
    DELETE FROM public.supervisor_incidents WHERE site_id = ANY(_site_ids);
    DELETE FROM public.supervisor_reports WHERE site_id = ANY(_site_ids);
  END IF;

  IF array_length(_ins_report_ids,1) IS NOT NULL THEN
    DELETE FROM public."Inspector_checklist_items" WHERE report_id = ANY(_ins_report_ids);
    DELETE FROM public.inspector_reports WHERE id = ANY(_ins_report_ids);
  END IF;
  IF _org_id IS NOT NULL THEN
    DELETE FROM public.inspector_incidents WHERE organization_id = _org_id;
    DELETE FROM public.inspector_observations WHERE organization_id = _org_id;
    DELETE FROM public.inspector_conflicts WHERE organization_id = _org_id;
  END IF;

  IF array_length(_inv_ids,1) IS NOT NULL THEN
    DELETE FROM public.payment_transactions WHERE invoice_id = ANY(_inv_ids);
    DELETE FROM public.invoice_items WHERE invoice_id = ANY(_inv_ids);
    DELETE FROM public.invoice_activity_log WHERE invoice_id = ANY(_inv_ids);
  END IF;

  IF array_length(_ncn_ids,1) IS NOT NULL THEN
    DELETE FROM public.corrective_actions WHERE ncn_id = ANY(_ncn_ids);
  END IF;

  IF array_length(_insp_ids,1) IS NOT NULL THEN
    DELETE FROM public.inspection_evidence WHERE inspection_id = ANY(_insp_ids);
    DELETE FROM public.inspection_checklist_items WHERE inspection_id = ANY(_insp_ids);
    DELETE FROM public.inspection_notifications WHERE inspection_id = ANY(_insp_ids);
    DELETE FROM public.inspection_reports WHERE inspection_id = ANY(_insp_ids);
  END IF;

  IF array_length(_cert_ids,1) IS NOT NULL THEN
    DELETE FROM public.certificate_history WHERE certificate_id = ANY(_cert_ids);
    UPDATE public.invoices SET certificate_id = NULL WHERE certificate_id = ANY(_cert_ids);
  END IF;

  IF array_length(_quo_ids,1) IS NOT NULL THEN
    UPDATE public.invoices SET quotation_id = NULL WHERE quotation_id = ANY(_quo_ids);
  END IF;
  IF array_length(_sub_ids,1) IS NOT NULL THEN
    UPDATE public.invoices SET subscription_id = NULL WHERE subscription_id = ANY(_sub_ids);
  END IF;
  IF array_length(_inv_ids,1) IS NOT NULL THEN
    UPDATE public.quotations SET converted_invoice_id = NULL WHERE converted_invoice_id = ANY(_inv_ids);
  END IF;

  IF array_length(_inv_ids,1) IS NOT NULL THEN
    DELETE FROM public.accountant_audit_log WHERE invoice_id = ANY(_inv_ids);
  END IF;
  IF array_length(_quo_ids,1) IS NOT NULL THEN
    DELETE FROM public.accountant_audit_log WHERE quotation_id = ANY(_quo_ids);
  END IF;
  IF _org_id IS NOT NULL THEN
    DELETE FROM public.accountant_audit_log WHERE organization_id = _org_id;
  END IF;

  DELETE FROM public.business_documents WHERE business_id = _business_id;

  IF array_length(_app_ids,1) IS NOT NULL THEN
    DELETE FROM public.application_message_reads WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_messages WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_documents WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_status_history WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_products WHERE application_id = ANY(_app_ids);
    DELETE FROM public.certification_decisions WHERE application_id = ANY(_app_ids);
    DELETE FROM public.approval_requests WHERE application_id = ANY(_app_ids);
  END IF;

  DELETE FROM public.non_conformance_notices WHERE id = ANY(_ncn_ids);
  DELETE FROM public.inspections WHERE id = ANY(_insp_ids);
  DELETE FROM public.invoices WHERE id = ANY(_inv_ids);
  DELETE FROM public.subscriptions WHERE id = ANY(_sub_ids);
  DELETE FROM public.quotations WHERE id = ANY(_quo_ids);
  DELETE FROM public.certificates WHERE id = ANY(_cert_ids);
  DELETE FROM public.certification_applications WHERE id = ANY(_app_ids);

  DELETE FROM public.supervisor_sites WHERE id = ANY(_site_ids);
  IF _org_id IS NOT NULL THEN
    DELETE FROM public.organization_supervisors WHERE organization_id = _org_id;
    DELETE FROM public.supervisor_invitations WHERE organization_id = _org_id;
    DELETE FROM public.inspector_organizations WHERE organization_id = _org_id;
  END IF;

  DELETE FROM public.client_businesses WHERE id = _business_id;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', _business_id,
    'organization_id', _org_id,
    'branches', _child_count,
    'applications', COALESCE(array_length(_app_ids,1),0),
    'inspections', COALESCE(array_length(_insp_ids,1),0),
    'certificates', COALESCE(array_length(_cert_ids,1),0),
    'invoices', COALESCE(array_length(_inv_ids,1),0),
    'quotations', COALESCE(array_length(_quo_ids,1),0),
    'subscriptions', COALESCE(array_length(_sub_ids,1),0),
    'supervisor_sites', COALESCE(array_length(_site_ids,1),0),
    'supervisor_reports', COALESCE(array_length(_sup_report_ids,1),0),
    'inspector_reports', COALESCE(array_length(_ins_report_ids,1),0),
    'ingredient_collections', COALESCE(array_length(_ing_collection_ids,1),0)
  );
END;
$$;
