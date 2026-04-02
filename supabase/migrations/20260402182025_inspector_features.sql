-- Inspector Portal Enhancements: Reports, Incidents, NCR, Observations
CREATE TABLE public.inspector_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspector_id uuid NOT NULL REFERENCES public.inspectors(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  report_type text NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  notes text,
  report_content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspector_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inspectors insert own reports" ON public.inspector_reports FOR INSERT WITH CHECK (inspector_id IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Inspectors select own reports" ON public.inspector_reports FOR SELECT USING (inspector_id IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Inspectors update own reports" ON public.inspector_reports FOR UPDATE USING (inspector_id IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Admins select all inspector reports" ON public.inspector_reports FOR SELECT USING (is_admin_user(auth.uid()));

CREATE TABLE public.inspector_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_number text UNIQUE NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  immediate_action_taken text,
  evidence_urls text[],
  reported_by uuid NOT NULL REFERENCES public.inspectors(id),
  reported_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'reported',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspector_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inspectors insert own incidents" ON public.inspector_incidents FOR INSERT WITH CHECK (reported_by IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Inspectors select own incidents" ON public.inspector_incidents FOR SELECT USING (reported_by IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Admins full access inspector_incidents" ON public.inspector_incidents FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

CREATE TABLE public.inspector_ncrs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ncr_number text UNIQUE NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  report_id uuid REFERENCES public.inspector_reports(id),
  category text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'minor',
  status text NOT NULL DEFAULT 'open',
  raised_by uuid NOT NULL REFERENCES public.inspectors(id),
  raised_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  corrective_action text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspector_ncrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inspectors insert own ncrs" ON public.inspector_ncrs FOR INSERT WITH CHECK (raised_by IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Inspectors select own ncrs" ON public.inspector_ncrs FOR SELECT USING (raised_by IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Inspectors update own ncrs corrective action" ON public.inspector_ncrs FOR UPDATE USING (raised_by IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()) AND status IN ('open', 'corrective_action_submitted'));
CREATE POLICY "Admins full access inspector_ncrs" ON public.inspector_ncrs FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

CREATE TABLE public.inspector_observations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  report_id uuid REFERENCES public.inspector_reports(id),
  tag text NOT NULL,
  observation text NOT NULL,
  recommendation text,
  created_by uuid NOT NULL REFERENCES public.inspectors(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspector_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inspectors insert own observations" ON public.inspector_observations FOR INSERT WITH CHECK (created_by IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Inspectors select own observations" ON public.inspector_observations FOR SELECT USING (created_by IN (SELECT id FROM public.inspectors WHERE user_id = auth.uid()));
CREATE POLICY "Admins select inspector_observations" ON public.inspector_observations FOR SELECT USING (is_admin_user(auth.uid()));
