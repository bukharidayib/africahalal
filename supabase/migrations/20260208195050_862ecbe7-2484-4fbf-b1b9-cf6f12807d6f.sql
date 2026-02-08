
-- =============================================
-- 1. Convert all roles to Custom (no more System)
-- =============================================
UPDATE public.admin_roles SET is_system_role = false;

-- =============================================
-- 2. Fix RLS policies that reference is_system_role
-- =============================================

-- Fix blogs RLS policy
DROP POLICY IF EXISTS "Admin full access for blogs" ON public.blogs;
CREATE POLICY "Admin full access for blogs"
  ON public.blogs
  FOR ALL
  USING (public.is_admin_user(auth.uid()));

-- Fix organization_supervisors RLS policy
DROP POLICY IF EXISTS "Admin full access for supervisors" ON public.organization_supervisors;
CREATE POLICY "Admin full access for supervisors"
  ON public.organization_supervisors
  FOR ALL
  USING (public.is_admin_user(auth.uid()));

-- =============================================
-- 3. Add action_type column to permissions
-- =============================================
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'special'
  CHECK (action_type IN ('create', 'read', 'update', 'delete', 'special'));

-- =============================================
-- 4. Update existing permissions with correct action_type + categories
-- =============================================

-- Applications module
UPDATE public.permissions SET action_type = 'read', category = 'Applications' WHERE code = 'applications.view';
UPDATE public.permissions SET action_type = 'special', category = 'Applications' WHERE code = 'applications.manage';
UPDATE public.permissions SET action_type = 'special', category = 'Applications' WHERE code = 'applications.assign';

-- Certificates module
UPDATE public.permissions SET action_type = 'read', category = 'Certificates' WHERE code = 'certificates.view';
UPDATE public.permissions SET action_type = 'special', category = 'Certificates' WHERE code = 'certificates.issue';
UPDATE public.permissions SET action_type = 'special', category = 'Certificates' WHERE code = 'certificates.revoke';

-- Inspections module (merge Inspectors into Inspections)
UPDATE public.permissions SET action_type = 'read', category = 'Inspections' WHERE code = 'inspections.view';
UPDATE public.permissions SET action_type = 'special', category = 'Inspections' WHERE code = 'inspections.manage';
UPDATE public.permissions SET action_type = 'special', category = 'Inspections' WHERE code = 'inspections.schedule';

-- Enforcement module
UPDATE public.permissions SET action_type = 'read', category = 'Enforcement' WHERE code = 'enforcement.view';
UPDATE public.permissions SET action_type = 'special', category = 'Enforcement' WHERE code = 'enforcement.manage';

-- Support module
UPDATE public.permissions SET action_type = 'read', category = 'Support' WHERE code = 'support.view';
UPDATE public.permissions SET action_type = 'special', category = 'Support' WHERE code = 'support.respond';
UPDATE public.permissions SET action_type = 'special', category = 'Support' WHERE code = 'support.manage';

-- Users module (split from Users & Roles)
UPDATE public.permissions SET action_type = 'special', category = 'Users' WHERE code = 'users.manage';

-- Roles module (split from Users & Roles)
UPDATE public.permissions SET action_type = 'special', category = 'Roles' WHERE code = 'roles.manage';

-- Audit module
UPDATE public.permissions SET action_type = 'read', category = 'Audit' WHERE code = 'audit_logs.view';

-- System module
UPDATE public.permissions SET action_type = 'special', category = 'System' WHERE code = 'settings.manage';

-- Documentation module
UPDATE public.permissions SET action_type = 'read', category = 'Documentation' WHERE code = 'documentation.view';
UPDATE public.permissions SET action_type = 'special', category = 'Documentation' WHERE code = 'documentation.approve';
UPDATE public.permissions SET action_type = 'special', category = 'Documentation' WHERE code = 'documentation.upload';

