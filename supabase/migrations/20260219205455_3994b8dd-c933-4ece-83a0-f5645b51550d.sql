
-- ============================================================
-- STEP 1: Clear old workflow stage permissions (they ref old stage IDs)
-- ============================================================
DELETE FROM public.workflow_stage_permissions;

-- ============================================================
-- STEP 2: Clear old workflow stages (the 6 mismatched ones)
-- ============================================================
DELETE FROM public.workflow_stages;

-- ============================================================
-- STEP 3: Insert 7 new workflow stages matching your 7 application statuses
-- ============================================================
INSERT INTO public.workflow_stages (id, name, system_code, display_name, stage_order, description, is_active) VALUES
  (gen_random_uuid(), 'submitted',             'SUBMITTED',             'Submitted',             1, 'Application has been submitted and awaits initial review',     true),
  (gen_random_uuid(), 'under_review',          'UNDER_REVIEW',          'Under Review',          2, 'Application is being reviewed by a certification officer',    true),
  (gen_random_uuid(), 'inspection_scheduled',  'INSPECTION_SCHEDULED',  'Inspection Scheduled',  3, 'Inspection has been scheduled with an inspector',             true),
  (gen_random_uuid(), 'inspection_completed',  'INSPECTION_COMPLETED',  'Inspection Completed',  4, 'Inspection has been completed and report submitted',          true),
  (gen_random_uuid(), 'approved',              'APPROVED',              'Approved',              5, 'Application approved and certificate issued',                 true),
  (gen_random_uuid(), 'rejected',              'REJECTED',              'Rejected',              6, 'Application has been rejected',                              true),
  (gen_random_uuid(), 'suspended',             'SUSPENDED',             'Suspended',             7, 'Certification has been suspended pending review',            true);

-- ============================================================
-- STEP 4: Seed workflow_stage_permissions for super_admin (full access at every stage)
-- We'll use a DO block to resolve IDs dynamically
-- ============================================================
DO $$
DECLARE
  v_super_admin_id   uuid;
  v_cido_id          uuid;

  -- Stage IDs
  v_submitted_id     uuid;
  v_under_review_id  uuid;
  v_insp_sched_id    uuid;
  v_insp_comp_id     uuid;
  v_approved_id      uuid;
  v_rejected_id      uuid;
  v_suspended_id     uuid;

  -- Permission IDs (applications)
  p_app_view         uuid;
  p_app_update       uuid;
  p_app_manage       uuid;
  p_app_approve      uuid;
  p_app_reject       uuid;
  p_app_create       uuid;

  -- Permission IDs (documentation)
  p_doc_view         uuid;
  p_doc_approve      uuid;
  p_doc_upload       uuid;

  -- Permission IDs (inspections)
  p_insp_view        uuid;
  p_insp_manage      uuid;
  p_insp_schedule    uuid;
  p_insp_approve     uuid;

  -- Permission IDs (certificates)
  p_cert_view        uuid;
  p_cert_issue       uuid;
  p_cert_update      uuid;
  p_cert_revoke      uuid;

  -- Permission IDs (enforcement)
  p_enf_view         uuid;
  p_enf_manage       uuid;

