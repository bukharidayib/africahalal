
-- 1. Harden is_admin_user to check for specific admin role names
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
      AND ar.name IN ('super_admin', 'admin', 'certification_officer', 'inspector_manager', 'support_officer', 'finance_officer', 'documentation_officer')
      AND EXISTS (
        SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = ar.id
      )
  )
$$;

-- 2. Add RESTRICTIVE policy on user_roles to prevent self-assignment
CREATE POLICY "Restrict user_roles writes to super_admins"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::admin_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::admin_role));

-- 3. Fix organizations RLS - drop the leaky policy and recreate correctly
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. For realtime chat security, add authorization policies on the realtime schema
-- Note: Supabase Realtime authorization is configured via RLS on the source tables.
-- The chat_messages SELECT policy already restricts to own sessions.
-- We need to ensure the Realtime publication only sends authorized rows.
-- This is already handled by the existing RLS on chat_messages and chat_sessions.
-- Adding an additional explicit check comment for documentation.
COMMENT ON TABLE public.chat_messages IS 'Chat messages with RLS restricting access to own sessions only. Realtime subscriptions are filtered by these same RLS policies.';
