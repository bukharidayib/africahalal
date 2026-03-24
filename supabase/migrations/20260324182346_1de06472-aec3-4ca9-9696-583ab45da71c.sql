
-- Add columns to inspections table
ALTER TABLE public.inspections 
  ADD COLUMN IF NOT EXISTS supervisor_id uuid,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Add columns to inspection_reports table
ALTER TABLE public.inspection_reports 
  ADD COLUMN IF NOT EXISTS compliance_score numeric,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

-- Create inspection_checklist_items table
CREATE TABLE public.inspection_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_description text NOT NULL,
  response text,
  notes text,
  evidence_urls text[],
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create inspection_evidence table
CREATE TABLE public.inspection_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES public.inspection_checklist_items(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'photo',
  caption text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create inspection_notifications table
CREATE TABLE public.inspection_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inspection_id uuid REFERENCES public.inspections(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for inspection_checklist_items
ALTER TABLE public.inspection_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access checklist items"
  ON public.inspection_checklist_items FOR ALL
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Inspectors can manage own checklist items"
  ON public.inspection_checklist_items FOR ALL
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  ))
  WITH CHECK (inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  ));

CREATE POLICY "Supervisors can view checklist items"
  ON public.inspection_checklist_items FOR SELECT
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM public.inspections i
    WHERE i.supervisor_id IN (
      SELECT os.supervisor_id FROM public.organization_supervisors os
      WHERE os.supervisor_id = auth.uid()
    )
  ));

-- RLS for inspection_evidence
ALTER TABLE public.inspection_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access evidence"
  ON public.inspection_evidence FOR ALL
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Inspectors can manage own evidence"
  ON public.inspection_evidence FOR ALL
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Inspectors can view inspection evidence"
  ON public.inspection_evidence FOR SELECT
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  ));

CREATE POLICY "Supervisors can view evidence"
  ON public.inspection_evidence FOR SELECT
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM public.inspections i
    WHERE i.supervisor_id IN (
      SELECT os.supervisor_id FROM public.organization_supervisors os
      WHERE os.supervisor_id = auth.uid()
    )
  ));

-- RLS for inspection_notifications
ALTER TABLE public.inspection_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.inspection_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.inspection_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage notifications"
  ON public.inspection_notifications FOR ALL
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Add RLS for inspectors to view their own inspections
CREATE POLICY "Inspectors can view own inspections"
  ON public.inspections FOR SELECT
  TO authenticated
  USING (inspector_id IN (
    SELECT id FROM public.inspectors WHERE user_id = auth.uid()
  ));

-- Add RLS for inspectors to update own inspections (start, complete)
CREATE POLICY "Inspectors can update own inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (inspector_id IN (
    SELECT id FROM public.inspectors WHERE user_id = auth.uid()
  ));

-- Inspectors can view their own reports
CREATE POLICY "Inspectors can view own reports"
  ON public.inspection_reports FOR SELECT
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  ));

-- Inspectors can manage their own reports
CREATE POLICY "Inspectors can manage own reports"
  ON public.inspection_reports FOR ALL
  TO authenticated
  USING (inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  ))
  WITH CHECK (inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.inspectors insp ON insp.id = i.inspector_id
    WHERE insp.user_id = auth.uid()
  ));

-- Create storage bucket for inspection evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-evidence', 'inspection-evidence', false)
ON CONFLICT (id) DO NOTHING;
