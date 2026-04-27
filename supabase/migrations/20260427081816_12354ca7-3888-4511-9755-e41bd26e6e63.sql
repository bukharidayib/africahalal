
-- Inspector reports table
CREATE TABLE IF NOT EXISTS public.inspector_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  report_type text NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  report_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  compliance_score numeric,
  risk_level text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspector_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors can insert own reports" ON public.inspector_reports
  FOR INSERT TO authenticated WITH CHECK (inspector_id = auth.uid());

CREATE POLICY "Inspectors can view own reports" ON public.inspector_reports
  FOR SELECT TO authenticated USING (inspector_id = auth.uid());

CREATE POLICY "Inspectors can update own reports" ON public.inspector_reports
  FOR UPDATE TO authenticated USING (inspector_id = auth.uid()) WITH CHECK (inspector_id = auth.uid());

CREATE POLICY "Admins can view all inspector reports" ON public.inspector_reports
  FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update all inspector reports" ON public.inspector_reports
  FOR UPDATE TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER trg_inspector_reports_updated_at
  BEFORE UPDATE ON public.inspector_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inspector checklist items table
CREATE TABLE IF NOT EXISTS public."Inspector_checklist_items" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.inspector_reports(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_description text NOT NULL,
  response text,
  observation_notes text,
  observation_time timestamptz,
  evidence_urls text[],
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."Inspector_checklist_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors manage own checklist items" ON public."Inspector_checklist_items"
  FOR ALL TO authenticated
  USING (report_id IN (SELECT id FROM public.inspector_reports WHERE inspector_id = auth.uid()))
  WITH CHECK (report_id IN (SELECT id FROM public.inspector_reports WHERE inspector_id = auth.uid()));

CREATE POLICY "Admins view all checklist items" ON public."Inspector_checklist_items"
  FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));

-- Submit RPC
CREATE OR REPLACE FUNCTION public."submit_Inspector_report"(_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _report RECORD;
  _total_score numeric;
  _item_count integer;
  _category_scores jsonb := '{}';
  _risk_level text;
  _cat RECORD;
BEGIN
  SELECT * INTO _report FROM public.inspector_reports WHERE id = _report_id;
  IF _report IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF _report.status != 'draft' THEN RAISE EXCEPTION 'Report already submitted'; END IF;
  IF _report.inspector_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT
    COALESCE(AVG(
      CASE response
        WHEN 'compliant' THEN 100
        WHEN 'minor_deviation' THEN 50
        WHEN 'major_non_compliance' THEN 0
        ELSE NULL
      END
    ), 0),
    COUNT(*) FILTER (WHERE response != 'not_applicable')
  INTO _total_score, _item_count
  FROM public."Inspector_checklist_items"
  WHERE report_id = _report_id AND response IS NOT NULL;

  FOR _cat IN
    SELECT category,
      COALESCE(AVG(
        CASE response
          WHEN 'compliant' THEN 100
          WHEN 'minor_deviation' THEN 50
          WHEN 'major_non_compliance' THEN 0
          ELSE NULL
        END
      ), 0) AS cat_score
    FROM public."Inspector_checklist_items"
    WHERE report_id = _report_id AND response IS NOT NULL AND response != 'not_applicable'
    GROUP BY category
  LOOP
    _category_scores := _category_scores || jsonb_build_object(_cat.category, ROUND(_cat.cat_score, 1));
  END LOOP;

  IF _total_score >= 80 THEN _risk_level := 'low';
  ELSIF _total_score >= 60 THEN _risk_level := 'medium';
  ELSE _risk_level := 'high';
  END IF;

  UPDATE public.inspector_reports
  SET status = 'submitted',
      submitted_at = now(),
      compliance_score = ROUND(_total_score, 1),
      risk_level = _risk_level
  WHERE id = _report_id;

  PERFORM public."log_Inspector_activity"(
    _report.inspector_id,
    'report_submitted',
    'inspector_reports',
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