-- Shariah Review module
UPDATE public.permissions SET action_type = 'read', category = 'Shariah Review' WHERE code = 'shariah_review.view';
UPDATE public.permissions SET action_type = 'special', category = 'Shariah Review' WHERE code = 'shariah_review.submit';
UPDATE public.permissions SET action_type = 'special', category = 'Shariah Review' WHERE code = 'shariah_review.approve';

-- Finance module
UPDATE public.permissions SET action_type = 'read', category = 'Finance' WHERE code = 'finance.view';
UPDATE public.permissions SET action_type = 'special', category = 'Finance' WHERE code = 'finance.manage';
UPDATE public.permissions SET action_type = 'special', category = 'Finance' WHERE code = 'finance.approve';

-- Reports module
UPDATE public.permissions SET action_type = 'read', category = 'Reports' WHERE code = 'reports.view';
UPDATE public.permissions SET action_type = 'special', category = 'Reports' WHERE code = 'reports.export';

-- =============================================
-- 5. Insert missing CRUD permissions for all modules
-- =============================================

-- Applications: create, update, delete, approve, reject
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('applications.create', 'Create Applications', 'Applications', 'Create new certification applications', 'create'),
  ('applications.update', 'Update Applications', 'Applications', 'Modify existing applications', 'update'),
  ('applications.delete', 'Delete Applications', 'Applications', 'Remove applications from the system', 'delete'),
  ('applications.approve', 'Approve Applications', 'Applications', 'Approve certification applications', 'special'),
  ('applications.reject', 'Reject Applications', 'Applications', 'Reject certification applications', 'special')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Documentation: create, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('documentation.create', 'Create Documentation', 'Documentation', 'Upload new documents', 'create'),
  ('documentation.update', 'Update Documentation', 'Documentation', 'Modify existing documents', 'update'),
  ('documentation.delete', 'Delete Documentation', 'Documentation', 'Remove documents from the system', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Inspections: create, update, delete, approve_report
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('inspections.create', 'Create Inspections', 'Inspections', 'Create new inspection records', 'create'),
  ('inspections.update', 'Update Inspections', 'Inspections', 'Modify existing inspections', 'update'),
  ('inspections.delete', 'Delete Inspections', 'Inspections', 'Remove inspection records', 'delete'),
  ('inspections.approve_report', 'Approve Reports', 'Inspections', 'Approve inspection reports', 'special')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Shariah Review: create, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('shariah_review.create', 'Create Reviews', 'Shariah Review', 'Create new Shariah review records', 'create'),
  ('shariah_review.update', 'Update Reviews', 'Shariah Review', 'Modify Shariah review records', 'update'),
  ('shariah_review.delete', 'Delete Reviews', 'Shariah Review', 'Remove Shariah review records', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Finance: create, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('finance.create', 'Create Finance Records', 'Finance', 'Create new financial entries', 'create'),
  ('finance.update', 'Update Finance Records', 'Finance', 'Modify financial entries', 'update'),
  ('finance.delete', 'Delete Finance Records', 'Finance', 'Remove financial entries', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Certificates: create, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('certificates.create', 'Create Certificates', 'Certificates', 'Create new certificate records', 'create'),
  ('certificates.update', 'Update Certificates', 'Certificates', 'Modify certificate records', 'update'),
  ('certificates.delete', 'Delete Certificates', 'Certificates', 'Remove certificate records', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Enforcement: create, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('enforcement.create', 'Create Enforcement', 'Enforcement', 'Create enforcement actions and NCNs', 'create'),
  ('enforcement.update', 'Update Enforcement', 'Enforcement', 'Modify enforcement records', 'update'),
  ('enforcement.delete', 'Delete Enforcement', 'Enforcement', 'Remove enforcement records', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Support: create, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('support.create', 'Create Support Items', 'Support', 'Create support tickets and sessions', 'create'),
  ('support.update', 'Update Support Items', 'Support', 'Modify support tickets and sessions', 'update'),
  ('support.delete', 'Delete Support Items', 'Support', 'Remove support records', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Users: create, view, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('users.create', 'Create Users', 'Users', 'Create new user accounts', 'create'),
  ('users.view', 'View Users', 'Users', 'View user accounts and profiles', 'read'),
  ('users.update', 'Update Users', 'Users', 'Modify user account details', 'update'),
  ('users.delete', 'Delete Users', 'Users', 'Remove user accounts', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Roles: create, view, update, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('roles.create', 'Create Roles', 'Roles', 'Create new admin roles', 'create'),
  ('roles.view', 'View Roles', 'Roles', 'View roles and permission assignments', 'read'),
  ('roles.update', 'Update Roles', 'Roles', 'Modify role configurations', 'update'),
  ('roles.delete', 'Delete Roles', 'Roles', 'Remove admin roles', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Reports: create, delete
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('reports.create', 'Create Reports', 'Reports', 'Generate new reports', 'create'),
  ('reports.delete', 'Delete Reports', 'Reports', 'Remove generated reports', 'delete')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- System: view, update
INSERT INTO public.permissions (code, name, category, description, action_type)
VALUES
  ('settings.view', 'View Settings', 'System', 'View system settings and configuration', 'read'),
  ('settings.update', 'Update Settings', 'System', 'Modify system settings', 'update')
ON CONFLICT (code) DO UPDATE SET action_type = EXCLUDED.action_type, category = EXCLUDED.category, description = EXCLUDED.description;

-- Audit: (already has view, no CRUD needed since audit logs are read-only by design)

-- =============================================
-- 6. Update descriptions for existing permissions  
-- =============================================
UPDATE public.permissions SET description = 'View all certification applications' WHERE code = 'applications.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Full management access to applications' WHERE code = 'applications.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'Assign officers to applications' WHERE code = 'applications.assign' AND description IS NULL;
UPDATE public.permissions SET description = 'View all certificates' WHERE code = 'certificates.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Issue new certificates' WHERE code = 'certificates.issue' AND description IS NULL;
UPDATE public.permissions SET description = 'Revoke active certificates' WHERE code = 'certificates.revoke' AND description IS NULL;
UPDATE public.permissions SET description = 'View inspection records' WHERE code = 'inspections.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Full management of inspections' WHERE code = 'inspections.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'Schedule new inspections' WHERE code = 'inspections.schedule' AND description IS NULL;
UPDATE public.permissions SET description = 'View enforcement actions and NCNs' WHERE code = 'enforcement.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Manage enforcement actions' WHERE code = 'enforcement.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'View support tickets and chats' WHERE code = 'support.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Respond to support inquiries' WHERE code = 'support.respond' AND description IS NULL;
UPDATE public.permissions SET description = 'Full management of support system' WHERE code = 'support.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'Full management of user accounts' WHERE code = 'users.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'Full management of admin roles' WHERE code = 'roles.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'View system audit logs' WHERE code = 'audit_logs.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Manage system configuration' WHERE code = 'settings.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'View uploaded documents' WHERE code = 'documentation.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Approve submitted documents' WHERE code = 'documentation.approve' AND description IS NULL;
UPDATE public.permissions SET description = 'Upload documents to applications' WHERE code = 'documentation.upload' AND description IS NULL;
UPDATE public.permissions SET description = 'View Shariah review records' WHERE code = 'shariah_review.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Submit items for Shariah review' WHERE code = 'shariah_review.submit' AND description IS NULL;
UPDATE public.permissions SET description = 'Approve Shariah review decisions' WHERE code = 'shariah_review.approve' AND description IS NULL;
UPDATE public.permissions SET description = 'View financial records' WHERE code = 'finance.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Manage financial operations' WHERE code = 'finance.manage' AND description IS NULL;
UPDATE public.permissions SET description = 'Approve financial transactions' WHERE code = 'finance.approve' AND description IS NULL;
UPDATE public.permissions SET description = 'View generated reports' WHERE code = 'reports.view' AND description IS NULL;
UPDATE public.permissions SET description = 'Export reports to files' WHERE code = 'reports.export' AND description IS NULL;
