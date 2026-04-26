
-- 1. Fix generate_ncn_number (sequence starts at position 15 in 'AHIS-NCN-YYYY-NNNNN')
CREATE OR REPLACE FUNCTION public.generate_ncn_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(ncn_number FROM 15) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.non_conformance_notices
  WHERE ncn_number ~ ('^AHIS-NCN-' || _year || '-[0-9]+$');
  RETURN 'AHIS-NCN-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
END;
$function$;

-- 2. Inspector activity log table
CREATE TABLE IF NOT EXISTS public.inspector_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspector_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inspectors can insert own activity"
ON public.inspector_activity_log FOR INSERT TO authenticated
WITH CHECK (inspector_id = auth.uid());
CREATE POLICY "Inspectors can view own activity"
ON public.inspector_activity_log FOR SELECT TO authenticated
USING (inspector_id = auth.uid());
CREATE POLICY "Admins can view all inspector activity"
ON public.inspector_activity_log FOR SELECT TO authenticated
USING (public.is_admin_user(auth.uid()));

-- 3. log_Inspector_activity RPC (matches frontend casing)
CREATE OR REPLACE FUNCTION public."log_Inspector_activity"(
  _inspector_id uuid,
  _action text,
  _resource_type text DEFAULT NULL,
  _resource_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _log_id uuid;
BEGIN
  INSERT INTO public.inspector_activity_log (inspector_id, action, resource_type, resource_id, metadata)
  VALUES (_inspector_id, _action, _resource_type, _resource_id, _metadata)
  RETURNING id INTO _log_id;
  RETURN _log_id;
END;
$$;

-- 4. Inspector incidents table
CREATE TABLE IF NOT EXISTS public.inspector_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  immediate_action_taken text,
  evidence_urls text[],
  reported_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspector_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors can create own incidents"
ON public.inspector_incidents FOR INSERT TO authenticated
WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Inspectors can view own incidents"
ON public.inspector_incidents FOR SELECT TO authenticated
USING (reported_by = auth.uid());

CREATE POLICY "Admins can view all inspector incidents"
ON public.inspector_incidents FOR SELECT TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update inspector incidents"
ON public.inspector_incidents FOR UPDATE TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER update_inspector_incidents_updated_at
BEFORE UPDATE ON public.inspector_incidents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. generate_Inspector_incident_number RPC (matches frontend casing)
CREATE OR REPLACE FUNCTION public."generate_Inspector_incident_number"()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 14) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.inspector_incidents
  WHERE incident_number ~ ('^INC-INS-' || _year || '-[0-9]+$');
  RETURN 'INC-INS-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
END;
$$;

-- 6. Inspector observations table
CREATE TABLE IF NOT EXISTS public.inspector_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  tag text NOT NULL,
  observation text NOT NULL,
  recommendation text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspector_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors can create own observations"
ON public.inspector_observations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Inspectors can view own observations"
ON public.inspector_observations FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can view all inspector observations"
ON public.inspector_observations FOR SELECT TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER update_inspector_observations_updated_at
BEFORE UPDATE ON public.inspector_observations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Storage bucket for Inspector evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('Inspector-evidence', 'Inspector-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Inspectors can upload own evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'Inspector-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Inspectors can read own evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'Inspector-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Inspectors can update own evidence"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'Inspector-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Inspectors can delete own evidence"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'Inspector-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can read all inspector evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'Inspector-evidence' AND public.is_admin_user(auth.uid()));
