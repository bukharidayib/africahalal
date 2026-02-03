import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchAllPermissions,
  saveRolePermissions,
  DynamicPermission
} from '../lib/dynamicPermissions';
import { toast } from 'sonner';

interface RoleDetail {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
}

export default function RoleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAdminAuthContext();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [allPermissions, setAllPermissions] = useState<DynamicPermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      // Fetch role details
      const { data: roleData, error: roleError } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('id', id)
        .single();

      if (roleError) throw roleError;
      setRole(roleData);

      // Fetch all permissions
      const perms = await fetchAllPermissions();
      setAllPermissions(perms);

      // Fetch role's current permissions
      const { data: rolePerms, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(code)')
        .eq('role_id', id);

      if (rolePermsError) throw rolePermsError;

      const permCodes = new Set(
        (rolePerms || [])
          .map(rp => (rp.permissions as any)?.code)
          .filter(Boolean)
      );
      setSelectedPermissions(permCodes);
    } catch (error) {
      console.error('Error loading role data:', error);
      toast.error('Failed to load role data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!role) return;

    setIsSaving(true);
    try {
      // Update role metadata
      const { error: updateError } = await supabase
        .from('admin_roles')
        .update({
          display_name: role.display_name,
          description: role.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', role.id);

      if (updateError) throw updateError;

      // Save permissions
      const success = await saveRolePermissions(role.id, Array.from(selectedPermissions));
      
      if (success) {
        toast.success('Role updated successfully');
        navigate('/admin/roles');
      } else {
        toast.error('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    } finally {
      setIsSaving(false);
    }
  }

  function togglePermission(code: string) {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function toggleCategory(category: string) {
    const categoryPerms = allPermissions.filter(p => p.category === category);
    const allSelected = categoryPerms.every(p => selectedPermissions.has(p.code));

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      categoryPerms.forEach(p => {
        if (allSelected) {
          next.delete(p.code);
        } else {
          next.add(p.code);
        }
      });
      return next;
    });
  }

  // Group permissions by category
  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, DynamicPermission[]>);

  if (!permissions.canManageUsers) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to edit roles.
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">Loading role...</div>
      </AdminLayout>
    );
  }

  if (!role) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Role Not Found</h2>
          <Button asChild variant="outline">
            <Link to="/admin/roles">Back to Roles</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/admin/roles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-serif">Edit Role</h1>
              {role.is_system_role && (
                <Badge className="bg-purple-100 text-purple-800">System Role</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Configure permissions for {role.display_name}
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Role Details */}
        <Card>
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={role.display_name}
                  onChange={(e) => setRole({ ...role, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">System Name</Label>
                <Input
                  id="name"
                  value={role.name}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={role.description || ''}
                onChange={(e) => setRole({ ...role, description: e.target.value })}
                placeholder="Describe the role's responsibilities..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              Select the permissions this role should have. 
              {selectedPermissions.size} of {allPermissions.length} permissions selected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(permissionsByCategory).map(([category, perms]) => {
                const allSelected = perms.every(p => selectedPermissions.has(p.code));
                const someSelected = perms.some(p => selectedPermissions.has(p.code));

                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${category}`}
                        checked={allSelected}
                        onCheckedChange={() => toggleCategory(category)}
                        className={someSelected && !allSelected ? 'opacity-50' : ''}
                      />
                      <Label 
                        htmlFor={`cat-${category}`} 
                        className="text-sm font-semibold cursor-pointer"
                      >
                        {category}
                      </Label>
                      <Badge variant="secondary" className="ml-auto">
                        {perms.filter(p => selectedPermissions.has(p.code)).length}/{perms.length}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2 pl-6">
                      {perms.map((perm) => (
                        <div key={perm.code} className="flex items-center gap-2">
                          <Checkbox
                            id={perm.code}
                            checked={selectedPermissions.has(perm.code)}
                            onCheckedChange={() => togglePermission(perm.code)}
                          />
                          <Label 
                            htmlFor={perm.code} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            {perm.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
