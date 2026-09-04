import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck, Building2, ClipboardList, Eye, FileText, Loader2, Mail,
  MoreHorizontal, Pencil, RefreshCw, RotateCcw, Search, ShieldX, Ticket, Trash2, UserMinus,
  Users, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ClientUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  nrc: string | null;
  created_at: string;
  ownedBusinesses: any[];
  memberships: any[];
  invitations: any[];
  applications: number;
  certificates: number;
  inspections: number;
  invoices: number;
  supportTickets: number;
};

export default function ClientUsers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ClientUserRow | null>(null);
  const [editing, setEditing] = useState<ClientUserRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', nrc: '' });
  const [deleteTarget, setDeleteTarget] = useState<ClientUserRow | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ClientUserRow | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [
        profilesRes,
        rolesRes,
        businessesRes,
        membershipsRes,
        invitationsRes,
        applicationsRes,
        certificatesRes,
        inspectionsRes,
        invoicesRes,
        ticketsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, admin_roles!inner(status)').eq('admin_roles.status', 'active'),
        supabase.from('client_businesses').select('id, entity_name, branch_name, business_type, parent_business_id, user_id, organization_id, status').order('created_at', { ascending: false }),
        supabase.from('business_user_memberships').select('*').order('created_at', { ascending: false }),
        supabase.from('business_user_invitations').select('*').order('created_at', { ascending: false }),
        supabase.from('certification_applications').select('id, business_id, organization_id, status'),
        supabase.from('certificates').select('id, application_id, organization_id, status'),
        supabase.from('inspections').select('id, application_id, status'),
        supabase.from('invoices').select('id, application_id, organization_id, status'),
        supabase.from('support_tickets').select('id, user_id, status'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (businessesRes.error) throw businessesRes.error;
      if (membershipsRes.error) throw membershipsRes.error;
      if (invitationsRes.error) throw invitationsRes.error;

      setProfiles(profilesRes.data || []);
      setAdminUserIds(new Set((rolesRes.data || []).map((r: any) => r.user_id)));
      setBusinesses(businessesRes.data || []);
      setMemberships(membershipsRes.data || []);
      setInvitations(invitationsRes.data || []);
      setApplications(applicationsRes.data || []);
      setCertificates(certificatesRes.data || []);
      setInspections(inspectionsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setTickets(ticketsRes.data || []);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load client users', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const rows = useMemo<ClientUserRow[]>(() => {
    const childByParent = new Map<string, any[]>();
    businesses.forEach((b) => {
      if (b.parent_business_id) {
        childByParent.set(b.parent_business_id, [...(childByParent.get(b.parent_business_id) || []), b]);
      }
    });

    const accessibleIdsFor = (profileId: string) => {
      const ids = new Set<string>();
      businesses.filter((b) => b.user_id === profileId).forEach((b) => ids.add(b.id));
      memberships
        .filter((m) => m.user_id === profileId && m.status === 'active')
        .forEach((m) => {
          ids.add(m.business_id);
          const business = businessById.get(m.business_id);
          if ((business?.business_type || 'business') === 'business') {
            (childByParent.get(m.business_id) || []).forEach((child) => ids.add(child.id));
          }
        });
      return ids;
    };

    const appById = new Map(applications.map((a) => [a.id, a]));

    return profiles
      .filter((p) => !adminUserIds.has(p.id))
      .map((profile) => {
        const accessibleBusinessIds = accessibleIdsFor(profile.id);
        const ownedBusinesses = businesses.filter((b) => b.user_id === profile.id);
        const userMemberships = memberships
          .filter((m) => m.user_id === profile.id)
          .map((m) => ({ ...m, business: businessById.get(m.business_id) }));
        const pendingInvitations = invitations.filter((i) => i.email?.toLowerCase() === profile.email?.toLowerCase() && i.status === 'pending');
        const userApplications = applications.filter((a) => accessibleBusinessIds.has(a.business_id));
        const userAppIds = new Set(userApplications.map((a) => a.id));
        const userOrgIds = new Set(
          [...accessibleBusinessIds]
            .map((businessId) => businessById.get(businessId)?.organization_id)
            .filter(Boolean),
        );

        return {
          ...profile,
          ownedBusinesses,
          memberships: userMemberships,
          invitations: pendingInvitations,
          applications: userApplications.length,
          certificates: certificates.filter((c) => userAppIds.has(c.application_id) || userOrgIds.has(c.organization_id)).length,
          inspections: inspections.filter((i) => userAppIds.has(appById.get(i.application_id)?.id)).length,
          invoices: invoices.filter((i) => userAppIds.has(i.application_id) || userOrgIds.has(i.organization_id)).length,
          supportTickets: tickets.filter((t) => t.user_id === profile.id).length,
        };
      })
      .filter((row) => {
        const haystack = [
          row.full_name,
          row.email,
          row.phone,
          row.nrc,
          ...row.ownedBusinesses.map((b) => b.branch_name || b.entity_name),
          ...row.memberships.map((m) => m.business?.branch_name || m.business?.entity_name),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(search.toLowerCase());
      });
  }, [profiles, adminUserIds, businesses, memberships, invitations, applications, certificates, inspections, invoices, tickets, search, businessById]);

  const stats = useMemo(() => ({
    clients: rows.length,
    managers: memberships.filter((m) => m.status === 'active').length,
    pending: invitations.filter((i) => i.status === 'pending').length,
    owned: businesses.filter((b) => (b.business_type || 'business') === 'business').length,
  }), [rows.length, memberships, invitations, businesses]);

  const revokeMembership = async (membership: any) => {
    setActionId(membership.id);
    try {
      const { error } = await supabase.from('business_user_memberships').update({ status: 'revoked' }).eq('id', membership.id);
      if (error) throw error;
      toast({ title: 'Manager access revoked' });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Revoke failed', description: e.message });
    } finally {
      setActionId(null);
    }
  };

  const cancelInvitation = async (invitation: any) => {
    setActionId(invitation.id);
    try {
      const { error } = await supabase.from('business_user_invitations').update({ status: 'cancelled' }).eq('id', invitation.id);
      if (error) throw error;
      toast({ title: 'Invitation cancelled' });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Cancel failed', description: e.message });
    } finally {
      setActionId(null);
    }
  };

  const resendInvitation = async (invitation: any) => {
    setActionId(invitation.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-business-user-invitation', {
        body: { business_id: invitation.business_id, email: invitation.email },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Invitation resent' });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Resend failed', description: e.message });
    } finally {
      setActionId(null);
    }
  };

  const openEdit = (row: ClientUserRow) => {
    setEditing(row);
    setEditForm({ full_name: row.full_name || '', phone: row.phone || '', nrc: row.nrc || '' });
  };

  const updateClient = async () => {
    if (!editing || !editForm.full_name.trim()) {
      toast({ variant: 'destructive', title: 'Name is required' });
      return;
    }
    setActionId(editing.id);
    try {
      const { error } = await supabase.functions.invoke('manage-client-user', {
        body: { action: 'update', user_id: editing.id, full_name: editForm.full_name.trim(), phone: editForm.phone.trim(), nrc: editForm.nrc.trim() },
      });
      if (error) throw error;
      toast({ title: 'Client updated' });
      setEditing(null);
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e.message });
    } finally {
      setActionId(null);
    }
  };

  const suspendClient = async () => {
    if (!suspendTarget) return;
    setActionId(suspendTarget.id);
    try {
      const { error } = await supabase.functions.invoke('manage-client-user', {
        body: { action: 'suspend', user_id: suspendTarget.id },
      });
      if (error) throw error;
      toast({ title: 'Client suspended', description: `${suspendTarget.full_name || suspendTarget.email} can no longer sign in.` });
      setSuspendTarget(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Suspension failed', description: e.message });
    } finally {
      setActionId(null);
    }
  };

  const deleteClient = async () => {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    try {
      const { error } = await supabase.functions.invoke('manage-client-user', {
        body: { action: 'delete', user_id: deleteTarget.id },
      });
      if (error) throw error;
      toast({ title: 'Client deleted', description: `${deleteTarget.full_name || deleteTarget.email} and their account access were removed.` });
      setDeleteTarget(null);
      setSelected(null);
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Client Users</h1>
            <p className="text-sm text-muted-foreground">Client portal profiles, owned businesses, delegated manager access, and invitations.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Users} label="Client Users" value={stats.clients} />
          <StatCard icon={Building2} label="Parent Businesses" value={stats.owned} />
          <StatCard icon={BadgeCheck} label="Active Managers" value={stats.managers} />
          <StatCard icon={Mail} label="Pending Invites" value={stats.pending} />
        </div>

        <Card>
          <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Client Directory</CardTitle>
            <div className="relative md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search clients or businesses..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No client users found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Business Access</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Invitations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.full_name || 'Unnamed Client'}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                        <div className="text-xs text-muted-foreground">{row.phone || 'No phone'} {row.nrc ? `· NRC ${row.nrc}` : ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">{row.ownedBusinesses.length} owned</Badge>
                          <Badge variant="secondary">{row.memberships.filter((m) => m.status === 'active').length} managed</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {[...row.ownedBusinesses, ...row.memberships.map((m) => m.business).filter(Boolean)]
                            .slice(0, 2)
                            .map((b) => b.branch_name || b.entity_name)
                            .join(', ') || 'No business access'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{row.applications} apps</span>
                          <span>{row.certificates} certs</span>
                          <span>{row.inspections} inspections</span>
                          <span>{row.invoices} invoices</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.invitations.length ? 'default' : 'outline'}>{row.invitations.length} pending</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${row.full_name || row.email}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="truncate">{row.full_name || row.email}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSelected(row)}>
                              <Eye className="h-4 w-4 mr-2" /> Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(row)} disabled={actionId === row.id}>
                              <Pencil className="h-4 w-4 mr-2" /> Update
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSuspendTarget(row)} disabled={actionId === row.id}>
                              <UserMinus className="h-4 w-4 mr-2 text-amber-600" /> Suspend
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget(row)} disabled={actionId === row.id} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.full_name || selected?.email}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4 text-sm">
                <Info label="Email" value={selected.email} />
                <Info label="Phone" value={selected.phone || 'Not provided'} />
                <Info label="NRC" value={selected.nrc || 'Not provided'} />
                <Info label="Created" value={format(new Date(selected.created_at), 'dd MMM yyyy')} />
              </div>

              <Section title="Owned Businesses" icon={Building2}>
                <BusinessList businesses={selected.ownedBusinesses} />
              </Section>

              <Section title="Managed Businesses And Branches" icon={BadgeCheck}>
                {selected.memberships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No delegated access.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selected.memberships.map((membership) => (
                        <TableRow key={membership.id}>
                          <TableCell>
                            {membership.business ? (
                              <Link className="font-medium text-primary hover:underline" to={`/admin/businesses/${membership.business.id}`}>
                                {membership.business.branch_name || membership.business.entity_name}
                              </Link>
                            ) : 'Unknown business'}
                            {membership.business?.business_type === 'branch' && <Badge variant="secondary" className="ml-2">Branch</Badge>}
                          </TableCell>
                          <TableCell className="capitalize">{membership.role}</TableCell>
                          <TableCell><Badge variant={membership.status === 'active' ? 'default' : 'outline'}>{membership.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {membership.status === 'active' && (
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => revokeMembership(membership)} disabled={actionId === membership.id}>
                                {actionId === membership.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldX className="h-4 w-4 mr-2" />}
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>

              <Section title="Pending Invitations" icon={Mail}>
                {selected.invitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending invitations.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Expires</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selected.invitations.map((invitation) => {
                        const business = businessById.get(invitation.business_id);
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell>{business?.branch_name || business?.entity_name || 'Unknown business'}</TableCell>
                            <TableCell>{format(new Date(invitation.expires_at), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => resendInvitation(invitation)} disabled={actionId === invitation.id}>
                                <RotateCcw className="h-4 w-4 mr-2" /> Resend
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => cancelInvitation(invitation)} disabled={actionId === invitation.id}>
                                <XCircle className="h-4 w-4 mr-2" /> Cancel
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Section>

              <div className="grid gap-3 md:grid-cols-5">
                <SmallMetric icon={FileText} label="Applications" value={selected.applications} />
                <SmallMetric icon={BadgeCheck} label="Certificates" value={selected.certificates} />
                <SmallMetric icon={ClipboardList} label="Inspections" value={selected.inspections} />
                <SmallMetric icon={FileText} label="Invoices" value={selected.invoices} />
                <SmallMetric icon={Ticket} label="Support" value={selected.supportTickets} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Client</DialogTitle>
            <DialogDescription>Update the client profile information. Email is managed by authentication.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="client-name">Full name</label>
              <Input id="client-name" value={editForm.full_name} onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="client-email">Email</label>
              <Input id="client-email" value={editing?.email || ''} disabled />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="client-phone">Phone</label>
                <Input id="client-phone" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="client-nrc">NRC</label>
                <Input id="client-nrc" value={editForm.nrc} onChange={(e) => setEditForm((p) => ({ ...p, nrc: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={actionId === editing?.id}>Cancel</Button>
            <Button onClick={updateClient} disabled={actionId === editing?.id}>
              {actionId === editing?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend client account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately block <strong>{suspendTarget?.full_name || suspendTarget?.email}</strong> from signing in to the client portal. Their records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === suspendTarget?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void suspendClient(); }} disabled={actionId === suspendTarget?.id} className="bg-amber-600 hover:bg-amber-700">
              {actionId === suspendTarget?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Suspend client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>, their authentication account, business access, and related client records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === deleteTarget?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void deleteClient(); }} disabled={actionId === deleteTarget?.id} className="bg-destructive hover:bg-destructive/90">
              {actionId === deleteTarget?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4" /> {title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function BusinessList({ businesses }: { businesses: any[] }) {
  if (businesses.length === 0) return <p className="text-sm text-muted-foreground">No owned businesses.</p>;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {businesses.map((business) => (
        <Link key={business.id} to={`/admin/businesses/${business.id}`} className="rounded-md border p-3 hover:bg-muted/40">
          <div className="font-medium">{business.branch_name || business.entity_name}</div>
          <div className="text-xs text-muted-foreground capitalize">{business.business_type || 'business'} · {business.status || 'active'}</div>
        </Link>
      ))}
    </div>
  );
}

function SmallMetric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
