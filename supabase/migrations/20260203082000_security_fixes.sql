-- =============================================
-- Security Fixes for RLS Policies
-- =============================================

-- 1. Tighten Profiles RLS
-- Split the policy to explicitly distinguish between owner access and administrative access.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));


-- 2. Restrict Audit Logs to Server-Side Only
-- Removing direct INSERT capability from the client to prevent log manipulation.
-- Audit logs should be created exclusively via the 'log_audit' security definer function.
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Insert audit logs" ON public.audit_logs;


-- 3. Correct Organizations Visibility
-- Remove the 'OR true' condition that inadvertently exposed identifying business data.
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT 
TO authenticated
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Ensure Admins still have separate access (this should already exist but adding for completeness)
DROP POLICY IF EXISTS "Admins can view organizations" ON public.organizations;
CREATE POLICY "Admins can view organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));
