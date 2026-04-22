-- Public read access for active certificates (Directory page)
CREATE POLICY "Public can view active certificates"
ON public.certificates FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- Public read for organizations that have an active certificate
CREATE POLICY "Public can view orgs with active certificates"
ON public.organizations FOR SELECT
TO anon, authenticated
USING (
  id IN (SELECT organization_id FROM public.certificates WHERE status = 'active')
);

-- Contact form submissions table
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view contact submissions"
ON public.contact_submissions FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));