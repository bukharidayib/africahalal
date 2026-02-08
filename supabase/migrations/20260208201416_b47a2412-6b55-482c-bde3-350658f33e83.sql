
-- Create admin_invitations table
CREATE TABLE public.admin_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only admin users can manage invitations
CREATE POLICY "Admin users can view all invitations"
  ON public.admin_invitations
  FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin users can create invitations"
  ON public.admin_invitations
  FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin users can update invitations"
  ON public.admin_invitations
  FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin users can delete invitations"
  ON public.admin_invitations
  FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX idx_admin_invitations_token ON public.admin_invitations(token);
CREATE INDEX idx_admin_invitations_status ON public.admin_invitations(status);

-- Auto-update timestamps
CREATE TRIGGER update_admin_invitations_updated_at
  BEFORE UPDATE ON public.admin_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
