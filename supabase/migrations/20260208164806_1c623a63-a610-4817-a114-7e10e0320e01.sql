
-- Step 1: Fix get_user_role to use role_id join instead of non-existent role column
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT ar.name
  FROM public.user_roles ur
  JOIN public.admin_roles ar ON ar.id = ur.role_id
  WHERE ur.user_id = _user_id
  LIMIT 1
$$;

-- Step 2: Fix has_role to use role_id join instead of non-existent role column
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role admin_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.admin_roles ar ON ar.id = ur.role_id
    WHERE ur.user_id = _user_id AND ar.name = _role::text
  )
$$;

-- Step 3: Fix is_admin_user to use role_id join
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Step 4: Fix get_user_permissions to use role_id join
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT ARRAY_AGG(DISTINCT p.code)
  FROM user_roles ur
  JOIN admin_roles ar ON ar.id = ur.role_id
  JOIN role_permissions rp ON rp.role_id = ar.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id
$$;

-- Step 5: Fix has_permission to use role_id join
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN admin_roles ar ON ar.id = ur.role_id
    JOIN role_permissions rp ON rp.role_id = ar.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.code = _permission_code
  )
$$;

-- Step 6: Fix assign_admin_role to use role_id
CREATE OR REPLACE FUNCTION public.assign_admin_role(_email text, _role admin_role)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _current_user_role TEXT;
  _target_role_id UUID;
BEGIN
  -- Check if caller is super_admin using fixed function
  SELECT ar.name INTO _current_user_role 
  FROM public.user_roles ur
  JOIN public.admin_roles ar ON ar.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  LIMIT 1;
  
  IF _current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can assign roles';
  END IF;
  
  -- Find user by email in profiles
  SELECT id INTO _user_id FROM public.profiles WHERE email = _email;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. User must sign up first.', _email;
  END IF;

  -- Find the role_id for the given role name
  SELECT id INTO _target_role_id FROM public.admin_roles WHERE name = _role::text;
  
  IF _target_role_id IS NULL THEN
    RAISE EXCEPTION 'Role % not found in admin_roles table.', _role;
  END IF;
  
  -- Insert role using role_id
  INSERT INTO public.user_roles (user_id, role_id, assigned_by)
  VALUES (_user_id, _target_role_id, auth.uid())
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RETURN 'Role ' || _role || ' assigned to ' || _email;
END;
$$;

-- Step 7: Fix log_audit to use role_id join
CREATE OR REPLACE FUNCTION public.log_audit(_action text, _resource_type text, _resource_id uuid DEFAULT NULL::uuid, _reason_code text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
  _user_role TEXT;
  _log_id UUID;
BEGIN
  _user_id := auth.uid();
  
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  SELECT ar.name INTO _user_role 
  FROM public.user_roles ur
  JOIN public.admin_roles ar ON ar.id = ur.role_id
  WHERE ur.user_id = _user_id 
  LIMIT 1;
  
  INSERT INTO public.audit_logs (user_id, user_email, user_role, action, resource_type, resource_id, reason_code, metadata)
  VALUES (_user_id, COALESCE(_user_email, 'system'), COALESCE(_user_role, 'unknown'), _action, _resource_type, _resource_id, _reason_code, _metadata)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Step 8: Fix recursive RLS policies on user_roles
-- Drop the two problematic self-referencing policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super Admins can manage user roles" ON public.user_roles;

-- Recreate them using SECURITY DEFINER functions (no recursion)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_admin_user(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Super Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::admin_role));
