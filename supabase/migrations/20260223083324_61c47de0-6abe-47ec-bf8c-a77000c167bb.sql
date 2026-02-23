
-- =============================================
-- SUPERVISOR PORTAL: Full Schema Migration
-- =============================================

-- 1. supervisor_sites
CREATE TABLE public.supervisor_sites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  site_name text NOT NULL,
  site_address text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.supervisor_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view own sites" ON public.supervisor_sites
  FOR SELECT USING (supervisor_id = auth.uid());
CREATE POLICY "Admins full access supervisor_sites" ON public.supervisor_sites
  FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- 2. supervisor_reports
CREATE TABLE public.supervisor_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES public.supervisor_sites(id),
  report_type text NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  compliance_score numeric,
  risk_level text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors insert own reports" ON public.supervisor_reports
  FOR INSERT WITH CHECK (supervisor_id = auth.uid());
CREATE POLICY "Supervisors select own reports" ON public.supervisor_reports
  FOR SELECT USING (supervisor_id = auth.uid());
CREATE POLICY "Supervisors update own drafts" ON public.supervisor_reports
  FOR UPDATE USING (supervisor_id = auth.uid() AND status = 'draft');
CREATE POLICY "Admins select all reports" ON public.supervisor_reports
  FOR SELECT USING (is_admin_user(auth.uid()));

-- 3. supervisor_checklist_items
CREATE TABLE public.supervisor_checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.supervisor_reports(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_description text NOT NULL,
  response text,
  observation_notes text,
  observation_time timestamptz,
  evidence_urls text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors manage own checklist items" ON public.supervisor_checklist_items
  FOR ALL USING (
    report_id IN (SELECT id FROM public.supervisor_reports WHERE supervisor_id = auth.uid())
  ) WITH CHECK (
    report_id IN (SELECT id FROM public.supervisor_reports WHERE supervisor_id = auth.uid() AND status = 'draft')
  );
CREATE POLICY "Admins select checklist items" ON public.supervisor_checklist_items
  FOR SELECT USING (is_admin_user(auth.uid()));

-- 4. supervisor_compliance_scores (immutable)
CREATE TABLE public.supervisor_compliance_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.supervisor_sites(id),
  report_id uuid NOT NULL REFERENCES public.supervisor_reports(id),
  score_date date NOT NULL,
  overall_score numeric NOT NULL,
  category_scores jsonb NOT NULL DEFAULT '{}',
  risk_level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_compliance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors select own scores" ON public.supervisor_compliance_scores
  FOR SELECT USING (
    site_id IN (SELECT id FROM public.supervisor_sites WHERE supervisor_id = auth.uid())
  );
CREATE POLICY "Admins select all scores" ON public.supervisor_compliance_scores
  FOR SELECT USING (is_admin_user(auth.uid()));
-- No UPDATE or DELETE policies => immutable

-- 5. supervisor_ncrs
CREATE TABLE public.supervisor_ncrs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ncr_number text UNIQUE NOT NULL,
  site_id uuid NOT NULL REFERENCES public.supervisor_sites(id),
  report_id uuid REFERENCES public.supervisor_reports(id),
  checklist_item_id uuid REFERENCES public.supervisor_checklist_items(id),
  category text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'minor',
  status text NOT NULL DEFAULT 'open',
  raised_by uuid NOT NULL,
  raised_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  corrective_action text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_ncrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors insert own ncrs" ON public.supervisor_ncrs
  FOR INSERT WITH CHECK (raised_by = auth.uid());
CREATE POLICY "Supervisors select own ncrs" ON public.supervisor_ncrs
  FOR SELECT USING (
    site_id IN (SELECT id FROM public.supervisor_sites WHERE supervisor_id = auth.uid())
  );
CREATE POLICY "Supervisors update own ncrs corrective action" ON public.supervisor_ncrs
  FOR UPDATE USING (
    raised_by = auth.uid() AND status IN ('open', 'corrective_action_submitted')
  );
CREATE POLICY "Admins full access ncrs" ON public.supervisor_ncrs
  FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- 6. supervisor_incidents (immutable after creation)
CREATE TABLE public.supervisor_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_number text UNIQUE NOT NULL,
  site_id uuid NOT NULL REFERENCES public.supervisor_sites(id),
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  immediate_action_taken text,
  evidence_urls text[],
  reported_by uuid NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'reported',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors insert own incidents" ON public.supervisor_incidents
  FOR INSERT WITH CHECK (reported_by = auth.uid());
CREATE POLICY "Supervisors select own incidents" ON public.supervisor_incidents
  FOR SELECT USING (
    site_id IN (SELECT id FROM public.supervisor_sites WHERE supervisor_id = auth.uid())
  );
CREATE POLICY "Admins full access incidents" ON public.supervisor_incidents
  FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
-- No UPDATE for supervisors => immutable

-- 7. supervisor_observations
CREATE TABLE public.supervisor_observations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.supervisor_sites(id),
  report_id uuid REFERENCES public.supervisor_reports(id),
  tag text NOT NULL,
  observation text NOT NULL,
  recommendation text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors insert own observations" ON public.supervisor_observations
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Supervisors select own observations" ON public.supervisor_observations
  FOR SELECT USING (
    site_id IN (SELECT id FROM public.supervisor_sites WHERE supervisor_id = auth.uid())
  );
CREATE POLICY "Admins select observations" ON public.supervisor_observations
  FOR SELECT USING (is_admin_user(auth.uid()));

-- 8. supervisor_activity_log
CREATE TABLE public.supervisor_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins select activity log" ON public.supervisor_activity_log
  FOR SELECT USING (is_admin_user(auth.uid()));
-- INSERT only via SECURITY DEFINER function

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- Generate NCR supervisor number
CREATE OR REPLACE FUNCTION public.generate_ncr_supervisor_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(ncr_number FROM 14) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.supervisor_ncrs
  WHERE ncr_number LIKE 'NCR-SUP-' || _year || '-%';
  RETURN 'NCR-SUP-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
END;
$$;

-- Generate incident number
CREATE OR REPLACE FUNCTION public.generate_supervisor_incident_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 10) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.supervisor_incidents
  WHERE incident_number LIKE 'INC-' || _year || '-%';
  RETURN 'INC-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
