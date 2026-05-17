
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
BEGIN
  -- Caller must be admin
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.client_businesses WHERE id = _business_id;

  IF _org_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.client_businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  -- Collect ids
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

  -- Supervisor sites tied to this org
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

  -- Inspector reports tied to this org
  IF _org_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), '{}') INTO _ins_report_ids
    FROM public.inspector_reports WHERE organization_id = _org_id;
  ELSE
    _ins_report_ids := '{}';
  END IF;

  -- ===== Delete grandchildren first =====

  -- Ingredient tracker
  IF array_length(_ing_collection_ids,1) IS NOT NULL THEN
    DELETE FROM public.supervisor_collected_ingredients WHERE collection_id = ANY(_ing_collection_ids);
  END IF;
  DELETE FROM public.supervisor_ingredient_collections WHERE id = ANY(_ing_collection_ids);

  -- Supervisor reports children + reports
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

  -- Inspector reports + children + incidents/observations/conflicts by org
  IF array_length(_ins_report_ids,1) IS NOT NULL THEN
    DELETE FROM public."Inspector_checklist_items" WHERE report_id = ANY(_ins_report_ids);
    DELETE FROM public.inspector_reports WHERE id = ANY(_ins_report_ids);
  END IF;
  IF _org_id IS NOT NULL THEN
    DELETE FROM public.inspector_incidents WHERE organization_id = _org_id;
    DELETE FROM public.inspector_observations WHERE organization_id = _org_id;
    DELETE FROM public.inspector_conflicts WHERE organization_id = _org_id;
  END IF;

  -- Invoice grandchildren
  IF array_length(_inv_ids,1) IS NOT NULL THEN
    DELETE FROM public.payment_transactions WHERE invoice_id = ANY(_inv_ids);
    DELETE FROM public.invoice_items WHERE invoice_id = ANY(_inv_ids);
    DELETE FROM public.invoice_activity_log WHERE invoice_id = ANY(_inv_ids);
  END IF;

  -- NCN grandchildren
  IF array_length(_ncn_ids,1) IS NOT NULL THEN
    DELETE FROM public.corrective_actions WHERE ncn_id = ANY(_ncn_ids);
  END IF;

  -- Inspection grandchildren (cascade covers most, but be explicit)
  IF array_length(_insp_ids,1) IS NOT NULL THEN
    DELETE FROM public.inspection_evidence WHERE inspection_id = ANY(_insp_ids);
    DELETE FROM public.inspection_checklist_items WHERE inspection_id = ANY(_insp_ids);
    DELETE FROM public.inspection_notifications WHERE inspection_id = ANY(_insp_ids);
    DELETE FROM public.inspection_reports WHERE inspection_id = ANY(_insp_ids);
  END IF;

  -- Certificate grandchildren + null out invoice fk
  IF array_length(_cert_ids,1) IS NOT NULL THEN
    DELETE FROM public.certificate_history WHERE certificate_id = ANY(_cert_ids);
    UPDATE public.invoices SET certificate_id = NULL WHERE certificate_id = ANY(_cert_ids);
  END IF;

  -- Quotation references on invoices
  IF array_length(_quo_ids,1) IS NOT NULL THEN
    UPDATE public.invoices SET quotation_id = NULL WHERE quotation_id = ANY(_quo_ids);
  END IF;
  IF array_length(_sub_ids,1) IS NOT NULL THEN
    UPDATE public.invoices SET subscription_id = NULL WHERE subscription_id = ANY(_sub_ids);
  END IF;
  IF array_length(_inv_ids,1) IS NOT NULL THEN
    UPDATE public.quotations SET converted_invoice_id = NULL WHERE converted_invoice_id = ANY(_inv_ids);
  END IF;

  -- Accountant audit log
  IF array_length(_inv_ids,1) IS NOT NULL THEN
    DELETE FROM public.accountant_audit_log WHERE invoice_id = ANY(_inv_ids);
  END IF;
  IF array_length(_quo_ids,1) IS NOT NULL THEN
    DELETE FROM public.accountant_audit_log WHERE quotation_id = ANY(_quo_ids);
  END IF;
  IF _org_id IS NOT NULL THEN
    DELETE FROM public.accountant_audit_log WHERE organization_id = _org_id;
  END IF;

  -- Application children
  IF array_length(_app_ids,1) IS NOT NULL THEN
    DELETE FROM public.application_message_reads WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_messages WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_documents WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_status_history WHERE application_id = ANY(_app_ids);
    DELETE FROM public.application_products WHERE application_id = ANY(_app_ids);
    DELETE FROM public.certification_decisions WHERE application_id = ANY(_app_ids);
    DELETE FROM public.approval_requests WHERE application_id = ANY(_app_ids);
  END IF;

  -- Now delete parents
  DELETE FROM public.non_conformance_notices WHERE id = ANY(_ncn_ids);
  DELETE FROM public.inspections WHERE id = ANY(_insp_ids);
  DELETE FROM public.invoices WHERE id = ANY(_inv_ids);
  DELETE FROM public.subscriptions WHERE id = ANY(_sub_ids);
  DELETE FROM public.quotations WHERE id = ANY(_quo_ids);
  DELETE FROM public.certificates WHERE id = ANY(_cert_ids);
  DELETE FROM public.certification_applications WHERE id = ANY(_app_ids);

  -- Supervisor sites + supervisor org assignments + invitations
  DELETE FROM public.supervisor_sites WHERE id = ANY(_site_ids);
  IF _org_id IS NOT NULL THEN
    DELETE FROM public.organization_supervisors WHERE organization_id = _org_id;
    DELETE FROM public.supervisor_invitations WHERE organization_id = _org_id;
    DELETE FROM public.inspector_organizations WHERE organization_id = _org_id;
  END IF;

  -- Finally delete the business
  DELETE FROM public.client_businesses WHERE id = _business_id;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', _business_id,
    'organization_id', _org_id,
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
