-- 1. Add columns to inspectors
ALTER TABLE public.inspectors
  ADD COLUMN IF NOT EXISTS nrc_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS full_name text;

-- 2. inspector_invitations
CREATE TABLE IF NOT EXISTS public.inspector_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  nrc_number text,
  address text,
  organization_ids uuid[] DEFAULT '{}',
  managed_inspector_ids uuid[] DEFAULT '{}',
  specializations text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  is_manager boolean NOT NULL DEFAULT false,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspector_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inspector invitations select"
  ON public.inspector_invitations FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage inspector invitations insert"
  ON public.inspector_invitations FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage inspector invitations update"
  ON public.inspector_invitations FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage inspector invitations delete"
  ON public.inspector_invitations FOR DELETE
  USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER inspector_invitations_updated_at
  BEFORE UPDATE ON public.inspector_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. inspector_organizations
CREATE TABLE IF NOT EXISTS public.inspector_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inspector_id, organization_id)
);

ALTER TABLE public.inspector_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inspector_organizations"
  ON public.inspector_organizations FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Inspectors view own org assignments"
  ON public.inspector_organizations FOR SELECT
  USING (inspector_id IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));

-- 4. inspector_manager_inspectors
CREATE TABLE IF NOT EXISTS public.inspector_manager_inspectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
  inspector_id uuid NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manager_id, inspector_id),
  CHECK (manager_id <> inspector_id)
);

ALTER TABLE public.inspector_manager_inspectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inspector_manager_inspectors"
  ON public.inspector_manager_inspectors FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Managers view own managed inspectors"
  ON public.inspector_manager_inspectors FOR SELECT
  USING (manager_id IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));

CREATE POLICY "Inspectors view their manager link"
  ON public.inspector_manager_inspectors FOR SELECT
  USING (inspector_id IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));