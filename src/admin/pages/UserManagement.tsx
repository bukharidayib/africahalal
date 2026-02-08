import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Plus,
  User,
  Mail,
  Calendar,
  Trash2,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { fetchAllRoles, AdminRoleWithPermissions } from '../lib/dynamicPermissions';

interface UserRoleDetail {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  admin_roles?: {
    id: string;
    display_name: string;
    name: string;
  };
  profiles?: {
    email: string;
    full_name: string;
  };
}

export default function UserManagement() {
  const { permissions, user: currentUser } = useAdminAuthContext();
  const [userRoles, setUserRoles] = useState<UserRoleDetail[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AdminRoleWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Edit/Change Role Dialog State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<UserRoleDetail | null>(null);
  const [newRoleId, setNewRoleId] = useState('');
  const [changeReason, setChangeReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    await Promise.all([fetchUserRoles(), loadRoles()]);
    setIsLoading(false);
  }

  async function loadRoles() {
    const roles = await fetchAllRoles();
    setAvailableRoles(roles);
  }

  async function fetchUserRoles() {
    try {
      // Fetch user roles with role details
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role_id,
          assigned_at,
          assigned_by,
          admin_roles (id, display_name, name)
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = ((data as any[]) || []).map((r: any) => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const rolesWithProfiles = ((data as any[]) || []).map((r: any) => ({
          ...r,
          profiles: profileMap.get(r.user_id),
        })) as UserRoleDetail[];

        setUserRoles(rolesWithProfiles);
      } else {
        setUserRoles([]);
      }

    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast.error('Failed to load users');
    }
  }

  async function handleAddRole() {
    if (!newUserEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!selectedRoleId) {
      toast.error('Role is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newUserEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast.error('User not found', {
          description: 'User must be signed up first.',
        });
        return;
      }

      // 2. Check strict "One Role Per User" policy
      const existingRole = userRoles.find(r => r.user_id === profile.id);
      if (existingRole) {
        toast.error('User already has a role', {
          description: `User is already assigned as ${existingRole.admin_roles?.display_name}. Edit their role instead.`,
        });
        return;
      }

      // 3. Assign Role
      const { error } = await (supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role_id: selectedRoleId,
          assigned_by: currentUser?.id,
        } as any) as any);

      if (error) throw error;

      // 4. Audit Log
      await supabase.rpc('log_audit', {
        _action: 'role_assigned',
        _resource_type: 'user_roles',
        _resource_id: profile.id,
        _reason_code: 'initial_assignment',
        _metadata: {
          email: newUserEmail,
          role_id: selectedRoleId,
          role_name: availableRoles.find(r => r.id === selectedRoleId)?.display_name
        },
      });

      toast.success('Role assigned successfully');
      setIsAddDialogOpen(false);
      setNewUserEmail('');
      setSelectedRoleId('');
      fetchUserRoles();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangeRole() {
    if (!editingUserRole || !newRoleId) return;
    if (!changeReason.trim()) {
      toast.error('Reason is required', {
        description: 'Please explain why this user\'s role is being changed.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update user role
      const { error } = await supabase
        .from('user_roles')
        .update({
          role_id: newRoleId,
          assigned_by: currentUser?.id, // track who changed it
          assigned_at: new Date().toISOString() // update timestamp
        })
        .eq('id', editingUserRole.id);

      if (error) throw error;

      // Log Audit
      await supabase.rpc('log_audit', {
        _action: 'role_changed',
        _resource_type: 'user_roles',
        _resource_id: editingUserRole.user_id,
        _reason_code: 'role_change',
        _metadata: {
          previous_role_id: editingUserRole.role_id,
          new_role_id: newRoleId,
          reason: changeReason
        }
      });

      toast.success('User role updated');
      setIsEditOpen(false);
      setEditingUserRole(null);
      setChangeReason('');
      setNewRoleId('');
      fetchUserRoles();

    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveRole(userRole: UserRoleDetail) {
    if (userRole.user_id === currentUser?.id) {
      toast.error('Cannot remove your own role');
      return;
    }

    // Use a confirm dialog or simpler confirm for now
    if (!confirm(`Are you sure you want to remove access for ${userRole.profiles?.full_name}?`)) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRole.id);

      if (error) throw error;

      await supabase.rpc('log_audit', {
        _action: 'role_removed',
        _resource_type: 'user_roles',
        _resource_id: userRole.user_id,
        _reason_code: 'admin_action',
        _metadata: { role_id: userRole.role_id },
      });

      toast.success('Access removed successfully');
      fetchUserRoles();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  }

  const filteredUsers = userRoles.filter(ur => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      ur.profiles?.email.toLowerCase().includes(search) ||
      ur.profiles?.full_name.toLowerCase().includes(search) ||
      ur.admin_roles?.display_name.toLowerCase().includes(search)
    );
  });

  if (!permissions.canManageUsers) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to manage users.
          </p>
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
            <h1 className="text-2xl font-bold font-serif">User Management</h1>
            <p className="text-muted-foreground">
              Manage admin users and assign roles.
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Admin Role</DialogTitle>
                <DialogDescription>
                  Grant admin access to a registered user.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    User must have an existing account.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRole} disabled={isSubmitting}>
                  {isSubmitting ? 'Assigning...' : 'Assign Role'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredUsers.length} Admin User{filteredUsers.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No users found</h3>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search' : 'Add your first admin user'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userRole) => (
                    <TableRow key={userRole.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{userRole.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {userRole.profiles?.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                          {userRole.admin_roles?.display_name || 'Unknown Role'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(userRole.assigned_at), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingUserRole(userRole);
                              setNewRoleId(userRole.role_id);
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {userRole.user_id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveRole(userRole)}
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

        {/* Edit Role Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Changing the role for <span className="font-semibold">{editingUserRole?.profiles?.full_name}</span>.
                This action will be audited.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select value={newRoleId} onValueChange={setNewRoleId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Reason for Change <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="e.g., Promotion to Senior Inspector"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  This reason will be permanently recorded in the audit log.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleChangeRole} disabled={isSubmitting || !changeReason.trim()}>
                {isSubmitting ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
