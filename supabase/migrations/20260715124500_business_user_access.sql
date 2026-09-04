-- Business manager invitations and delegated client portal access.

CREATE TABLE IF NOT EXISTS public.business_user_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.client_businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('manager')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.business_user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.client_businesses(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('manager')),
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS business_user_invitations_pending_unique
  ON public.business_user_invitations (business_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_business_user_memberships_user
  ON public.business_user_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS idx_business_user_memberships_business
  ON public.business_user_memberships (business_id, status);
CREATE INDEX IF NOT EXISTS idx_business_user_invitations_email
  ON public.business_user_invitations (lower(email), status);

DROP TRIGGER IF EXISTS update_business_user_memberships_updated_at ON public.business_user_memberships;
CREATE TRIGGER update_business_user_memberships_updated_at
  BEFORE UPDATE ON public.business_user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_businesses_updated_at();

DROP TRIGGER IF EXISTS update_business_user_invitations_updated_at ON public.business_user_invitations;
CREATE TRIGGER update_business_user_invitations_updated_at
  BEFORE UPDATE ON public.business_user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_businesses_updated_at();

CREATE OR REPLACE FUNCTION public.user_has_business_access(_business_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_businesses b
    WHERE b.id = _business_id
      AND (
        b.user_id = _user_id
        OR EXISTS (
          SELECT 1
          FROM public.business_user_memberships m
          WHERE m.user_id = _user_id
            AND m.status = 'active'
            AND (
              m.business_id = b.id
              OR (b.parent_business_id IS NOT NULL AND m.business_id = b.parent_business_id)
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_accessible_business_ids(_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (business_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id
  FROM public.client_businesses b
  WHERE b.user_id = _user_id

  UNION

  SELECT m.business_id
  FROM public.business_user_memberships m
  WHERE m.user_id = _user_id
    AND m.status = 'active'

  UNION

  SELECT child.id
  FROM public.business_user_memberships m
  JOIN public.client_businesses parent ON parent.id = m.business_id
  JOIN public.client_businesses child ON child.parent_business_id = parent.id
  WHERE m.user_id = _user_id
    AND m.status = 'active'
    AND COALESCE(parent.business_type, 'business') = 'business';
$$;

ALTER TABLE public.business_user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage business memberships" ON public.business_user_memberships;
CREATE POLICY "Admins manage business memberships"
ON public.business_user_memberships
FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users view own business memberships" ON public.business_user_memberships;
CREATE POLICY "Users view own business memberships"
ON public.business_user_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage business invitations" ON public.business_user_invitations;
CREATE POLICY "Admins manage business invitations"
ON public.business_user_invitations
FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users can view businesses they manage" ON public.client_businesses;
CREATE POLICY "Users can view businesses they manage"
ON public.client_businesses
FOR SELECT
TO authenticated
USING (public.user_has_business_access(id, auth.uid()));

DROP POLICY IF EXISTS "Users can update businesses they manage" ON public.client_businesses;
CREATE POLICY "Users can update businesses they manage"
ON public.client_businesses
FOR UPDATE
TO authenticated
USING (public.user_has_business_access(id, auth.uid()))
WITH CHECK (public.user_has_business_access(id, auth.uid()));

DROP POLICY IF EXISTS "Users can view managed organizations" ON public.organizations;
CREATE POLICY "Users can view managed organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT b.organization_id
    FROM public.client_businesses b
    WHERE b.organization_id IS NOT NULL
      AND public.user_has_business_access(b.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update managed organizations" ON public.organizations;
CREATE POLICY "Users can update managed organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT b.organization_id
    FROM public.client_businesses b
    WHERE b.organization_id IS NOT NULL
      AND public.user_has_business_access(b.id, auth.uid())
  )
)
WITH CHECK (
  id IN (
    SELECT b.organization_id
    FROM public.client_businesses b
    WHERE b.organization_id IS NOT NULL
      AND public.user_has_business_access(b.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view managed business applications" ON public.certification_applications;
CREATE POLICY "Users can view managed business applications"
ON public.certification_applications
FOR SELECT
TO authenticated
USING (business_id IS NOT NULL AND public.user_has_business_access(business_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create managed business applications" ON public.certification_applications;
CREATE POLICY "Users can create managed business applications"
ON public.certification_applications
FOR INSERT
TO authenticated
WITH CHECK (business_id IS NOT NULL AND public.user_has_business_access(business_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update managed business applications" ON public.certification_applications;
CREATE POLICY "Users can update managed business applications"
ON public.certification_applications
FOR UPDATE
TO authenticated
USING (business_id IS NOT NULL AND public.user_has_business_access(business_id, auth.uid()))
WITH CHECK (business_id IS NOT NULL AND public.user_has_business_access(business_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view managed application documents" ON public.application_documents;
CREATE POLICY "Users can view managed application documents"
ON public.application_documents
FOR SELECT
TO authenticated
USING (
  application_id IN (
    SELECT a.id
    FROM public.certification_applications a
    WHERE a.business_id IS NOT NULL
      AND public.user_has_business_access(a.business_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can create managed application documents" ON public.application_documents;
CREATE POLICY "Users can create managed application documents"
ON public.application_documents
FOR INSERT
TO authenticated
WITH CHECK (
  application_id IN (
    SELECT a.id
    FROM public.certification_applications a
    WHERE a.business_id IS NOT NULL
      AND public.user_has_business_access(a.business_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view managed business documents" ON public.business_documents;
CREATE POLICY "Users can view managed business documents"
ON public.business_documents
FOR SELECT
TO authenticated
USING (public.user_has_business_access(business_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create managed business documents" ON public.business_documents;
CREATE POLICY "Users can create managed business documents"
ON public.business_documents
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_business_access(business_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update managed business documents" ON public.business_documents;
CREATE POLICY "Users can update managed business documents"
ON public.business_documents
FOR UPDATE
TO authenticated
USING (public.user_has_business_access(business_id, auth.uid()))
WITH CHECK (public.user_has_business_access(business_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view managed certificates" ON public.certificates;
CREATE POLICY "Users can view managed certificates"
ON public.certificates
FOR SELECT
TO authenticated
USING (
  application_id IN (
    SELECT a.id
    FROM public.certification_applications a
    WHERE a.business_id IS NOT NULL
      AND public.user_has_business_access(a.business_id, auth.uid())
  )
  OR organization_id IN (
    SELECT b.organization_id
    FROM public.client_businesses b
    WHERE b.organization_id IS NOT NULL
      AND public.user_has_business_access(b.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view managed inspections" ON public.inspections;
CREATE POLICY "Users can view managed inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (
  application_id IN (
    SELECT a.id
    FROM public.certification_applications a
    WHERE a.business_id IS NOT NULL
      AND public.user_has_business_access(a.business_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view managed invoices" ON public.invoices;
CREATE POLICY "Users can view managed invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  application_id IN (
    SELECT a.id
    FROM public.certification_applications a
    WHERE a.business_id IS NOT NULL
      AND public.user_has_business_access(a.business_id, auth.uid())
  )
  OR organization_id IN (
    SELECT b.organization_id
    FROM public.client_businesses b
    WHERE b.organization_id IS NOT NULL
      AND public.user_has_business_access(b.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view managed subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view managed subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT b.organization_id
    FROM public.client_businesses b
    WHERE b.organization_id IS NOT NULL
      AND public.user_has_business_access(b.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view managed ncrs" ON public.non_conformance_notices;
CREATE POLICY "Users can view managed ncrs"
ON public.non_conformance_notices
FOR SELECT
TO authenticated
USING (
  inspection_id IN (
    SELECT i.id
    FROM public.inspections i
    JOIN public.certification_applications a ON a.id = i.application_id
    WHERE a.business_id IS NOT NULL
      AND public.user_has_business_access(a.business_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view managed corrective actions" ON public.corrective_actions;
CREATE POLICY "Users can view managed corrective actions"
ON public.corrective_actions
FOR SELECT
TO authenticated
USING (
  ncn_id IN (
    SELECT n.id
    FROM public.non_conformance_notices n
    JOIN public.inspections i ON i.id = n.inspection_id
    JOIN public.certification_applications a ON a.id = i.application_id
    WHERE a.business_id IS NOT NULL
      AND public.user_has_business_access(a.business_id, auth.uid())
  )
);
