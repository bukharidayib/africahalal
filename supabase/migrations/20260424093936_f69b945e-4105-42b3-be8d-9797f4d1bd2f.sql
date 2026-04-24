
-- 1. Add 'expired' to application_status enum
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'expired';

-- 2. Trigger to enforce single active application per organization
CREATE OR REPLACE FUNCTION public.enforce_single_active_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.certification_applications
    WHERE organization_id = NEW.organization_id
      AND status NOT IN ('expired'::application_status, 'rejected'::application_status, 'withdrawn'::application_status)
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'You already have an active application. You can only create a new one after the current application expires.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_active_application ON public.certification_applications;
CREATE TRIGGER trg_enforce_single_active_application
BEFORE INSERT ON public.certification_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_application();

-- 3. Auto-expire helper (called from edge / on demand)
CREATE OR REPLACE FUNCTION public.expire_lapsed_applications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
BEGIN
  WITH expired_certs AS (
    UPDATE public.certificates
    SET status = 'expired'::certificate_status
    WHERE status = 'active'::certificate_status
      AND expiry_date < CURRENT_DATE
    RETURNING application_id
  ),
  expired_apps AS (
    UPDATE public.certification_applications ca
    SET status = 'expired'::application_status,
        updated_at = now()
    WHERE ca.id IN (SELECT application_id FROM expired_certs)
      AND ca.status = 'approved'::application_status
    RETURNING ca.id
  )
  SELECT COUNT(*) INTO _count FROM expired_apps;
  RETURN _count;
END;
$$;

-- 4. Add sender_role to application_messages
ALTER TABLE public.application_messages
  ADD COLUMN IF NOT EXISTS sender_role text NOT NULL DEFAULT 'admin';

-- 5. Allow clients to insert messages on their own application
DROP POLICY IF EXISTS "Clients can insert own application messages" ON public.application_messages;
CREATE POLICY "Clients can insert own application messages"
ON public.application_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sent_by = auth.uid()
  AND application_id IN (
    SELECT ca.id
    FROM public.certification_applications ca
    JOIN public.profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);

-- 6. Realtime
ALTER TABLE public.application_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.application_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
