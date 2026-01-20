-- =============================================
-- Phase 1: Admin Portal - Certification Authority System
-- Complete Database Schema
-- =============================================

-- STEP 1: Create Enums
-- =============================================

-- Admin Role Types
CREATE TYPE public.admin_role AS ENUM (
  'super_admin',
  'certification_officer', 
  'finance_officer',
  'it_system_auditor'
);

-- Application Status
CREATE TYPE public.application_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'awaiting_inspection',
  'inspection_complete',
  'pending_decision',
  'approved',
  'rejected',
  'suspended',
  'withdrawn'
);

-- Decision Types
CREATE TYPE public.decision_type AS ENUM (
  'request_additional_info',
  'issue_ncn',
  'accept_corrective_action',
  'reject_corrective_action',
  'recommend_approval',
  'recommend_rejection'
);

-- Certificate Status
CREATE TYPE public.certificate_status AS ENUM (
  'active',
  'suspended',
  'revoked',
  'expired'
);

-- NCN Severity
CREATE TYPE public.ncn_severity AS ENUM (
  'minor',
  'major',
  'critical'
);

-- Corrective Action Status
CREATE TYPE public.corrective_action_status AS ENUM (
  'pending',
  'under_review',
  'accepted',
  'rejected'
);

-- Approval Request Status  
CREATE TYPE public.approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Inspection Status
CREATE TYPE public.inspection_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

-- =============================================
-- STEP 2: Create Core Tables
-- =============================================

-- Profiles Table (User Information)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles Table (RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Organizations Table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  sector TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'South Africa',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Certification Applications Table
CREATE TABLE public.certification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  application_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  sector TEXT NOT NULL,
  status application_status NOT NULL DEFAULT 'draft',
  assigned_officer_id UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Application Status History (Immutable)
CREATE TABLE public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.certification_applications(id),
  from_status application_status,
  to_status application_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Application Documents
CREATE TABLE public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.certification_applications(id),
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Certification Decisions (Immutable)
CREATE TABLE public.certification_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.certification_applications(id),
  decision_type decision_type NOT NULL,
  officer_id UUID NOT NULL REFERENCES auth.users(id),
  reason_code TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approval Requests (Dual-Control)
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.certification_applications(id),
  recommender_id UUID NOT NULL REFERENCES auth.users(id),
  approver_id UUID REFERENCES auth.users(id),
  status approval_status NOT NULL DEFAULT 'pending',
  recommendation_notes TEXT,
  approval_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT different_approvers CHECK (recommender_id IS DISTINCT FROM approver_id)
);

-- Certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT UNIQUE NOT NULL,
  application_id UUID NOT NULL REFERENCES public.certification_applications(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  scope TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status certificate_status NOT NULL DEFAULT 'active',
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  qr_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dual_control CHECK (issued_by != approved_by)
);

-- Certificate History (Immutable)
CREATE TABLE public.certificate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id),
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inspectors
CREATE TABLE public.inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  inspector_number TEXT UNIQUE NOT NULL,
  qualifications TEXT[],
  regions TEXT[],
  specializations TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inspector Conflicts (Conflict of Interest)
CREATE TABLE public.inspector_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL REFERENCES public.inspectors(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  reason TEXT NOT NULL,
  declared_by UUID NOT NULL REFERENCES auth.users(id),
  declared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inspector_id, organization_id)
);

-- Inspections
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.certification_applications(id),
  inspector_id UUID NOT NULL REFERENCES public.inspectors(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status inspection_status NOT NULL DEFAULT 'scheduled',
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inspection Reports (Immutable after submission)
CREATE TABLE public.inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID UNIQUE NOT NULL REFERENCES public.inspections(id),
  findings JSONB NOT NULL DEFAULT '{}',
  overall_assessment TEXT,
  recommendations TEXT,
  inspector_attestation BOOLEAN NOT NULL DEFAULT false,
  attestation_timestamp TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Non-Conformance Notices
CREATE TABLE public.non_conformance_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncn_number TEXT UNIQUE NOT NULL,
  application_id UUID NOT NULL REFERENCES public.certification_applications(id),
  inspection_id UUID REFERENCES public.inspections(id),
  severity ncn_severity NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Corrective Actions
CREATE TABLE public.corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncn_id UUID NOT NULL REFERENCES public.non_conformance_notices(id),
  response TEXT NOT NULL,
  evidence_files TEXT[],
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status corrective_action_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ
);

