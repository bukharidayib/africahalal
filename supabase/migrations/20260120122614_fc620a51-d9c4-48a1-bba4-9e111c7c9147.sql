-- Create a test admin user
-- First, we need to insert directly into auth.users which requires service role
-- Instead, we'll create a helper that admins can use to assign roles

-- Add a test organization for demo purposes
INSERT INTO public.organizations (id, name, registration_number, sector, contact_name, contact_email, address, city, country)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AHIS Test Organization',
  'TEST-ORG-001',
  'Food Processing',
  'Test Admin',
  'admin@ahis.org',
  '123 Certification Lane',
  'Nairobi',
  'Kenya'
) ON CONFLICT DO NOTHING;

-- Create a demo application for testing
INSERT INTO public.certification_applications (
  id,
  application_number,
  organization_id,
  application_type,
  scope,
  sector,
  status,
  submitted_at
)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'AHIS-2026-00001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Initial Certification',
  'Halal food processing and packaging for export markets',
  'Food Processing',
  'submitted',
  NOW()
) ON CONFLICT DO NOTHING;

-- Create a function to easily assign admin roles (super_admin only)
CREATE OR REPLACE FUNCTION public.assign_admin_role(
  _email TEXT,
  _role admin_role
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_user_role TEXT;
BEGIN
  -- Check if caller is super_admin
  SELECT role::TEXT INTO _current_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  IF _current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can assign roles';
  END IF;
  
  -- Find user by email in profiles
  SELECT id INTO _user_id FROM public.profiles WHERE email = _email;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. User must sign up first.', _email;
  END IF;
  
  -- Insert role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (_user_id, _role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN 'Role ' || _role || ' assigned to ' || _email;
END;
$$;