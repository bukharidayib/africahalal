import { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Plus,
  User,
  Mail,
  Calendar,
  Trash2,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { AdminRole, getRoleDisplayName } from '../lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UserRole {
  id: string;
  user_id: string;
  role: AdminRole;
  assigned_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

const roleColors: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  certification_officer: 'bg-blue-100 text-blue-800',
  finance_officer: 'bg-green-100 text-green-800',
  it_system_auditor: 'bg-amber-100 text-amber-800',
};

export default function UserManagement() {
  const { permissions, user: currentUser } = useAdminAuthContext();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AdminRole>('certification_officer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserRoles();
  }, []);

  async function fetchUserRoles() {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = (data || []).map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const rolesWithProfiles = (data || []).map(r => ({
        ...r,
        profiles: profileMap.get(r.user_id),
      })) as UserRole[];

      setUserRoles(rolesWithProfiles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddRole() {
    if (!newUserEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // First, find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newUserEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast.error('User not found', {
          description: 'Make sure the user has signed up first.',
        });
        return;
      }

      // Check if role already exists
      const existingRole = userRoles.find(
        r => r.user_id === profile.id && r.role === newUserRole
      );
      if (existingRole) {
        toast.error('Role already assigned', {
          description: 'This user already has this role.',
        });
        return;
      }

      // Add the role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role: newUserRole,
          assigned_by: currentUser?.id,
        });

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_audit', {
        _action: 'role_assigned',
        _resource_type: 'user_roles',
        _resource_id: profile.id,
        _reason_code: 'admin_action',
        _metadata: { email: newUserEmail, role: newUserRole },
      });

      toast.success('Role assigned successfully');
      setIsAddDialogOpen(false);
      setNewUserEmail('');
      setNewUserRole('certification_officer');
      fetchUserRoles();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to assign role');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveRole(userRole: UserRole) {
    if (userRole.user_id === currentUser?.id) {
      toast.error('Cannot remove your own role');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRole.id);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_audit', {
        _action: 'role_removed',
        _resource_type: 'user_roles',
        _resource_id: userRole.user_id,
        _reason_code: 'admin_action',
        _metadata: { role: userRole.role },
      });

      toast.success('Role removed successfully');
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
      ur.role.toLowerCase().includes(search)
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
              Manage admin roles and permissions
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
                    The user must have an existing account.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AdminRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certification_officer">Certification Officer</SelectItem>
                      <SelectItem value="finance_officer">Finance Officer</SelectItem>
                      <SelectItem value="it_system_auditor">IT System Auditor</SelectItem>
                      <SelectItem value="super_admin">Super Administrator</SelectItem>
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
                    <TableHead className="w-20">Actions</TableHead>
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
                        <Badge className={roleColors[userRole.role]}>
                          {getRoleDisplayName(userRole.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(userRole.assigned_at), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
