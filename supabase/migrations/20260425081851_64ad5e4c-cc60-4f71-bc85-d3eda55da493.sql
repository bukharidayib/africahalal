-- ============================================================
-- RBAC HARDENING MIGRATION
-- Adds missing permission categories, seeds defaults for existing roles,
-- wires workflow stages, and fixes display name typo.
-- ============================================================

-- 1) ADD MISSING PERMISSIONS (idempotent)
INSERT INTO public.permissions (code, name, category, description)
VALUES
  -- Blogs
  ('blogs.view',         'View Blogs',          'Blogs',       'View blog posts in admin CMS'),
  ('blogs.create',       'Create Blogs',        'Blogs',       'Create new blog posts'),
  ('blogs.update',       'Update Blogs',        'Blogs',       'Edit existing blog posts'),
  ('blogs.delete',       'Delete Blogs',        'Blogs',       'Delete blog posts'),
  ('blogs.publish',      'Publish Blogs',       'Blogs',       'Publish or unpublish blog posts'),
  -- Supervisors
  ('supervisors.view',   'View Supervisors',    'Supervisors', 'View list of supervisors and their reports'),
  ('supervisors.manage', 'Manage Supervisors',  'Supervisors', 'Edit supervisor records and assignments'),
  ('supervisors.invite', 'Invite Supervisors',  'Supervisors', 'Send onboarding invitations to supervisors'),
  ('supervisors.delete', 'Delete Supervisors',  'Supervisors', 'Remove supervisor records'),
  -- Ingredients
  ('ingredients.view',    'View Ingredient Tracker', 'Ingredients', 'View AI ingredient analysis results'),
  ('ingredients.analyze', 'Trigger Ingredient Analysis', 'Ingredients', 'Re-run AI analysis on submitted ingredients'),
  ('ingredients.manage',  'Manage Ingredient Tracker', 'Ingredients', 'Override AI classifications and risk levels'),
  -- Quotations
  ('quotations.view',    'View Quotations',     'Quotations', 'View quotations issued to clients'),
  ('quotations.create',  'Create Quotations',   'Quotations', 'Draft and prepare quotations'),
  ('quotations.send',    'Send Quotations',     'Quotations', 'Send quotations to clients via email'),
  ('quotations.approve', 'Approve Quotations',  'Quotations', 'Approve quotations before sending'),
  -- Invoices
  ('invoices.view',   'View Invoices',  'Invoices', 'View invoices and billing history'),
  ('invoices.create', 'Create Invoices','Invoices', 'Create invoices for clients'),
  ('invoices.send',   'Send Invoices',  'Invoices', 'Send invoices to clients via email'),
  ('invoices.void',   'Void Invoices',  'Invoices', 'Cancel or void existing invoices'),
  -- Payments
  ('payments.view',   'View Payments',  'Payments', 'View payment records'),
  ('payments.record', 'Record Payments','Payments', 'Manually record payments received'),
  ('payments.refund', 'Refund Payments','Payments', 'Process refunds for completed payments'),
  -- Dashboard
  ('dashboard.view',  'View Admin Dashboard', 'Dashboard', 'Baseline access to the admin dashboard')
ON CONFLICT (code) DO NOTHING;

-- 2) Fix display name typo
UPDATE public.admin_roles
SET display_name = 'Inspection Manager'
WHERE name = 'inspection_manager' AND display_name = 'inspection Manager';

-- 3) SEED DEFAULT PERMISSIONS PER ROLE (idempotent via NOT EXISTS)
-- Helper: insert role_permission if not exists
DO $$
DECLARE
  r_super_admin uuid;
  r_cido        uuid;
  r_finance     uuid;
  r_inspmgr     uuid;
  v_perm_code   text;
  v_perm_id     uuid;
  cido_perms    text[] := ARRAY[
    'dashboard.view',
    'applications.view','applications.update','applications.assign','applications.approve','applications.reject','applications.manage',
    'documentation.view','documentation.upload','documentation.update','documentation.approve',
    'inspections.view','inspections.schedule','inspections.update','inspections.manage','inspections.approve_report',
    'certificates.view','certificates.issue','certificates.update','certificates.revoke',
    'enforcement.view','enforcement.create','enforcement.update','enforcement.manage',
    'supervisors.view','blogs.view','audit_logs.view','reports.view','reports.export'
  ];
  finance_perms text[] := ARRAY[
    'dashboard.view',
    'applications.view',
    'certificates.view',
    'finance.view','finance.create','finance.update','finance.manage','finance.approve',
    'quotations.view','quotations.create','quotations.send','quotations.approve',
    'invoices.view','invoices.create','invoices.send','invoices.void',
    'payments.view','payments.record','payments.refund',
    'reports.view','reports.export'
  ];
  inspmgr_perms text[] := ARRAY[
    'dashboard.view',
    'applications.view','applications.assign',
    'inspections.view','inspections.schedule','inspections.create','inspections.update','inspections.manage','inspections.approve_report',
    'inspectors.view','inspectors.manage',
    'supervisors.view','supervisors.manage','supervisors.invite',
    'enforcement.view','enforcement.create','enforcement.manage',
    'audit_logs.view','reports.view','reports.export'
  ];
  super_perms text[];
