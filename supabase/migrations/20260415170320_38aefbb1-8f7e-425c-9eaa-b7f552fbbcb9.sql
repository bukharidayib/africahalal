CREATE POLICY "Admins can view all application documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND public.is_admin_user(auth.uid())
);