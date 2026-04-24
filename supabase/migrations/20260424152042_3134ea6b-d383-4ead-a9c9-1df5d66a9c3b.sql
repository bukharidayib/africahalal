-- Add attachment columns to application_messages
ALTER TABLE public.application_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

-- Track per-user last-read timestamp for unread counters
CREATE TABLE IF NOT EXISTS public.application_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, user_id)
);

ALTER TABLE public.application_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own read state select"
  ON public.application_message_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own read state insert"
  ON public.application_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own read state update"
  ON public.application_message_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket for application chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-chat-attachments', 'application-chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: any authenticated user who can view the parent application
-- (admin OR member of the org) can read/write attachments under that application's folder.
-- Folder convention: <application_id>/<filename>

CREATE POLICY "Chat attachments select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'application-chat-attachments'
    AND (
      is_admin_user(auth.uid())
      OR ((storage.foldername(name))[1])::uuid IN (
        SELECT ca.id
        FROM public.certification_applications ca
        JOIN public.profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Chat attachments insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'application-chat-attachments'
    AND (
      is_admin_user(auth.uid())
      OR ((storage.foldername(name))[1])::uuid IN (
        SELECT ca.id
        FROM public.certification_applications ca
        JOIN public.profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
      )
    )
  );