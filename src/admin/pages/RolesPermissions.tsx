import React, { useEffect, useState } from 'react';
import { Shield, Plus, Edit, Trash2, Users, Key, Power, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import {
  fetchRolesWithPermissions,
  fetchAllPermissions,
  createRole,
  deleteRole,
  updateRoleStatus,
  AdminRoleWithPermissions,
  DynamicPermission,
} from '../lib/dynamicPermissions';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function RolesPermissions() {
  const { permissions, user: currentUser } = useAdminAuthContext();
  const [roles, setRoles] = useState<AdminRoleWithPermissions[]>([]);
  const [allPermissions, setAllPermissions] = useState<DynamicPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRoleWithPermissions | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [rolesData, permsData] = await Promise.all([
      fetchRolesWithPermissions(),
      fetchAllPermissions(),
    ]);
    setRoles(rolesData);
    setAllPermissions(permsData);
    setIsLoading(false);
  }

  async function handleCreateRole() {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const roleId = await createRole(
        newRoleName.trim(),
        newRoleName.trim(),
        newRoleDescription.trim()
      );

      if (roleId) {
        await supabase.rpc('log_audit', {
          _action: 'role_created',
          _resource_type: 'admin_roles',
          _resource_id: roleId,
          _reason_code: 'admin_action',
          _metadata: { role_name: newRoleName.trim() },
        });
        toast.success('Role created successfully');
        setIsCreateDialogOpen(false);
        setNewRoleName('');
        setNewRoleDescription('');
        loadData();
      } else {
        toast.error('Failed to create role');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRole() {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      const success = await deleteRole(selectedRole.id);
      if (success) {
        await supabase.rpc('log_audit', {
          _action: 'role_deleted',
          _resource_type: 'admin_roles',
          _resource_id: selectedRole.id,
          _reason_code: 'admin_action',
          _metadata: { role_name: selectedRole.display_name },
        });
        toast.success('Role deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedRole(null);
        loadData();
      } else {
        toast.error('Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus() {
    if (!selectedRole) return;
    if (!suspendReason.trim() && selectedRole.status === 'active') {
      toast.error('Reason is required to suspend a role');
      return;
    }

    const newStatus = selectedRole.status === 'active' ? 'suspended' : 'active';

    setIsSubmitting(true);
    try {
      const success = await updateRoleStatus(selectedRole.id, newStatus);
      if (success) {
        await supabase.rpc('log_audit', {
          _action: newStatus === 'suspended' ? 'role_suspended' : 'role_activated',
          _resource_type: 'admin_roles',
          _resource_id: selectedRole.id,
          _reason_code: newStatus === 'suspended' ? 'admin_override' : 'admin_action',
          _metadata: {
            role_name: selectedRole.display_name,
            reason: suspendReason || 'Reactivation',
            affected_users: selectedRole.user_count || 0,
          },
        });
        toast.success(`Role ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
        setIsSuspendDialogOpen(false);
        setSelectedRole(null);
        setSuspendReason('');
        loadData();
      } else {
        toast.error('Failed to update role status');
      }
    } catch (error) {
      console.error('Error updating role status:', error);
      toast.error('Failed to update role status');
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeRoles = roles.filter(r => r.status === 'active').length;
  const suspendedRoles = roles.filter(r => r.status === 'suspended').length;

  if (!permissions.canManageUsers) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage roles.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Roles & Permissions</h1>
            <p className="text-muted-foreground">Manage admin roles, status, and access permissions</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-sm text-muted-foreground">Total Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Power className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeRoles}</p>
                  <p className="text-sm text-muted-foreground">Active Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{suspendedRoles}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.reduce((sum, r) => sum + (r.user_count || 0), 0)}</p>
                  <p className="text-sm text-muted-foreground">Admin Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No roles found</h3>
                <p className="text-sm">Create your first role to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>System Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Permissions</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} className={role.status === 'suspended' ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="font-medium">{role.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{role.name}</code>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {role.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Suspended</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{role.user_count || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {role.permissions.length}/{allPermissions.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {role.is_system_role ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">System</Badge>
                        ) : (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="icon" title="Edit permissions">
                            <Link to={`/admin/roles/${role.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={role.status === 'active' ? 'Suspend role' : 'Activate role'}
                            onClick={() => {
                              setSelectedRole(role);
                              setSuspendReason('');
                              setIsSuspendDialogOpen(true);
                            }}
                          >
                            <Power className={`h-4 w-4 ${role.status === 'active' ? 'text-amber-600' : 'text-green-600'}`} />
                          </Button>
                          {!role.is_system_role && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedRole(role);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Role Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Create a custom role with specific permissions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Inspector Lead"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role's responsibilities..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRole} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend/Activate Dialog */}
        <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRole?.status === 'active' ? 'Suspend Role' : 'Activate Role'}
              </DialogTitle>
              <DialogDescription>
                {selectedRole?.status === 'active' ? (
                  <>
                    Suspending <span className="font-semibold">{selectedRole?.display_name}</span> will
                    immediately revoke access for all users with this role.
                  </>
                ) : (
                  <>
                    Activating <span className="font-semibold">{selectedRole?.display_name}</span> will
                    restore access for all users with this role.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedRole?.status === 'active' && (selectedRole?.user_count || 0) > 0 && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  This will immediately revoke access for <strong>{selectedRole.user_count}</strong> user(s).
                </p>
              </div>
            )}
            {selectedRole?.status === 'active' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Reason for Suspension <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="e.g., Pending security review"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be permanently recorded in the audit log.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>Cancel</Button>
              <Button
                variant={selectedRole?.status === 'active' ? 'destructive' : 'default'}
                onClick={handleToggleStatus}
                disabled={isSubmitting || (selectedRole?.status === 'active' && !suspendReason.trim())}
              >
                {isSubmitting
                  ? 'Processing...'
                  : selectedRole?.status === 'active'
                  ? 'Suspend Role'
                  : 'Activate Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role "{selectedRole?.display_name}"?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteRole} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
