-- Fix: Allow users with applications.approve permission to issue certificates
-- (Previously only certificates.issue was allowed, causing RLS error during approval)
CREATE POLICY "Users with approve permission can issue certificates"
ON public.certificates FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'certificates.issue')
  OR has_permission(auth.uid(), 'applications.approve')
);