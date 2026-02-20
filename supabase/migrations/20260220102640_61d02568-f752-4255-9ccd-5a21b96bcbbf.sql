
CREATE TABLE public.application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.certification_applications(id),
  sent_by uuid NOT NULL,
  message_type text NOT NULL,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage messages"
  ON public.application_messages
  FOR ALL
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Clients can view own messages"
  ON public.application_messages
  FOR SELECT
  USING (
    application_id IN (
      SELECT ca.id FROM certification_applications ca
      JOIN profiles p ON p.organization_id = ca.organization_id
      WHERE p.id = auth.uid()
    )
  );
