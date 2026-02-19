import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Send, Clock, CheckCircle, XCircle, RotateCcw, Trash2,
  AlertTriangle, User, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { AdminRoleWithPermissions } from '../lib/dynamicPermissions';

interface Invitation {
  id: string;
  email: string;
  role_id: string;
  invited_by: string;
  status: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  admin_roles?: {
    display_name: string;
    name: string;
  };
  inviter_profile?: {
    full_name: string;
    email: string;
  };
}

interface InvitationsTabProps {
  availableRoles: AdminRoleWithPermissions[];
  currentUserId: string | undefined;
}

export default function InvitationsTab({ availableRoles, currentUserId }: InvitationsTabProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Invite dialog
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch role details and inviter profiles
      const roleIds = [...new Set((data || []).map(i => i.role_id))];
      const inviterIds = [...new Set((data || []).map(i => i.invited_by))];

      const [rolesRes, profilesRes] = await Promise.all([
        roleIds.length > 0
          ? supabase.from('admin_roles').select('id, display_name, name').in('id', roleIds)
          : Promise.resolve({ data: [] }),
        inviterIds.length > 0
          ? supabase.from('profiles').select('id, full_name, email').in('id', inviterIds)
          : Promise.resolve({ data: [] }),
      ]);

      const roleMap = new Map((rolesRes.data || []).map(r => [r.id, r]));
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      const enriched = (data || []).map(inv => ({
        ...inv,
        admin_roles: roleMap.get(inv.role_id) as any,
        inviter_profile: profileMap.get(inv.invited_by) as any,
        // Auto-mark expired
        status: inv.status === 'pending' && isPast(new Date(inv.expires_at)) ? 'expired' : inv.status,
      }));

      setInvitations(enriched);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  async function handleSendInvitation() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { toast.error('Email is required'); return; }
    if (!inviteRoleId) { toast.error('Please select a role'); return; }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if there's already a pending invitation for this email
    const existing = invitations.find(
      i => i.email === email && i.status === 'pending'
    );
    if (existing) {
      toast.error('Pending invitation already exists for this email');
      return;
    }

    setIsSending(true);
    try {
      // Get current user's profile for the inviter name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId!)
        .single();

      // Create invitation record
      const { data: invitation, error: insertError } = await supabase
        .from('admin_invitations')
        .insert({
          email,
          role_id: inviteRoleId,
          invited_by: currentUserId!,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const roleName = availableRoles.find(r => r.id === inviteRoleId)?.display_name || 'Admin';

      // Send email via edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://xdixdqyzjfdqummwpuzg.supabase.co/functions/v1/send-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email,
            role_id: inviteRoleId,
            role_name: roleName,
            inviter_name: inviterProfile?.full_name || 'An administrator',
            invitation_id: invitation.id,
            invitation_token: invitation.token,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation email');
      }

      // Audit log
      await supabase.rpc('log_audit', {
        _action: 'invitation_sent',
        _resource_type: 'admin_invitations',
        _resource_id: invitation.id,
        _metadata: { email, role_id: inviteRoleId, role_name: roleName },
      });

      toast.success('Invitation sent successfully', {
        description: `An invitation email has been sent to ${email}`,
      });

      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRoleId('');
      fetchInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation', { description: error.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleCancelInvitation(invitation: Invitation) {
    if (!confirm(`Cancel the invitation for ${invitation.email}?`)) return;

    try {
      const { error } = await supabase
        .from('admin_invitations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (error) throw error;

      await supabase.rpc('log_audit', {
        _action: 'invitation_cancelled',
        _resource_type: 'admin_invitations',
        _resource_id: invitation.id,
        _metadata: { email: invitation.email },
      });

      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  }

  async function handleResendInvitation(invitation: Invitation) {
    setIsSending(true);
    try {
      // Reset the invitation
      const { error: updateError } = await supabase
        .from('admin_invitations')
        .update({
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          cancelled_at: null,
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId!)
        .single();

      const roleName = invitation.admin_roles?.display_name || 'Admin';

      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://xdixdqyzjfdqummwpuzg.supabase.co/functions/v1/send-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email: invitation.email,
            role_id: invitation.role_id,
            role_name: roleName,
            inviter_name: inviterProfile?.full_name || 'An administrator',
            invitation_id: invitation.id,
            invitation_token: invitation.token,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend');
      }

      await supabase.rpc('log_audit', {
        _action: 'invitation_resent',
        _resource_type: 'admin_invitations',
        _resource_id: invitation.id,
        _metadata: { email: invitation.email },
      });

      toast.success('Invitation resent', {
        description: `A new invitation email was sent to ${invitation.email}`,
      });
      fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation', { description: error.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteInvitation(invitation: Invitation) {
    if (!confirm(`Permanently delete the invitation record for ${invitation.email}?`)) return;

    try {
      const { error } = await supabase
        .from('admin_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;
      toast.success('Invitation deleted');
      fetchInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Failed to delete invitation');
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'expired':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvitations = invitations.filter(inv => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      return (
        inv.email.toLowerCase().includes(s) ||
        inv.admin_roles?.display_name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const stats = {
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    cancelled: invitations.filter(i => i.status === 'cancelled').length,
    expired: invitations.filter(i => i.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('pending')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('accepted')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.accepted}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('cancelled')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('expired')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Input
            placeholder="Search by email or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchInvitations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsInviteOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Invite Admin User
          </Button>
        </div>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredInvitations.length} Invitation{filteredInvitations.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invitations...</div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-1">No invitations found</h3>
              <p className="text-sm">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Send your first admin invitation'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map(invitation => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                        {invitation.admin_roles?.display_name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {invitation.inviter_profile?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(invitation.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {invitation.status === 'pending' ? (
                        <span className={isPast(new Date(invitation.expires_at)) ? 'text-destructive' : 'text-muted-foreground'}>
                          {format(new Date(invitation.expires_at), 'dd MMM yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {(invitation.status === 'pending' || invitation.status === 'expired') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Resend invitation"
                            onClick={() => handleResendInvitation(invitation)}
                            disabled={isSending}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {invitation.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancel invitation"
                            onClick={() => handleCancelInvitation(invitation)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {(invitation.status === 'cancelled' || invitation.status === 'expired') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete record"
                            onClick={() => handleDeleteInvitation(invitation)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Invite Admin User
            </DialogTitle>
            <DialogDescription>
              Send an invitation email to a new admin user. They will receive instructions to create their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Assign Role</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter(r => r.status === 'active')
                    .map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                The invitation will expire in 7 days. The user will receive an email with instructions to join.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvitation} disabled={isSending}>
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
