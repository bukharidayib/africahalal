import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit, Trash2, ShieldCheck, Mail, RefreshCw, X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminLayout } from '../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Inspector {
  id: string;
  user_id: string;
  inspector_number: string;
  full_name: string | null;
  nrc_number: string | null;
  address: string | null;
  is_active: boolean;
  is_manager: boolean;
  created_at: string;
  profiles?: { email: string; full_name: string };
  business_count?: number;
}

interface Organization { id: string; name: string; }
interface Invitation {
  id: string; email: string; full_name: string | null; is_manager: boolean;
  status: string; created_at: string; expires_at: string; token: string;
  organization_ids: string[] | null;
}

const emptyForm = {
  email: '', full_name: '', nrc_number: '', address: '',
  organization_ids: [] as string[], managed_inspector_ids: [] as string[],
  is_manager: false,
};

export default function Inspectors() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspector' | 'manager'>('inspector');
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [editing, setEditing] = useState<Inspector | null>(null);
  const [editOrgIds, setEditOrgIds] = useState<string[]>([]);
  const [editManagedIds, setEditManagedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Inspector | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setIsLoading(true);
    try {
      const [inspRes, orgRes, invRes] = await Promise.all([
        supabase.from('inspectors').select('*').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
        (supabase as any).from('inspector_invitations').select('*').order('created_at', { ascending: false }),
      ]);

      const inspData = inspRes.data || [];
      const userIds = inspData.map((i: any) => i.user_id);
      const inspectorIds = inspData.map((i: any) => i.id);

      const [profRes, orgLinkRes] = await Promise.all([
        userIds.length ? supabase.from('profiles').select('id, email, full_name').in('id', userIds) : Promise.resolve({ data: [] }),
        inspectorIds.length ? (supabase as any).from('inspector_organizations').select('inspector_id, organization_id').in('inspector_id', inspectorIds) : Promise.resolve({ data: [] }),
      ]);

      const profMap = new Map((profRes.data || []).map((p: any) => [p.id, p]));
      const orgCount = new Map<string, number>();
      (orgLinkRes.data || []).forEach((row: any) => {
        orgCount.set(row.inspector_id, (orgCount.get(row.inspector_id) || 0) + 1);
      });

      setInspectors(inspData.map((i: any) => ({
        ...i,
        profiles: profMap.get(i.user_id),
        business_count: orgCount.get(i.id) || 0,
      })));
      setOrganizations(orgRes.data || []);
      setInvitations((invRes.data as any[] || []).filter((i: any) => i.status === 'pending'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inspectors');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setActiveTab('inspector');
    setOrgSearch('');
  }

  async function handleSendInvitation() {
    if (!form.email.trim() || !form.full_name.trim()) {
      toast.error('Email and full name are required');
      return;
    }
    if (form.organization_ids.length === 0) {
      toast.error('Please assign at least one business');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isManager = activeTab === 'manager' || form.is_manager;

      const { data: invitation, error: invError } = await (supabase as any)
        .from('inspector_invitations')
        .insert({
          email: form.email.trim().toLowerCase(),
          full_name: form.full_name.trim(),
          nrc_number: form.nrc_number.trim() || null,
          address: form.address.trim() || null,
          organization_ids: form.organization_ids,
          managed_inspector_ids: isManager ? form.managed_inspector_ids : [],
          is_manager: isManager,
          invited_by: user.id,
        })
        .select()
        .single();

      if (invError) throw invError;

      const businessNames = organizations.filter(o => form.organization_ids.includes(o.id)).map(o => o.name);
      const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

      const { error: emailError } = await supabase.functions.invoke('send-inspector-invitation', {
        body: {
          email: form.email.trim().toLowerCase(),
          full_name: form.full_name.trim(),
          invitation_id: invitation.id,
          invitation_token: invitation.token,
          inviter_name: inviterProfile?.full_name || 'AHIS Administrator',
          is_manager: isManager,
          business_names: businessNames,
        },
      });

      if (emailError) {
        console.warn('Email send failed:', emailError);
        toast.warning('Invitation created but email may not have sent');
      } else {
        toast.success(`Invitation sent to ${form.email}`);
      }

      setIsAddOpen(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendInvitation(inv: Invitation) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single();
      const businessNames = organizations.filter(o => (inv.organization_ids || []).includes(o.id)).map(o => o.name);

      await supabase.functions.invoke('send-inspector-invitation', {
        body: {
          email: inv.email, full_name: inv.full_name || '',
          invitation_id: inv.id, invitation_token: inv.token,
          inviter_name: inviterProfile?.full_name || 'AHIS Administrator',
          is_manager: inv.is_manager, business_names: businessNames,
        },
      });
      toast.success('Invitation resent');
    } catch (err) {
      toast.error('Failed to resend');
    }
  }

  async function cancelInvitation(inv: Invitation) {
    const { error } = await (supabase as any).from('inspector_invitations').update({
      status: 'cancelled', cancelled_at: new Date().toISOString(),
    }).eq('id', inv.id);
    if (error) { toast.error('Failed to cancel'); return; }
    toast.success('Invitation cancelled');
    fetchAll();
  }

  async function openEdit(insp: Inspector) {
    setEditing(insp);
    const [orgRes, mgrRes] = await Promise.all([
      (supabase as any).from('inspector_organizations').select('organization_id').eq('inspector_id', insp.id),
      (supabase as any).from('inspector_manager_inspectors').select('inspector_id').eq('manager_id', insp.id),
    ]);
    setEditOrgIds((orgRes.data || []).map((r: any) => r.organization_id));
    setEditManagedIds((mgrRes.data || []).map((r: any) => r.inspector_id));
  }

  async function saveEdit() {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      const { error: upErr } = await supabase.from('inspectors').update({
        full_name: editing.full_name, nrc_number: editing.nrc_number, address: editing.address,
        is_manager: editing.is_manager, is_active: editing.is_active,
      }).eq('id', editing.id);
      if (upErr) throw upErr;

      // Sync orgs
      await (supabase as any).from('inspector_organizations').delete().eq('inspector_id', editing.id);
      if (editOrgIds.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any).from('inspector_organizations').insert(
          editOrgIds.map(oid => ({ inspector_id: editing.id, organization_id: oid, assigned_by: user?.id }))
        );
      }

      // Sync managed inspectors
      await (supabase as any).from('inspector_manager_inspectors').delete().eq('manager_id', editing.id);
      if (editing.is_manager && editManagedIds.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any).from('inspector_manager_inspectors').insert(
          editManagedIds.filter(id => id !== editing.id).map(id => ({
            manager_id: editing.id, inspector_id: id, assigned_by: user?.id,
          }))
        );
      }

      toast.success('Inspector updated');
      setEditing(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('inspectors').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Inspector deleted');
      setDeleteTarget(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  const filteredInspectors = inspectors.filter(i => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return [i.inspector_number, i.full_name, i.profiles?.full_name, i.profiles?.email, i.nrc_number]
      .some(v => v?.toLowerCase().includes(s));
  });

  const filteredOrgs = organizations.filter(o => o.name.toLowerCase().includes(orgSearch.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Inspectors</h1>
            <p className="text-muted-foreground">Manage inspectors and inspector managers</p>
          </div>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Invite Inspector
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{inspectors.filter(i => i.is_active).length}</div><p className="text-sm text-muted-foreground">Active</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{inspectors.filter(i => i.is_manager).length}</div><p className="text-sm text-muted-foreground">Managers</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-muted-foreground">{inspectors.filter(i => !i.is_active).length}</div><p className="text-sm text-muted-foreground">Inactive</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">{invitations.length}</div><p className="text-sm text-muted-foreground">Pending Invitations</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name, email, NRC, number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </CardContent>
        </Card>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Pending Invitations ({invitations.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Sent</TableHead><TableHead>Expires</TableHead><TableHead className="w-32">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invitations.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>{inv.full_name || '—'}</TableCell>
                      <TableCell><Badge variant={inv.is_manager ? 'default' : 'secondary'}>{inv.is_manager ? 'Manager' : 'Inspector'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(inv.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(inv.expires_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Resend" onClick={() => resendInvitation(inv)}><RefreshCw className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Cancel" onClick={() => cancelInvitation(inv)}><X className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Inspectors table */}
        <Card>
          <CardHeader><CardTitle>{filteredInspectors.length} Inspector{filteredInspectors.length !== 1 ? 's' : ''}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredInspectors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No inspectors found</h3>
                <p className="text-sm">Invite your first inspector to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Inspector #</TableHead>
                    <TableHead>NRC</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Businesses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspectors.map(insp => (
                    <TableRow key={insp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{insp.full_name || insp.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{insp.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{insp.inspector_number}</TableCell>
                      <TableCell className="text-sm">{insp.nrc_number || '—'}</TableCell>
                      <TableCell>
                        {insp.is_manager
                          ? <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Manager</Badge>
                          : <Badge variant="secondary">Inspector</Badge>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{insp.business_count || 0}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={insp.is_active ? 'default' : 'secondary'}>
                          {insp.is_active ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {insp.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(insp)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteTarget(insp)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add invitation dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite New Inspector</DialogTitle>
            <DialogDescription>Send an invitation email. The recipient will set their password and gain access to the Inspector Portal.</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setForm({ ...form, is_manager: v === 'manager' }); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inspector">Inspector</TabsTrigger>
              <TabsTrigger value="manager">Inspector Manager</TabsTrigger>
            </TabsList>

            <TabsContent value="inspector" className="space-y-4 mt-4">
              <SharedInspectorFields form={form} setForm={setForm} organizations={filteredOrgs} orgSearch={orgSearch} setOrgSearch={setOrgSearch} />
            </TabsContent>

            <TabsContent value="manager" className="space-y-4 mt-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-primary"><ShieldCheck className="h-4 w-4" /> Inspector Manager privileges</p>
                <p className="text-xs text-muted-foreground mt-1">This user will see and supervise the inspectors assigned below across the businesses they're linked to.</p>
              </div>
              <SharedInspectorFields form={form} setForm={setForm} organizations={filteredOrgs} orgSearch={orgSearch} setOrgSearch={setOrgSearch} />
              <div className="space-y-2">
                <Label>Inspectors to oversee</Label>
                <ScrollArea className="h-40 border rounded-md p-2">
                  {inspectors.filter(i => !i.is_manager).map(i => (
                    <label key={i.id} className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer">
                      <Checkbox
                        checked={form.managed_inspector_ids.includes(i.id)}
                        onCheckedChange={(c) => {
                          setForm({
                            ...form,
                            managed_inspector_ids: c
                              ? [...form.managed_inspector_ids, i.id]
                              : form.managed_inspector_ids.filter(x => x !== i.id),
                          });
                        }}
                      />
                      <span className="text-sm">{i.full_name || i.profiles?.full_name} <span className="text-muted-foreground">({i.inspector_number})</span></span>
                    </label>
                  ))}
                  {inspectors.filter(i => !i.is_manager).length === 0 && <p className="text-sm text-muted-foreground p-2">No inspectors available yet.</p>}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSendInvitation} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inspector</DialogTitle>
            <DialogDescription>Update profile, assignments and role.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full Name</Label><Input value={editing.full_name || ''} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>NRC Number</Label><Input value={editing.nrc_number || ''} onChange={(e) => setEditing({ ...editing, nrc_number: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Textarea value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} rows={2} /></div>



              <div className="space-y-2">
                <Label>Assigned Businesses</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  {organizations.map(o => (
                    <label key={o.id} className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer">
                      <Checkbox checked={editOrgIds.includes(o.id)}
                        onCheckedChange={(c) => setEditOrgIds(c ? [...editOrgIds, o.id] : editOrgIds.filter(x => x !== o.id))} />
                      <span className="text-sm">{o.name}</span>
                    </label>
                  ))}
                </ScrollArea>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <Checkbox checked={editing.is_manager} onCheckedChange={(c) => setEditing({ ...editing, is_manager: !!c })} />
                <div className="flex-1"><Label className="cursor-pointer">Inspector Manager privileges</Label><p className="text-xs text-muted-foreground">Allow this user to oversee other inspectors</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <Checkbox checked={editing.is_active} onCheckedChange={(c) => setEditing({ ...editing, is_active: !!c })} />
                <div className="flex-1"><Label className="cursor-pointer">Active</Label></div>
              </div>

              {editing.is_manager && (
                <div className="space-y-2">
                  <Label>Inspectors overseen</Label>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    {inspectors.filter(i => i.id !== editing.id && !i.is_manager).map(i => (
                      <label key={i.id} className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox checked={editManagedIds.includes(i.id)}
                          onCheckedChange={(c) => setEditManagedIds(c ? [...editManagedIds, i.id] : editManagedIds.filter(x => x !== i.id))} />
                        <span className="text-sm">{i.full_name || i.profiles?.full_name} <span className="text-muted-foreground">({i.inspector_number})</span></span>
                      </label>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inspector?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.full_name || deleteTarget?.profiles?.full_name}</strong> and all their business and manager assignments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function SharedInspectorFields({ form, setForm, organizations, orgSearch, setOrgSearch }: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="inspector@example.com" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-2"><Label>Full Name *</Label><Input placeholder="John Mwanza" value={form.full_name} onChange={(e: any) => setForm({ ...form, full_name: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>NRC Number</Label><Input placeholder="123456/78/9" value={form.nrc_number} onChange={(e: any) => setForm({ ...form, nrc_number: e.target.value })} /></div>
        <div className="space-y-2"><Label>Address</Label><Input placeholder="Plot 123, Lusaka" value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></div>
      </div>

      <div className="space-y-2">
        <Label>Assigned Businesses *</Label>
        <Input placeholder="Search businesses..." value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)} className="h-9" />
        <ScrollArea className="h-40 border rounded-md p-2">
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No businesses found.</p>
          ) : organizations.map((o: Organization) => (
            <label key={o.id} className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer">
              <Checkbox
                checked={form.organization_ids.includes(o.id)}
                onCheckedChange={(c) => {
                  setForm({
                    ...form,
                    organization_ids: c
                      ? [...form.organization_ids, o.id]
                      : form.organization_ids.filter((x: string) => x !== o.id),
                  });
                }}
              />
              <span className="text-sm">{o.name}</span>
            </label>
          ))}
        </ScrollArea>
        {form.organization_ids.length > 0 && <p className="text-xs text-muted-foreground">{form.organization_ids.length} business(es) selected</p>}
      </div>

      <div className="space-y-2">
        <Label>Specializations</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map(s => (
            <Badge key={s} variant={form.specializations.includes(s) ? 'default' : 'outline'} className="cursor-pointer"
              onClick={() => setForm({ ...form, specializations: form.specializations.includes(s) ? form.specializations.filter((x: string) => x !== s) : [...form.specializations, s] })}>
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Regions</Label>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map(r => (
            <Badge key={r} variant={form.regions.includes(r) ? 'default' : 'outline'} className="cursor-pointer gap-1"
              onClick={() => setForm({ ...form, regions: form.regions.includes(r) ? form.regions.filter((x: string) => x !== r) : [...form.regions, r] })}>
              <MapPin className="h-3 w-3" />{r}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}
