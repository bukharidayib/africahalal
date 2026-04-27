
ALTER TABLE public.non_conformance_notices
  ADD COLUMN IF NOT EXISTS report_id uuid,
  ADD COLUMN IF NOT EXISTS raised_by uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';

ALTER TABLE public.non_conformance_notices
  DROP CONSTRAINT IF EXISTS non_conformance_notices_source_check;
ALTER TABLE public.non_conformance_notices
  ADD CONSTRAINT non_conformance_notices_source_check
  CHECK (source IN ('admin','supervisor','inspector'));

-- Make issued_by nullable for field-raised NCRs (admin will fill it in upon promotion)
ALTER TABLE public.non_conformance_notices ALTER COLUMN issued_by DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ncn_raised_by ON public.non_conformance_notices(raised_by);
CREATE INDEX IF NOT EXISTS idx_ncn_source ON public.non_conformance_notices(source);
CREATE INDEX IF NOT EXISTS idx_ncn_inspection_id ON public.non_conformance_notices(inspection_id);

-- Supervisor RLS
DROP POLICY IF EXISTS "Supervisors can view related NCRs" ON public.non_conformance_notices;
CREATE POLICY "Supervisors can view related NCRs"
  ON public.non_conformance_notices FOR SELECT
  TO authenticated
  USING (
    raised_by = auth.uid()
    OR inspection_id IN (
      SELECT i.id FROM public.inspections i
      WHERE i.supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Supervisors can raise NCRs" ON public.non_conformance_notices;
CREATE POLICY "Supervisors can raise NCRs"
  ON public.non_conformance_notices FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = auth.uid() AND source = 'supervisor');

-- Inspector RLS
DROP POLICY IF EXISTS "Inspectors can view related NCRs" ON public.non_conformance_notices;
CREATE POLICY "Inspectors can view related NCRs"
  ON public.non_conformance_notices FOR SELECT
  TO authenticated
  USING (
    raised_by = auth.uid()
    OR inspection_id IN (
      SELECT i.id FROM public.inspections i
      JOIN public.inspectors insp ON insp.id = i.inspector_id
      WHERE insp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Inspectors can raise NCRs" ON public.non_conformance_notices;
CREATE POLICY "Inspectors can raise NCRs"
  ON public.non_conformance_notices FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = auth.uid() AND source = 'inspector');

-- corrective_actions: supervisor/inspector who raised the NCR can view client responses
DROP POLICY IF EXISTS "Field raisers can view corrective actions" ON public.corrective_actions;
CREATE POLICY "Field raisers can view corrective actions"
  ON public.corrective_actions FOR SELECT
  TO authenticated
  USING (
    ncn_id IN (
      SELECT id FROM public.non_conformance_notices
      WHERE raised_by = auth.uid()
    )
  );
