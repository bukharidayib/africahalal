
-- ============================================================
-- Fix: Replace hardcoded has_role() RLS policies with
--      permission-based has_permission() checks so that
--      any custom dynamic role (e.g. cido) gets access
--      based on its assigned permissions, not its name.
-- ============================================================

-- ── certification_applications ──────────────────────────────
DROP POLICY IF EXISTS "Officers view applications" ON public.certification_applications;
DROP POLICY IF EXISTS "Officers can update applications" ON public.certification_applications;
DROP POLICY IF EXISTS "Officers can insert applications" ON public.certification_applications;

CREATE POLICY "Admins can view applications"
  ON public.certification_applications FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Users with permission can update applications"
  ON public.certification_applications FOR UPDATE
  USING (has_permission(auth.uid(), 'applications.update'));

CREATE POLICY "Users with permission can insert applications"
  ON public.certification_applications FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'applications.create'));

-- ── inspections ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Officers can manage inspections" ON public.inspections;

CREATE POLICY "Users with permission can manage inspections"
  ON public.inspections FOR ALL
  USING (has_permission(auth.uid(), 'inspections.manage'))
  WITH CHECK (has_permission(auth.uid(), 'inspections.manage'));

-- ── non_conformance_notices ──────────────────────────────────
DROP POLICY IF EXISTS "Officers can manage NCNs" ON public.non_conformance_notices;

CREATE POLICY "Users with permission can manage NCNs"
  ON public.non_conformance_notices FOR ALL
  USING (has_permission(auth.uid(), 'enforcement.manage'))
  WITH CHECK (has_permission(auth.uid(), 'enforcement.manage'));

-- ── approval_requests ────────────────────────────────────────
DROP POLICY IF EXISTS "Officers can insert approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Officers can update approval requests" ON public.approval_requests;

CREATE POLICY "Users with permission can insert approval requests"
  ON public.approval_requests FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'applications.approve'));

CREATE POLICY "Users with permission can update approval requests"
  ON public.approval_requests FOR UPDATE
  USING (has_permission(auth.uid(), 'applications.approve'));

-- ── certificates ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Officers can insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Officers can update certificates" ON public.certificates;

CREATE POLICY "Users with permission can issue certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'certificates.issue'));

CREATE POLICY "Users with permission can update certificates"
  ON public.certificates FOR UPDATE
  USING (has_permission(auth.uid(), 'certificates.update'));

-- ── certification_decisions ──────────────────────────────────
DROP POLICY IF EXISTS "Officers can insert decisions" ON public.certification_decisions;

CREATE POLICY "Users with permission can insert decisions"
  ON public.certification_decisions FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'applications.approve'));

-- ── inspectors ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Super admins can manage inspectors" ON public.inspectors;

CREATE POLICY "Users with permission can manage inspectors"
  ON public.inspectors FOR ALL
  USING (has_permission(auth.uid(), 'inspectors.manage'))
  WITH CHECK (has_permission(auth.uid(), 'inspectors.manage'));

-- ── audit_logs ───────────────────────────────────────────────
DROP POLICY IF EXISTS "IT auditors and super admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Users with permission can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_permission(auth.uid(), 'audit_logs.view'));
