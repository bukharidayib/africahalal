INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'bfeb6e6a-83f1-42be-9f89-1f3a5fe967e1', id
FROM public.permissions
ON CONFLICT DO NOTHING;