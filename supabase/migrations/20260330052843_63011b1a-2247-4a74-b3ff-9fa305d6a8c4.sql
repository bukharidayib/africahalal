
-- Fix is_admin_user to only grant admin status for roles that are explicitly admin-level
-- By checking that the role has at least one permission assigned (non-trivial role)
-- and the role status is active
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.admin_roles ar ON ar.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND ar.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = ar.id
      )
  )
$$;
