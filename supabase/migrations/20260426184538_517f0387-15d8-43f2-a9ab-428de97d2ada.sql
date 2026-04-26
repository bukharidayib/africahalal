
-- 1) Add new application status value
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- 2) Add last_read columns to chat_sessions for read receipts
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS client_last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_last_read_at timestamptz;

-- 3) Typing indicators table
CREATE TABLE IF NOT EXISTS public.chat_typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('client','admin')),
  is_typing boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_typing_session ON public.chat_typing_indicators(session_id);

ALTER TABLE public.chat_typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view typing" ON public.chat_typing_indicators;
CREATE POLICY "Participants can view typing"
ON public.chat_typing_indicators
FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.chat_sessions
    WHERE user_id = auth.uid()
  )
  OR public.is_admin_user(auth.uid())
);

DROP POLICY IF EXISTS "Users insert own typing" ON public.chat_typing_indicators;
CREATE POLICY "Users insert own typing"
ON public.chat_typing_indicators
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own typing" ON public.chat_typing_indicators;
CREATE POLICY "Users update own typing"
ON public.chat_typing_indicators
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own typing" ON public.chat_typing_indicators;
CREATE POLICY "Users delete own typing"
ON public.chat_typing_indicators
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 4) Realtime
ALTER TABLE public.chat_typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing_indicators;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
