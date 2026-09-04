ALTER TABLE public.certificate_history
  DROP CONSTRAINT IF EXISTS certificate_history_certificate_id_fkey,
  ADD CONSTRAINT certificate_history_certificate_id_fkey
  FOREIGN KEY (certificate_id) REFERENCES public.certificates(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Users with permission can delete certificates" ON public.certificates;
CREATE POLICY "Users with permission can delete certificates"
ON public.certificates FOR DELETE
TO authenticated
USING (
  public.is_admin_user(auth.uid())
  OR public.has_permission(auth.uid(), 'certificates.delete')
);

DROP POLICY IF EXISTS "Users with permission can delete certificate history" ON public.certificate_history;
CREATE POLICY "Users with permission can delete certificate history"
ON public.certificate_history FOR DELETE
TO authenticated
USING (
  public.is_admin_user(auth.uid())
  OR public.has_permission(auth.uid(), 'certificates.delete')
);