END;
$$;

-- Log supervisor activity (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_supervisor_activity(
  _supervisor_id uuid,
  _action text,
  _resource_type text DEFAULT NULL,
  _resource_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.supervisor_activity_log (supervisor_id, action, resource_type, resource_id, metadata)
  VALUES (_supervisor_id, _action, _resource_type, _resource_id, _metadata)
  RETURNING id INTO _log_id;
  RETURN _log_id;
END;
$$;

-- Submit supervisor report (atomic: lock, score, log)
CREATE OR REPLACE FUNCTION public.submit_supervisor_report(_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _report RECORD;
  _total_score numeric;
  _item_count integer;
  _category_scores jsonb := '{}';
  _risk_level text;
  _cat RECORD;
BEGIN
  -- Get and validate report
  SELECT * INTO _report FROM public.supervisor_reports WHERE id = _report_id;
  
  IF _report IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;
  
  IF _report.status != 'draft' THEN
    RAISE EXCEPTION 'Report already submitted';
  END IF;
  
  IF _report.supervisor_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF _report.report_date != CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot submit backdated reports. Report date must be today.';
  END IF;

  -- Calculate overall score
  SELECT 
    COALESCE(AVG(
      CASE response
        WHEN 'compliant' THEN 100
        WHEN 'minor_deviation' THEN 50
        WHEN 'major_non_compliance' THEN 0
        ELSE NULL  -- not_applicable excluded
      END
    ), 0),
    COUNT(*) FILTER (WHERE response != 'not_applicable')
  INTO _total_score, _item_count
  FROM public.supervisor_checklist_items
  WHERE report_id = _report_id AND response IS NOT NULL;

  -- Calculate per-category scores
  FOR _cat IN
    SELECT category,
      COALESCE(AVG(
        CASE response
          WHEN 'compliant' THEN 100
          WHEN 'minor_deviation' THEN 50
          WHEN 'major_non_compliance' THEN 0
          ELSE NULL
        END
      ), 0) as cat_score
    FROM public.supervisor_checklist_items
    WHERE report_id = _report_id AND response IS NOT NULL AND response != 'not_applicable'
    GROUP BY category
  LOOP
    _category_scores := _category_scores || jsonb_build_object(_cat.category, ROUND(_cat.cat_score, 1));
  END LOOP;

  -- Determine risk level
  IF _total_score >= 80 THEN _risk_level := 'low';
  ELSIF _total_score >= 60 THEN _risk_level := 'medium';
  ELSE _risk_level := 'high';
  END IF;

  -- Update report
  UPDATE public.supervisor_reports
  SET status = 'submitted',
      submitted_at = now(),
      compliance_score = ROUND(_total_score, 1),
      risk_level = _risk_level
  WHERE id = _report_id;

  -- Insert compliance score record
  INSERT INTO public.supervisor_compliance_scores (site_id, report_id, score_date, overall_score, category_scores, risk_level)
  VALUES (_report.site_id, _report_id, _report.report_date, ROUND(_total_score, 1), _category_scores, _risk_level);

  -- Auto-create NCRs for major non-compliance items
  INSERT INTO public.supervisor_ncrs (ncr_number, site_id, report_id, checklist_item_id, category, description, severity, raised_by)
  SELECT 
    'NCR-SUP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER() + COALESCE(
      (SELECT MAX(CAST(SUBSTRING(ncr_number FROM 14) AS INTEGER)) FROM public.supervisor_ncrs WHERE ncr_number LIKE 'NCR-SUP-' || TO_CHAR(NOW(), 'YYYY') || '-%'), 0
    ))::TEXT, 5, '0'),
    _report.site_id,
    _report_id,
    sci.id,
    sci.category,
    'Major non-compliance detected: ' || sci.item_description || ' - ' || COALESCE(sci.observation_notes, ''),
    'major',
    _report.supervisor_id
  FROM public.supervisor_checklist_items sci
  WHERE sci.report_id = _report_id AND sci.response = 'major_non_compliance';

  -- Log activity
  PERFORM public.log_supervisor_activity(
    _report.supervisor_id,
    'report_submitted',
    'supervisor_reports',
    _report_id,
    jsonb_build_object('report_type', _report.report_type, 'compliance_score', ROUND(_total_score, 1), 'risk_level', _risk_level)
  );

  RETURN jsonb_build_object(
    'success', true,
    'compliance_score', ROUND(_total_score, 1),
    'risk_level', _risk_level,
    'category_scores', _category_scores,
    'items_scored', _item_count
  );
END;
$$;

-- =============================================
-- STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('supervisor-evidence', 'supervisor-evidence', false);

CREATE POLICY "Supervisors upload own evidence" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'supervisor-evidence' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Supervisors view own evidence" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'supervisor-evidence' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all evidence" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'supervisor-evidence' AND is_admin_user(auth.uid())
  );
