CREATE OR REPLACE FUNCTION public.ensure_supervisor_site(_organization_id uuid, _site_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_site_id uuid;
  v_org_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  -- Try existing active site
  SELECT id INTO v_site_id
  FROM public.supervisor_sites
  WHERE supervisor_id = v_user_id
    AND organization_id = _organization_id
    AND is_active = true
  ORDER BY assigned_at DESC
  LIMIT 1;

  IF v_site_id IS NOT NULL THEN
    RETURN v_site_id;
  END IF;

  -- Resolve org name fallback
  IF _site_name IS NULL OR length(trim(_site_name)) = 0 THEN
    SELECT name INTO v_org_name FROM public.organizations WHERE id = _organization_id;
    _site_name := COALESCE(v_org_name, 'Assigned Site');
  END IF;

  INSERT INTO public.supervisor_sites (supervisor_id, organization_id, site_name, is_active)
  VALUES (v_user_id, _organization_id, _site_name, true)
  RETURNING id INTO v_site_id;

  RETURN v_site_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_supervisor_site(uuid, text) TO authenticated;