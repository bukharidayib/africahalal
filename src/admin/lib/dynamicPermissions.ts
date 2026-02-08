import { supabase } from '@/integrations/supabase/client';

export interface DynamicPermission {
  id?: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  action_type?: string;
}

export interface AdminRoleWithPermissions {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  status?: string;
  permissions: DynamicPermission[];
  user_count?: number;
}

// Fetch all available permissions (now includes action_type)
export async function fetchAllPermissions(): Promise<DynamicPermission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('id, code, name, category, description')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }

  // Fetch action_type separately since it may not be in generated types yet
  const { data: withActionType } = await supabase
    .from('permissions')
    .select('id, code, name, category, description')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  // Try to get action_type via raw query
  try {
    const { data: rawPerms } = await supabase
      .rpc('get_permissions_with_action_type' as any) as any;
    if (rawPerms && Array.isArray(rawPerms)) {
      return rawPerms;
    }
  } catch {
    // Function doesn't exist, fall back
  }

  // Fallback: infer action_type from code
  return (data || []).map(p => ({
    ...p,
    action_type: inferActionType(p.code),
  }));
}

function inferActionType(code: string): string {
  const action = code.split('.')[1];
  if (!action) return 'special';
  if (action === 'view') return 'read';
  if (action === 'create') return 'create';
  if (action === 'update') return 'update';
  if (action === 'delete') return 'delete';
  return 'special';
}

// Fetch all roles with their permissions
export async function fetchRolesWithPermissions(): Promise<AdminRoleWithPermissions[]> {
  const { data: roles, error: rolesError } = await supabase
    .from('admin_roles')
    .select('*')
    .order('display_name', { ascending: true });

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return [];
  }

  // Fetch all role-permission mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('role_permissions')
    .select('role_id, permission_id, permissions(id, code, name, category)');

  if (mappingsError) {
    console.error('Error fetching role permissions:', mappingsError);
    return [];
  }

  // Fetch user counts per role
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role_id');

  const roleCounts = (userRoles || []).reduce((acc, ur) => {
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
      status: (role as any).status || 'active',
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

  return (data || []).map(r => ({
    ...r,
    status: (r as any).status || 'active',
    permissions: [],
  }));
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

// Delete role (any role can be deleted now, safeguard is in UI)
export async function deleteRole(roleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('admin_roles')
    .delete()
    .eq('id', roleId);

  if (error) {
    console.error('Error deleting role:', error);
    return false;
  }

  return true;
}

// Update role status (activate/suspend)
export async function updateRoleStatus(
  roleId: string,
  status: 'active' | 'suspended'
): Promise<boolean> {
  const { error } = await supabase
    .from('admin_roles')
    .update({ status, updated_at: new Date().toISOString() } as any)
    .eq('id', roleId);

  if (error) {
    console.error('Error updating role status:', error);
    return false;
  }

  return true;
}

// Fetch workflow stage permissions for a role
export async function fetchWorkflowStagePermissions(roleId: string): Promise<any[]> {
  const { data, error } = await (supabase
    .from('workflow_stage_permissions' as any)
    .select(`
      id,
      stage_id,
      role_id,
      permission_id
    `)
    .eq('role_id', roleId) as any);

  if (error) {
    console.error('Error fetching workflow stage permissions:', error);
    return [];
  }

  return data || [];
}

// Save workflow stage permissions for a role
export async function saveWorkflowStagePermissions(
  roleId: string,
  stagePermissions: Array<{ stage_id: string; permission_id: string }>
): Promise<boolean> {
  try {
    // Delete existing
    const { error: deleteError } = await (supabase
      .from('workflow_stage_permissions' as any)
      .delete()
      .eq('role_id', roleId) as any);

    if (deleteError) throw deleteError;

    // Insert new
    if (stagePermissions.length > 0) {
      const inserts = stagePermissions.map(sp => ({
        stage_id: sp.stage_id,
        role_id: roleId,
        permission_id: sp.permission_id,
      }));

      const { error: insertError } = await (supabase
        .from('workflow_stage_permissions' as any)
        .insert(inserts) as any);

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Error saving workflow stage permissions:', error);
    return false;
  }
}
