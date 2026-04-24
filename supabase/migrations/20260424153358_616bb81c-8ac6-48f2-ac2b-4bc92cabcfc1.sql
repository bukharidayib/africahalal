ALTER TABLE public.application_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.application_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_application_messages_reply_to ON public.application_messages(reply_to_id);