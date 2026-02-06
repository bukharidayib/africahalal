import { supabase } from '@/integrations/supabase/client';

export interface DynamicPermission {
  code: string;
  name: string;
  category: string;
}

export interface AdminRoleWithPermissions {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  permissions: DynamicPermission[];
  user_count?: number;
}

// Fetch all available permissions
export async function fetchAllPermissions(): Promise<DynamicPermission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('code, name, category')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }

  return data || [];
}

// Fetch all roles with their permissions
export async function fetchRolesWithPermissions(): Promise<AdminRoleWithPermissions[]> {
  const { data: roles, error: rolesError } = await supabase
    .from('admin_roles')
    .select('*')
    .order('is_system_role', { ascending: false })
    .order('display_name', { ascending: true });

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return [];
  }

  // Fetch all role-permission mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('role_permissions')
    .select('role_id, permission_id, permissions(code, name, category)');

  if (mappingsError) {
    console.error('Error fetching role permissions:', mappingsError);
    return [];
  }

  // Fetch user counts per role
  const { data: userRoles, error: userRolesError } = await supabase
    .from('user_roles')
    .select('role_id');

  const roleCounts = (userRoles || []).reduce((acc, ur) => {
    // @ts-ignore - role_id is dynamic now
    const id = ur.role_id;
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Map permissions to roles
  return (roles || []).map(role => {
    const rolePermissions = (mappings || [])
      .filter(m => m.role_id === role.id)
      .map(m => m.permissions as unknown as DynamicPermission)
      .filter(Boolean);

    return {
      ...role,
      permissions: rolePermissions,
      user_count: roleCounts[role.id] || 0,
    };
  });
}

// Fetch simple list of roles for dropdowns
export async function fetchAllRoles(): Promise<AdminRoleWithPermissions[]> {
  const { data, error } = await supabase
    .from('admin_roles')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching roles:', error);
    return [];
  }

  return (data || []).map(r => ({ ...r, permissions: [] }));
}

// Fetch user's permissions from database
export async function fetchUserPermissions(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_permissions', {
    _user_id: userId,
  });

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return data || [];
}

// Check if user has specific permission
export async function checkUserPermission(userId: string, permissionCode: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_permission', {
    _user_id: userId,
    _permission_code: permissionCode,
  });

  if (error) {
    console.error('Error checking permission:', error);
    return false;
  }

  return data || false;
}

// Convert dynamic permissions to legacy format for backward compatibility
export function convertToLegacyPermissions(permissionCodes: string[]): Record<string, boolean> {
  return {
    canViewApplications: permissionCodes.includes('applications.view'),
    canManageApplications: permissionCodes.includes('applications.manage'),
    canViewCertificates: permissionCodes.includes('certificates.view'),
    canIssueCertificates: permissionCodes.includes('certificates.issue'),
    canViewInspections: permissionCodes.includes('inspections.view'),
    canManageInspections: permissionCodes.includes('inspections.manage'),
    canViewAuditLogs: permissionCodes.includes('audit_logs.view'),
    canManageUsers: permissionCodes.includes('users.manage'),
    canManageSettings: permissionCodes.includes('settings.manage'),
    canViewEnforcement: permissionCodes.includes('enforcement.view'),
    canManageEnforcement: permissionCodes.includes('enforcement.manage'),
    canViewSupport: permissionCodes.includes('support.view'),
    canRespondSupport: permissionCodes.includes('support.respond'),
    canManageSupport: permissionCodes.includes('support.manage'),
    canManageRoles: permissionCodes.includes('roles.manage'),
  };
}

// Save role permissions
export async function saveRolePermissions(
  roleId: string,
  permissionCodes: string[]
): Promise<boolean> {
  try {
    // Get permission IDs for the codes
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id, code')
      .in('code', permissionCodes);

    if (permError) throw permError;

    // Delete existing permissions for this role
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) throw deleteError;

    // Insert new permissions
    if (permissions && permissions.length > 0) {
      const newMappings = permissions.map(p => ({
        role_id: roleId,
        permission_id: p.id,
      }));

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(newMappings);

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Error saving role permissions:', error);
    return false;
  }
}

// Create new role
export async function createRole(
  name: string,
  displayName: string,
  description: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('admin_roles')
    .insert({
      name: name.toLowerCase().replace(/\s+/g, '_'),
      display_name: displayName,
      description,
      is_system_role: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating role:', error);
    return null;
  }

  return data?.id || null;
}

// Delete role (non-system only)
export async function deleteRole(roleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('admin_roles')
    .delete()
    .eq('id', roleId)
    .eq('is_system_role', false);

  if (error) {
    console.error('Error deleting role:', error);
    return false;
  }

  return true;
}
