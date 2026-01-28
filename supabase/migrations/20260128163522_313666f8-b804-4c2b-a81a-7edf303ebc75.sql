-- 1. Permissions table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view permissions" ON public.permissions
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

-- 2. Admin roles table (separate from user_roles assignment)
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles" ON public.admin_roles
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Super admins can manage roles" ON public.admin_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 3. Role-Permission mapping
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role permissions" ON public.role_permissions
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Super admins can manage role permissions" ON public.role_permissions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Seed permissions
INSERT INTO public.permissions (code, name, category) VALUES
('applications.view', 'View Applications', 'Applications'),
('applications.manage', 'Manage Applications', 'Applications'),
('applications.assign', 'Assign Officers', 'Applications'),
('certificates.view', 'View Certificates', 'Certificates'),
('certificates.issue', 'Issue Certificates', 'Certificates'),
('certificates.revoke', 'Revoke Certificates', 'Certificates'),
('inspections.view', 'View Inspections', 'Inspections'),
('inspections.schedule', 'Schedule Inspections', 'Inspections'),
('inspections.manage', 'Manage Inspections', 'Inspections'),
('inspectors.view', 'View Inspectors', 'Inspectors'),
('inspectors.manage', 'Manage Inspectors', 'Inspectors'),
('enforcement.view', 'View Enforcement', 'Enforcement'),
('enforcement.manage', 'Manage NCNs', 'Enforcement'),
('support.view', 'View Support', 'Support'),
('support.respond', 'Respond to Support', 'Support'),
('support.manage', 'Manage Support', 'Support'),
('audit_logs.view', 'View Audit Logs', 'System'),
('users.view', 'View Users', 'System'),
('users.manage', 'Manage Users', 'System'),
('roles.manage', 'Manage Roles', 'System'),
('settings.manage', 'Manage Settings', 'System');

-- Seed system roles
INSERT INTO public.admin_roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', true),
('certification_officer', 'Certification Officer', 'Manages applications, inspections, and certificates', true),
('finance_officer', 'Finance Officer', 'View-only access to applications and certificates', true),
('it_system_auditor', 'IT System Auditor', 'Audit logs and read-only compliance access', true),
('support_agent', 'Support Agent', 'Handles support tickets and live chats', true);

-- Map super_admin to all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, permissions p
WHERE r.name = 'super_admin';

-- Map certification_officer permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, permissions p
WHERE r.name = 'certification_officer'
AND p.code IN ('applications.view', 'applications.manage', 'applications.assign', 
               'certificates.view', 'certificates.issue', 
               'inspections.view', 'inspections.schedule', 'inspections.manage',
               'inspectors.view', 'enforcement.view', 'enforcement.manage');

-- Map finance_officer permissions  
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, permissions p
WHERE r.name = 'finance_officer'
AND p.code IN ('applications.view', 'certificates.view');

-- Map it_system_auditor permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, permissions p
WHERE r.name = 'it_system_auditor'
AND p.code IN ('applications.view', 'certificates.view', 'inspections.view', 
               'enforcement.view', 'audit_logs.view');

-- Map support_agent permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, permissions p
WHERE r.name = 'support_agent'
AND p.code IN ('support.view', 'support.respond', 'applications.view');

-- Function to get user permissions from database
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(DISTINCT p.code)
  FROM user_roles ur
  JOIN admin_roles ar ON ar.name = ur.role::TEXT
  JOIN role_permissions rp ON rp.role_id = ar.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN admin_roles ar ON ar.name = ur.role::TEXT
    JOIN role_permissions rp ON rp.role_id = ar.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.code = _permission_code
  )
$$;