BEGIN
  -- Resolve role IDs
  SELECT id INTO v_super_admin_id FROM public.admin_roles WHERE name = 'super_admin' LIMIT 1;
  SELECT id INTO v_cido_id        FROM public.admin_roles WHERE name = 'cido' LIMIT 1;

  -- Resolve stage IDs
  SELECT id INTO v_submitted_id    FROM public.workflow_stages WHERE system_code = 'SUBMITTED' LIMIT 1;
  SELECT id INTO v_under_review_id FROM public.workflow_stages WHERE system_code = 'UNDER_REVIEW' LIMIT 1;
  SELECT id INTO v_insp_sched_id   FROM public.workflow_stages WHERE system_code = 'INSPECTION_SCHEDULED' LIMIT 1;
  SELECT id INTO v_insp_comp_id    FROM public.workflow_stages WHERE system_code = 'INSPECTION_COMPLETED' LIMIT 1;
  SELECT id INTO v_approved_id     FROM public.workflow_stages WHERE system_code = 'APPROVED' LIMIT 1;
  SELECT id INTO v_rejected_id     FROM public.workflow_stages WHERE system_code = 'REJECTED' LIMIT 1;
  SELECT id INTO v_suspended_id    FROM public.workflow_stages WHERE system_code = 'SUSPENDED' LIMIT 1;

  -- Resolve permission IDs
  SELECT id INTO p_app_view     FROM public.permissions WHERE code = 'applications.view'    LIMIT 1;
  SELECT id INTO p_app_update   FROM public.permissions WHERE code = 'applications.update'  LIMIT 1;
  SELECT id INTO p_app_manage   FROM public.permissions WHERE code = 'applications.manage'  LIMIT 1;
  SELECT id INTO p_app_approve  FROM public.permissions WHERE code = 'applications.approve' LIMIT 1;
  SELECT id INTO p_app_reject   FROM public.permissions WHERE code = 'applications.reject'  LIMIT 1;
  SELECT id INTO p_app_create   FROM public.permissions WHERE code = 'applications.create'  LIMIT 1;

  SELECT id INTO p_doc_view     FROM public.permissions WHERE code = 'documentation.view'    LIMIT 1;
  SELECT id INTO p_doc_approve  FROM public.permissions WHERE code = 'documentation.approve' LIMIT 1;
  SELECT id INTO p_doc_upload   FROM public.permissions WHERE code = 'documentation.upload'  LIMIT 1;

  SELECT id INTO p_insp_view    FROM public.permissions WHERE code = 'inspections.view'           LIMIT 1;
  SELECT id INTO p_insp_manage  FROM public.permissions WHERE code = 'inspections.manage'         LIMIT 1;
  SELECT id INTO p_insp_schedule FROM public.permissions WHERE code = 'inspections.schedule'      LIMIT 1;
  SELECT id INTO p_insp_approve FROM public.permissions WHERE code = 'inspections.approve_report' LIMIT 1;

  SELECT id INTO p_cert_view    FROM public.permissions WHERE code = 'certificates.view'   LIMIT 1;
  SELECT id INTO p_cert_issue   FROM public.permissions WHERE code = 'certificates.issue'  LIMIT 1;
  SELECT id INTO p_cert_update  FROM public.permissions WHERE code = 'certificates.update' LIMIT 1;
  SELECT id INTO p_cert_revoke  FROM public.permissions WHERE code = 'certificates.revoke' LIMIT 1;

  SELECT id INTO p_enf_view     FROM public.permissions WHERE code = 'enforcement.view'   LIMIT 1;
  SELECT id INTO p_enf_manage   FROM public.permissions WHERE code = 'enforcement.manage' LIMIT 1;

  -- ============================================================
  -- SUPER_ADMIN: Full access at every stage
  -- ============================================================

  -- Stage 1: SUBMITTED
  INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
    (v_super_admin_id, v_submitted_id, p_app_view),
    (v_super_admin_id, v_submitted_id, p_app_update),
    (v_super_admin_id, v_submitted_id, p_app_manage),
    (v_super_admin_id, v_submitted_id, p_app_create),
    (v_super_admin_id, v_submitted_id, p_doc_view),
    (v_super_admin_id, v_submitted_id, p_doc_upload);

  -- Stage 2: UNDER_REVIEW
  INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
    (v_super_admin_id, v_under_review_id, p_app_view),
    (v_super_admin_id, v_under_review_id, p_app_update),
    (v_super_admin_id, v_under_review_id, p_app_manage),
    (v_super_admin_id, v_under_review_id, p_app_approve),
    (v_super_admin_id, v_under_review_id, p_app_reject),
    (v_super_admin_id, v_under_review_id, p_doc_view),
    (v_super_admin_id, v_under_review_id, p_doc_approve),
    (v_super_admin_id, v_under_review_id, p_doc_upload);

  -- Stage 3: INSPECTION_SCHEDULED
  INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
    (v_super_admin_id, v_insp_sched_id, p_app_view),
    (v_super_admin_id, v_insp_sched_id, p_app_update),
    (v_super_admin_id, v_insp_sched_id, p_app_manage),
    (v_super_admin_id, v_insp_sched_id, p_insp_view),
    (v_super_admin_id, v_insp_sched_id, p_insp_manage),
    (v_super_admin_id, v_insp_sched_id, p_insp_schedule),
    (v_super_admin_id, v_insp_sched_id, p_doc_view);

  -- Stage 4: INSPECTION_COMPLETED
  INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
    (v_super_admin_id, v_insp_comp_id, p_app_view),
    (v_super_admin_id, v_insp_comp_id, p_app_update),
    (v_super_admin_id, v_insp_comp_id, p_app_manage),
    (v_super_admin_id, v_insp_comp_id, p_insp_view),
    (v_super_admin_id, v_insp_comp_id, p_insp_approve),
    (v_super_admin_id, v_insp_comp_id, p_enf_view),
    (v_super_admin_id, v_insp_comp_id, p_enf_manage);

  -- Stage 5: APPROVED
  INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
    (v_super_admin_id, v_approved_id, p_app_view),
    (v_super_admin_id, v_approved_id, p_app_manage),
    (v_super_admin_id, v_approved_id, p_cert_view),
    (v_super_admin_id, v_approved_id, p_cert_issue),
    (v_super_admin_id, v_approved_id, p_cert_update);

  -- Stage 6: REJECTED
  INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
    (v_super_admin_id, v_rejected_id, p_app_view),
    (v_super_admin_id, v_rejected_id, p_app_update),
    (v_super_admin_id, v_rejected_id, p_app_manage);

  -- Stage 7: SUSPENDED
  INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
    (v_super_admin_id, v_suspended_id, p_app_view),
    (v_super_admin_id, v_suspended_id, p_app_update),
    (v_super_admin_id, v_suspended_id, p_app_manage),
    (v_super_admin_id, v_suspended_id, p_cert_view),
    (v_super_admin_id, v_suspended_id, p_cert_update),
    (v_super_admin_id, v_suspended_id, p_cert_revoke),
    (v_super_admin_id, v_suspended_id, p_enf_view),
    (v_super_admin_id, v_suspended_id, p_enf_manage);

  -- ============================================================
  -- CIDO: Appropriate access per stage (only if role exists)
  -- ============================================================
  IF v_cido_id IS NOT NULL THEN

    -- Stage 1: SUBMITTED (view only)
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
      (v_cido_id, v_submitted_id, p_app_view),
      (v_cido_id, v_submitted_id, p_doc_view);

    -- Stage 2: UNDER_REVIEW (review docs + update app)
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
      (v_cido_id, v_under_review_id, p_app_view),
      (v_cido_id, v_under_review_id, p_app_update),
      (v_cido_id, v_under_review_id, p_doc_view),
      (v_cido_id, v_under_review_id, p_doc_approve);

    -- Stage 3: INSPECTION_SCHEDULED (schedule + manage inspections)
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
      (v_cido_id, v_insp_sched_id, p_app_view),
      (v_cido_id, v_insp_sched_id, p_insp_view),
      (v_cido_id, v_insp_sched_id, p_insp_schedule),
      (v_cido_id, v_insp_sched_id, p_insp_manage);

    -- Stage 4: INSPECTION_COMPLETED (review report + update app)
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
      (v_cido_id, v_insp_comp_id, p_app_view),
      (v_cido_id, v_insp_comp_id, p_app_update),
      (v_cido_id, v_insp_comp_id, p_insp_view),
      (v_cido_id, v_insp_comp_id, p_insp_approve);

    -- Stage 5: APPROVED (view + issue certificate)
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
      (v_cido_id, v_approved_id, p_app_view),
      (v_cido_id, v_approved_id, p_cert_view),
      (v_cido_id, v_approved_id, p_cert_issue);

    -- Stage 6: REJECTED (view only)
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
      (v_cido_id, v_rejected_id, p_app_view);

    -- Stage 7: SUSPENDED (view only)
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id) VALUES
      (v_cido_id, v_suspended_id, p_app_view);

  END IF;

END $$;
