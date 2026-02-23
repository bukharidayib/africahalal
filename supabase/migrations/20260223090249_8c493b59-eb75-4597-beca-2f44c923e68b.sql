
-- Create supervisor_invitations table
CREATE TABLE public.supervisor_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  organization_id uuid REFERENCES public.organizations(id),
  site_name text,
  site_address text,
  invited_by uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supervisor_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies: Admin users only
CREATE POLICY "Admin users can view supervisor invitations"
  ON public.supervisor_invitations FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admin users can create supervisor invitations"
  ON public.supervisor_invitations FOR INSERT
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admin users can update supervisor invitations"
  ON public.supervisor_invitations FOR UPDATE
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admin users can delete supervisor invitations"
  ON public.supervisor_invitations FOR DELETE
  USING (is_admin_user(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_supervisor_invitations_updated_at
  BEFORE UPDATE ON public.supervisor_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
