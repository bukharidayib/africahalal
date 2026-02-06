-- 0. Drop dependent policies that rely on the 'role' column
-- We must drop these before we can drop the column
DROP POLICY IF EXISTS "Admin full access for blogs" ON public.blogs;
DROP POLICY IF EXISTS "Admin full access for supervisors" ON public.organization_supervisors;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super Admins can manage user roles" ON public.user_roles;

-- 1. Ensure system roles exist in admin_roles
INSERT INTO public.admin_roles (name, display_name, description, is_system_role)
VALUES 
  ('super_admin', 'Super Administrator', 'Full access to all system modules', true),
  ('certification_officer', 'Certification Officer', 'Manage applications and inspections', true),
  ('finance_officer', 'Finance Officer', 'Manage billing and payments', true),
  ('it_system_auditor', 'IT System Auditor', 'View audit logs and system settings', true),
  ('support_agent', 'Support Agent', 'Manage support tickets', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Alter user_roles table
-- Add new role_id column
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.admin_roles(id);

-- 3. Migrate existing data
-- Update role_id based on the enum role
UPDATE public.user_roles ur
SET role_id = ar.id
FROM public.admin_roles ar
WHERE ur.role::text = ar.name;

-- 4. Enforce constraints
-- Make role_id mandatory (only after data migration)
ALTER TABLE public.user_roles 
ALTER COLUMN role_id SET NOT NULL;

-- 5. Drop old enum column
ALTER TABLE public.user_roles 
DROP COLUMN role;

-- 6. Enforce Single Role Per User
-- Add unique constraint on user_id to ensure one user has only one role
ALTER TABLE public.user_roles
ADD CONSTRAINT unique_user_role UNIQUE (user_id);

-- 7. Add RLS Policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Re-create User Roles Policies
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = auth.uid() 
    AND (ar.name = 'super_admin' OR ar.is_system_role = true) 
  )
  OR
  auth.uid() = user_id -- Users can see their own role
);

CREATE POLICY "Super Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = auth.uid() 
    AND ar.name = 'super_admin'
  )
);

-- Re-create Blog Policies (New Logic)
CREATE POLICY "Admin full access for blogs" 
ON public.blogs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = auth.uid() 
    AND ar.is_system_role = true
  )
);

-- Re-create Supervisor Policies (New Logic)
CREATE POLICY "Admin full access for supervisors" 
ON public.organization_supervisors 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.admin_roles ar ON ur.role_id = ar.id
    WHERE ur.user_id = auth.uid() 
    AND ar.is_system_role = true
  )
);
