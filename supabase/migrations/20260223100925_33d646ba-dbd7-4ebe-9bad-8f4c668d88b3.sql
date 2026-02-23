
-- Table for supervisor ingredient collection batches
CREATE TABLE public.supervisor_ingredient_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES public.supervisor_sites(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  product_name text NOT NULL,
  brand text,
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table for individual collected ingredients
CREATE TABLE public.supervisor_collected_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.supervisor_ingredient_collections(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  source text,
  supplier_name text,
  percentage numeric,
  notes text,
  ai_classification text,
  ai_reasoning text,
  ai_risk_level text,
  admin_decision text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for supervisor_ingredient_collections
ALTER TABLE public.supervisor_ingredient_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can insert own collections"
ON public.supervisor_ingredient_collections FOR INSERT
WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can view own collections"
ON public.supervisor_ingredient_collections FOR SELECT
USING (auth.uid() = supervisor_id);

CREATE POLICY "Admins can view all collections"
ON public.supervisor_ingredient_collections FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update collections"
ON public.supervisor_ingredient_collections FOR UPDATE
USING (is_admin_user(auth.uid()));

-- RLS for supervisor_collected_ingredients
ALTER TABLE public.supervisor_collected_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can insert own ingredients"
ON public.supervisor_collected_ingredients FOR INSERT
WITH CHECK (collection_id IN (
  SELECT id FROM public.supervisor_ingredient_collections WHERE supervisor_id = auth.uid()
));

CREATE POLICY "Supervisors can view own ingredients"
ON public.supervisor_collected_ingredients FOR SELECT
USING (collection_id IN (
  SELECT id FROM public.supervisor_ingredient_collections WHERE supervisor_id = auth.uid()
));

CREATE POLICY "Admins can view all ingredients"
ON public.supervisor_collected_ingredients FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update ingredients"
ON public.supervisor_collected_ingredients FOR UPDATE
USING (is_admin_user(auth.uid()));

-- Indexes
CREATE INDEX idx_sup_ingredient_collections_supervisor ON public.supervisor_ingredient_collections(supervisor_id);
CREATE INDEX idx_sup_ingredient_collections_org ON public.supervisor_ingredient_collections(organization_id);
CREATE INDEX idx_sup_collected_ingredients_collection ON public.supervisor_collected_ingredients(collection_id);
