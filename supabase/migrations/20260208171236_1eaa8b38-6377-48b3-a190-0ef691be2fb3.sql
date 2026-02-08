
-- =============================================
-- PHASE 1: Enterprise RBAC + Workflow Schema
-- =============================================

-- 1a. Add status column to admin_roles
ALTER TABLE public.admin_roles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));

-- 1b. Create workflow_stages table (system-defined certification workflow)
CREATE TABLE public.workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  system_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  stage_order integer NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

-- Only admins can view workflow stages
CREATE POLICY "Admins can view workflow stages"
  ON public.workflow_stages FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- 1c. Create workflow_stage_permissions table
CREATE TABLE public.workflow_stage_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stage_id, role_id, permission_id)
);

ALTER TABLE public.workflow_stage_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stage permissions"
  ON public.workflow_stage_permissions FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Super admins can manage stage permissions"
  ON public.workflow_stage_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::admin_role));

-- 1d. Seed workflow stages
INSERT INTO public.workflow_stages (name, system_code, display_name, stage_order, description) VALUES
  ('application_submission', 'APPLICATION', 'Application Submission', 1, 'Initial application submission and document upload'),
  ('documentation_review', 'DOC_REVIEW', 'Documentation Review', 2, 'Review of submitted documentation for completeness and compliance'),
  ('inspection', 'INSPECTION', 'Inspection', 3, 'On-site or remote inspection of facilities and processes'),
  ('shariah_review', 'SHARIAH', 'Shariah Review', 4, 'Shariah compliance review by qualified scholars'),
  ('certificate_issuance', 'CERT_ISSUE', 'Certificate Issuance', 5, 'Final approval and certificate generation'),
  ('surveillance_renewal', 'SURVEILLANCE', 'Surveillance & Renewal', 6, 'Ongoing surveillance audits and certificate renewal');

-- 1e. Seed new permissions for missing modules
INSERT INTO public.permissions (code, name, category, description) VALUES
  ('documentation.view', 'View Documentation', 'Documentation', 'View submitted documents and review status'),
  ('documentation.approve', 'Approve Documentation', 'Documentation', 'Approve or reject submitted documentation'),
  ('documentation.upload', 'Upload Documentation', 'Documentation', 'Upload new documentation to applications'),
  ('shariah_review.view', 'View Shariah Reviews', 'Shariah Review', 'View Shariah review submissions and results'),
  ('shariah_review.submit', 'Submit Shariah Review', 'Shariah Review', 'Submit a Shariah compliance review'),
  ('shariah_review.approve', 'Approve Shariah Review', 'Shariah Review', 'Approve or reject a Shariah review'),
  ('finance.view', 'View Finance', 'Finance', 'View financial records and fee status'),
  ('finance.manage', 'Manage Finance', 'Finance', 'Manage fees, payments, and financial records'),
  ('finance.approve', 'Approve Finance', 'Finance', 'Approve financial transactions and fee waivers'),
  ('reports.view', 'View Reports', 'Reports', 'View system reports and analytics'),
  ('reports.export', 'Export Reports', 'Reports', 'Export reports in various formats')
ON CONFLICT (code) DO NOTHING;

-- 1f. Add unique constraint for one-user-one-role
-- First remove any duplicate user_id entries (keep latest)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.assigned_at < b.assigned_at;

ALTER TABLE public.user_roles ADD CONSTRAINT unique_user_single_role UNIQUE (user_id);

-- 1g. Update is_admin_user to check role status
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.admin_roles ar ON ar.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND ar.status = 'active'
  )
$$;

-- 1h. Create workflow validation function
CREATE OR REPLACE FUNCTION public.can_perform_workflow_action(
  _user_id uuid,
  _stage_code text,
  _permission_code text
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  _role_id uuid;
  _role_status text;
BEGIN
  -- 1. Get user's role and check it's active
  SELECT ur.role_id, ar.status INTO _role_id, _role_status
  FROM public.user_roles ur
  JOIN public.admin_roles ar ON ar.id = ur.role_id
  WHERE ur.user_id = _user_id
  LIMIT 1;

  IF _role_id IS NULL OR _role_status != 'active' THEN
    RETURN false;
  END IF;

  -- 2. Check user has the base permission
  IF NOT public.has_permission(_user_id, _permission_code) THEN
    RETURN false;
  END IF;

  -- 3. Check role is allowed at this workflow stage
  RETURN EXISTS (
    SELECT 1
    FROM public.workflow_stage_permissions wsp
    JOIN public.workflow_stages ws ON ws.id = wsp.stage_id
    JOIN public.permissions p ON p.id = wsp.permission_id
    WHERE wsp.role_id = _role_id
      AND ws.system_code = _stage_code
      AND ws.is_active = true
      AND p.code = _permission_code
  );
END;
$$;

-- 1i. Create function to check self-approval prevention
CREATE OR REPLACE FUNCTION public.check_self_approval(
  _application_id uuid,
  _user_id uuid,
  _current_stage text
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  _prev_actor uuid;
BEGIN
  -- Get who performed the previous stage action
  SELECT ash.changed_by INTO _prev_actor
  FROM public.application_status_history ash
  WHERE ash.application_id = _application_id
  ORDER BY ash.created_at DESC
  LIMIT 1;

  -- If no previous actor, allow (first stage)
  IF _prev_actor IS NULL THEN
    RETURN true;
  END IF;

  -- Prevent same user from acting on consecutive stages
  RETURN _prev_actor != _user_id;
END;
$$;

-- 1j. Create function to validate forward-only stage progression
CREATE OR REPLACE FUNCTION public.validate_stage_progression(
  _from_stage text,
  _to_stage text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workflow_stages ws_from, public.workflow_stages ws_to
    WHERE ws_from.system_code = _from_stage
      AND ws_to.system_code = _to_stage
      AND ws_to.stage_order > ws_from.stage_order
      AND ws_from.is_active = true
      AND ws_to.is_active = true
  )
$$;