BEGIN
  SELECT id INTO r_super_admin FROM public.admin_roles WHERE name='super_admin';
  SELECT id INTO r_cido        FROM public.admin_roles WHERE name='cido';
  SELECT id INTO r_finance     FROM public.admin_roles WHERE name='finance';
  SELECT id INTO r_inspmgr     FROM public.admin_roles WHERE name='inspection_manager';

  -- super_admin: grant ALL existing permissions
  IF r_super_admin IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_super_admin, p.id FROM public.permissions p
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- cido
  IF r_cido IS NOT NULL THEN
    FOREACH v_perm_code IN ARRAY cido_perms LOOP
      SELECT id INTO v_perm_id FROM public.permissions WHERE code=v_perm_code;
      IF v_perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (r_cido, v_perm_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- finance
  IF r_finance IS NOT NULL THEN
    FOREACH v_perm_code IN ARRAY finance_perms LOOP
      SELECT id INTO v_perm_id FROM public.permissions WHERE code=v_perm_code;
      IF v_perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (r_finance, v_perm_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- inspection_manager
  IF r_inspmgr IS NOT NULL THEN
    FOREACH v_perm_code IN ARRAY inspmgr_perms LOOP
      SELECT id INTO v_perm_id FROM public.permissions WHERE code=v_perm_code;
      IF v_perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (r_inspmgr, v_perm_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;

-- 4) WORKFLOW STAGE PERMISSIONS for Finance and Inspection Manager
-- Finance: relevant at SUBMITTED (issue invoice), APPROVED (final billing)
-- Inspection Manager: relevant at INSPECTION_SCHEDULED, INSPECTION_COMPLETED
DO $$
DECLARE
  r_finance uuid;
  r_inspmgr uuid;
  s_submitted uuid;
  s_approved  uuid;
  s_inspsched uuid;
  s_inspcomp  uuid;
  p_inv_view  uuid;
  p_inv_create uuid;
  p_inv_send  uuid;
  p_quo_create uuid;
  p_quo_send   uuid;
  p_finance_view uuid;
  p_insp_view uuid;
  p_insp_sched uuid;
  p_insp_manage uuid;
  p_insp_approve_report uuid;
  p_app_view uuid;
BEGIN
  SELECT id INTO r_finance  FROM public.admin_roles WHERE name='finance';
  SELECT id INTO r_inspmgr  FROM public.admin_roles WHERE name='inspection_manager';
  SELECT id INTO s_submitted FROM public.workflow_stages WHERE system_code='SUBMITTED';
  SELECT id INTO s_approved  FROM public.workflow_stages WHERE system_code='APPROVED';
  SELECT id INTO s_inspsched FROM public.workflow_stages WHERE system_code='INSPECTION_SCHEDULED';
  SELECT id INTO s_inspcomp  FROM public.workflow_stages WHERE system_code='INSPECTION_COMPLETED';

  SELECT id INTO p_inv_view    FROM public.permissions WHERE code='invoices.view';
  SELECT id INTO p_inv_create  FROM public.permissions WHERE code='invoices.create';
  SELECT id INTO p_inv_send    FROM public.permissions WHERE code='invoices.send';
  SELECT id INTO p_quo_create  FROM public.permissions WHERE code='quotations.create';
  SELECT id INTO p_quo_send    FROM public.permissions WHERE code='quotations.send';
  SELECT id INTO p_finance_view FROM public.permissions WHERE code='finance.view';
  SELECT id INTO p_insp_view   FROM public.permissions WHERE code='inspections.view';
  SELECT id INTO p_insp_sched  FROM public.permissions WHERE code='inspections.schedule';
  SELECT id INTO p_insp_manage FROM public.permissions WHERE code='inspections.manage';
  SELECT id INTO p_insp_approve_report FROM public.permissions WHERE code='inspections.approve_report';
  SELECT id INTO p_app_view    FROM public.permissions WHERE code='applications.view';

  -- Finance @ SUBMITTED
  IF r_finance IS NOT NULL AND s_submitted IS NOT NULL THEN
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id)
    SELECT r_finance, s_submitted, x FROM unnest(ARRAY[p_quo_create, p_quo_send, p_inv_create, p_inv_send, p_inv_view, p_finance_view, p_app_view]) x
    WHERE x IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  -- Finance @ APPROVED
  IF r_finance IS NOT NULL AND s_approved IS NOT NULL THEN
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id)
    SELECT r_finance, s_approved, x FROM unnest(ARRAY[p_inv_create, p_inv_send, p_inv_view, p_finance_view, p_app_view]) x
    WHERE x IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  -- Inspection Manager @ INSPECTION_SCHEDULED
  IF r_inspmgr IS NOT NULL AND s_inspsched IS NOT NULL THEN
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id)
    SELECT r_inspmgr, s_inspsched, x FROM unnest(ARRAY[p_insp_view, p_insp_sched, p_insp_manage, p_app_view]) x
    WHERE x IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  -- Inspection Manager @ INSPECTION_COMPLETED
  IF r_inspmgr IS NOT NULL AND s_inspcomp IS NOT NULL THEN
    INSERT INTO public.workflow_stage_permissions (role_id, stage_id, permission_id)
    SELECT r_inspmgr, s_inspcomp, x FROM unnest(ARRAY[p_insp_view, p_insp_manage, p_insp_approve_report, p_app_view]) x
    WHERE x IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;