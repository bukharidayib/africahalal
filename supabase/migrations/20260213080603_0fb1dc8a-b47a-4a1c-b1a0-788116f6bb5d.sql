
-- 1. Add nrc column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nrc text;

-- 2. Create client_businesses table
CREATE TABLE public.client_businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  pacra_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id),
  UNIQUE(user_id, pacra_number)
);

ALTER TABLE public.client_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own businesses"
  ON public.client_businesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own businesses"
  ON public.client_businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own businesses"
  ON public.client_businesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own businesses"
  ON public.client_businesses FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Add DELETE policy on invoices for admin users
CREATE POLICY "Admin users can delete invoices"
  ON public.invoices FOR DELETE
  USING (public.is_admin_user(auth.uid()));