-- Audit Logs (Immutable - Append Only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  reason_code TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- STEP 3: Create Indexes for Performance
-- =============================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_applications_status ON public.certification_applications(status);
CREATE INDEX idx_applications_assigned_officer ON public.certification_applications(assigned_officer_id);
CREATE INDEX idx_applications_organization ON public.certification_applications(organization_id);
CREATE INDEX idx_certificates_status ON public.certificates(status);
CREATE INDEX idx_certificates_organization ON public.certificates(organization_id);
CREATE INDEX idx_inspections_status ON public.inspections(status);
CREATE INDEX idx_inspections_inspector ON public.inspections(inspector_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- =============================================
-- STEP 4: Create Security Definer Functions
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role admin_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Validate dual approval (different users)
CREATE OR REPLACE FUNCTION public.validate_dual_approval(
  _application_id UUID,
  _approver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recommender_id UUID;
BEGIN
  SELECT recommender_id INTO _recommender_id
  FROM public.approval_requests
  WHERE application_id = _application_id AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;
  
  RETURN _recommender_id IS NOT NULL AND _recommender_id != _approver_id;
END;
$$;

-- Audit logging function
CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _reason_code TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
  _user_role TEXT;
  _log_id UUID;
BEGIN
  _user_id := auth.uid();
  
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  SELECT role::TEXT INTO _user_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  
  INSERT INTO public.audit_logs (user_id, user_email, user_role, action, resource_type, resource_id, reason_code, metadata)
  VALUES (_user_id, COALESCE(_user_email, 'system'), COALESCE(_user_role, 'unknown'), _action, _resource_type, _resource_id, _reason_code, _metadata)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Generate application number
CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
  _app_num TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM 9) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.certification_applications
  WHERE application_number LIKE 'AHIS-' || _year || '-%';
  
  _app_num := 'AHIS-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
  RETURN _app_num;
END;
$$;

-- Generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
  _cert_num TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 10) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.certificates
  WHERE certificate_number LIKE 'AHIS-C-' || _year || '-%';
  
  _cert_num := 'AHIS-C-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
  RETURN _cert_num;
END;
$$;

-- Generate NCN number
CREATE OR REPLACE FUNCTION public.generate_ncn_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
  _ncn_num TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ncn_number FROM 11) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.non_conformance_notices
  WHERE ncn_number LIKE 'AHIS-NCN-' || _year || '-%';
  
  _ncn_num := 'AHIS-NCN-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
  RETURN _ncn_num;
END;
$$;

-- =============================================
-- STEP 5: Create Triggers
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.certification_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspectors_updated_at
  BEFORE UPDATE ON public.inspectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Log application status changes
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.application_status_history (application_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON public.certification_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_status_change();

-- =============================================
-- STEP 6: Enable Row Level Security
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_conformance_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 7: Create RLS Policies
-- =============================================

-- Profiles: Users can view own, admins can view all
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin_user(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "System can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- User Roles: Only super_admin can manage
CREATE POLICY "Admins can view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Super admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Organizations: Admins can manage
CREATE POLICY "Admins can view organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Applications: Officers see assigned, super_admin/cert_officer see all
CREATE POLICY "Officers view applications"
ON public.certification_applications FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
  OR assigned_officer_id = auth.uid()
);

CREATE POLICY "Officers can insert applications"
ON public.certification_applications FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

CREATE POLICY "Officers can update applications"
ON public.certification_applications FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
  OR assigned_officer_id = auth.uid()
);

-- Application Status History: View only, insert via trigger
CREATE POLICY "Admins can view status history"
ON public.application_status_history FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "System can insert status history"
ON public.application_status_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- Application Documents
CREATE POLICY "Admins can view documents"
ON public.application_documents FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can insert documents"
ON public.application_documents FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- Certification Decisions: Append only
CREATE POLICY "Admins can view decisions"
ON public.certification_decisions FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can insert decisions"
ON public.certification_decisions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

-- Approval Requests
CREATE POLICY "Admins can view approval requests"
ON public.approval_requests FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can insert approval requests"
ON public.approval_requests FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

CREATE POLICY "Officers can update approval requests"
ON public.approval_requests FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

-- Certificates
CREATE POLICY "Admins can view certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can insert certificates"
ON public.certificates FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

CREATE POLICY "Officers can update certificates"
ON public.certificates FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

-- Certificate History: Append only
CREATE POLICY "Admins can view certificate history"
ON public.certificate_history FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can insert certificate history"
ON public.certificate_history FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- Inspectors
CREATE POLICY "Admins can view inspectors"
ON public.inspectors FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Super admins can manage inspectors"
ON public.inspectors FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Inspector Conflicts
CREATE POLICY "Admins can view conflicts"
ON public.inspector_conflicts FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage conflicts"
ON public.inspector_conflicts FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Inspections
CREATE POLICY "Admins can view inspections"
ON public.inspections FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can manage inspections"
ON public.inspections FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

-- Inspection Reports
CREATE POLICY "Admins can view inspection reports"
ON public.inspection_reports FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can manage inspection reports"
ON public.inspection_reports FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Non-Conformance Notices
CREATE POLICY "Admins can view NCNs"
ON public.non_conformance_notices FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Officers can manage NCNs"
ON public.non_conformance_notices FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'certification_officer')
);

-- Corrective Actions
CREATE POLICY "Admins can view corrective actions"
ON public.corrective_actions FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Users can manage corrective actions"
ON public.corrective_actions FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Audit Logs: Append only, view for IT auditors and super admins
CREATE POLICY "Insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "IT auditors and super admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'it_system_auditor')
  OR public.has_role(auth.uid(), 'super_admin')
);