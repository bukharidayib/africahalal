import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, Eye, Loader2, AlertTriangle, CalendarClock, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type SubStatus = 'active' | 'expiring' | 'expired' | 'none';

interface BusinessRow {
  id: string;
  entity_name: string;
  branch_name?: string | null;
  business_type?: 'business' | 'branch' | string;
  parent_business_id?: string | null;
  pacra_number: string;
  sector?: string | null;
  user_id: string | null;
  organization_id: string | null;
  created_at: string;
  owner_email?: string | null;
  owner_name?: string | null;
  active_certs?: number;
  active_cert_number?: string | null;
  open_apps?: number;
  outstanding?: number;
  days_to_expiry?: number | null;
  sub_status?: SubStatus;
  parent_name?: string | null;
  inherited_pacra_number?: string | null;
  branch_count?: number;
  directory_visible?: boolean;
  directory_status?: 'listed' | 'hidden' | 'pending_review' | string;
}

const FILTERS: { key: 'all' | SubStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring ≤30d' },
  { key: 'expired', label: 'Expired' },
  { key: 'none', label: 'No certificate' },
];

export default function Businesses() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | SubStatus>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'business' | 'branch'>('all');
  const [overdueSubs, setOverdueSubs] = useState(0);
  const [toDelete, setToDelete] = useState<BusinessRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pacraCheck, setPacraCheck] = useState<'idle' | 'checking' | 'available' | 'registered' | 'error'>('idle');
  const [pacraCheckMessage, setPacraCheckMessage] = useState('');
  const [createForm, setCreateForm] = useState({
    entity_name: '',
    pacra_number: '',
    sector: '',
    address: '',
    city: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'active',
    directory_visible: true,
  });

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-business', {
        body: { business_id: toDelete.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Business deleted', description: `${toDelete.entity_name} and all related records were removed.` });
      setToDelete(null);
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const pacraNumber = createForm.pacra_number.trim().toUpperCase();
    if (!pacraNumber) {
      setPacraCheck('idle');
      setPacraCheckMessage('');
      return;
    }

    setPacraCheck('checking');
    setPacraCheckMessage('Checking PACRA number…');
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('registration_number', pacraNumber)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setPacraCheck('error');
        setPacraCheckMessage('Could not verify PACRA number. You can still submit and the server will verify it.');
      } else if (data) {
        setPacraCheck('registered');
        setPacraCheckMessage(`Already registered: ${data.name}`);
      } else {
        setPacraCheck('available');
        setPacraCheckMessage('PACRA number is available');
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [createForm.pacra_number]);

  const resetCreateForm = () => setCreateForm({
    entity_name: '',
    pacra_number: '',
    sector: '',
    address: '',
    city: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'active',
    directory_visible: true,
  });

  const handleCreateBusiness = async () => {
    if (!createForm.entity_name.trim() || !createForm.pacra_number.trim() || !createForm.contact_email.trim()) {
      toast({ variant: 'destructive', title: 'Missing registration details', description: 'Business name, PACRA number and owner email are required.' });
      return;
    }
    if (pacraCheck === 'registered') {
      toast({ variant: 'destructive', title: 'PACRA number already registered', description: pacraCheckMessage });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-business', {
        body: {
          business_name: createForm.entity_name.trim(),
          pacra_number: createForm.pacra_number.trim(),
          sector: createForm.sector.trim() || 'General',
          address: createForm.address.trim() || null,
          city: createForm.city.trim() || null,
          status: createForm.status,
          contact_name: createForm.contact_name.trim() || null,
          contact_email: createForm.contact_email.trim().toLowerCase(),
          contact_phone: createForm.contact_phone.trim() || null,
          directory_visible: createForm.directory_visible,
        },
      });
      if (error) {
        let serverMessage = error.message;
        const functionError = error as any;
        try {
          const responseBody = functionError.context && typeof functionError.context.json === 'function'
            ? await functionError.context.json()
            : null;
          if (responseBody?.error) serverMessage = responseBody.error;
        } catch {
          // The response may already have been consumed by supabase-js.
        }
        throw new Error(serverMessage);
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      const invitationSent = Boolean((data as any)?.invitation_sent);
      const invitationError = (data as any)?.invitation_error as string | null;
      toast({
        title: invitationSent ? 'Business registered' : 'Business registered; invitation pending',
        description: invitationSent
          ? 'The business owner invitation email has been sent.'
          : `The business was saved, but the invitation email could not be sent${invitationError ? `: ${invitationError}` : '. Check the email service configuration.'}`,
        variant: invitationSent ? 'default' : 'destructive',
      });
      resetCreateForm();
      setCreateOpen(false);
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Registration failed', description: e.message });
    } finally {
      setCreating(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: bizs, error } = await supabase
        .from('client_businesses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (bizs || []) as BusinessRow[];

      const userIds = Array.from(new Set(list.map((b) => b.user_id).filter(Boolean)));
      const orgIds = Array.from(new Set(list.map((b) => b.organization_id).filter(Boolean) as string[]));
      const businessMap = new Map(list.map((b) => [b.id, b]));
      const branchCountByParent = new Map<string, number>();
      list.forEach((b) => {
        if (b.parent_business_id) {
          branchCountByParent.set(b.parent_business_id, (branchCountByParent.get(b.parent_business_id) || 0) + 1);
        }
      });

      const [{ data: profiles }, { data: orgs }, { data: certs }, { data: apps }, { data: invs }] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id, email, full_name').in('id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from('organizations').select('id, sector').in('id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from('certificates').select('organization_id, certificate_number, status, expiry_date').in('organization_id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
        list.length
          ? supabase.from('certification_applications').select('id, business_id, organization_id, status').in('business_id', list.map((b) => b.id))
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from('invoices').select('organization_id, amount, total, status').in('organization_id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const sectorByOrg = new Map((orgs || []).map((o: any) => [o.id, o.sector]));
      const activeCertByOrg = new Map<string, number>();
      const latestExpiryByOrg = new Map<string, string>();
      const activeCertNumberByOrg = new Map<string, string>();
      (certs || []).forEach((c: any) => {
        if (c.status === 'active') {
          activeCertByOrg.set(c.organization_id, (activeCertByOrg.get(c.organization_id) || 0) + 1);
          const cur = latestExpiryByOrg.get(c.organization_id);
          if (!cur || new Date(c.expiry_date) > new Date(cur)) {
            latestExpiryByOrg.set(c.organization_id, c.expiry_date);
            activeCertNumberByOrg.set(c.organization_id, c.certificate_number);
          }
        }
      });
      const appsByBiz = new Map<string, number>();
      (apps || []).forEach((a: any) => {
        if (!['expired', 'rejected', 'withdrawn'].includes(a.status)) {
          appsByBiz.set(a.business_id, (appsByBiz.get(a.business_id) || 0) + 1);
        }
      });
      const outByOrg = new Map<string, number>();
      (invs || []).forEach((i: any) => {
        if (i.status !== 'paid' && i.status !== 'cancelled') {
          outByOrg.set(i.organization_id, (outByOrg.get(i.organization_id) || 0) + Number(i.total || i.amount || 0));
        }
      });

      const enriched: BusinessRow[] = list.map((b) => {
        const p: any = profileMap.get(b.user_id);
        const orgId = b.organization_id || '';
        const parent = b.parent_business_id ? businessMap.get(b.parent_business_id) : null;
        const expiry = latestExpiryByOrg.get(orgId);
        const activeCount = orgId ? (activeCertByOrg.get(orgId) || 0) : 0;
        let subStatus: SubStatus = 'none';
        let daysToExpiry: number | null = null;
        if (activeCount > 0 && expiry) {
          daysToExpiry = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
          if (daysToExpiry < 0) subStatus = 'expired';
          else if (daysToExpiry <= 30) subStatus = 'expiring';
          else subStatus = 'active';
        }
        return {
          ...b,
          sector: orgId ? sectorByOrg.get(orgId) || null : null,
          owner_email: p?.email || null,
          owner_name: p?.full_name || null,
          parent_name: parent?.entity_name || null,
          inherited_pacra_number: parent?.pacra_number || b.pacra_number,
          branch_count: branchCountByParent.get(b.id) || 0,
          active_certs: activeCount,
          active_cert_number: orgId ? (activeCertNumberByOrg.get(orgId) || null) : null,
          open_apps: appsByBiz.get(b.id) || 0,
          outstanding: orgId ? (outByOrg.get(orgId) || 0) : 0,
          days_to_expiry: daysToExpiry,
          sub_status: subStatus,
        };
      });
      setRows(enriched);

      // Aggregate: count past-due subscriptions across all businesses
      if (orgIds.length) {
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', orgIds)
          .in('status', ['active', 'suspended'])
          .lt('end_date', today);
        setOverdueSubs(count || 0);
      } else {
        setOverdueSubs(0);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, active: 0, expiring: 0, expired: 0, none: 0 };
    rows.forEach((r) => { if (r.sub_status) c[r.sub_status]++; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (kindFilter !== 'all') list = list.filter((r) => (r.business_type || 'business') === kindFilter);
    if (filter !== 'all') list = list.filter((r) => r.sub_status === filter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) =>
        r.entity_name?.toLowerCase().includes(s) ||
        r.branch_name?.toLowerCase().includes(s) ||
        r.parent_name?.toLowerCase().includes(s) ||
        r.pacra_number?.toLowerCase().includes(s) ||
        r.inherited_pacra_number?.toLowerCase().includes(s) ||
        r.owner_email?.toLowerCase().includes(s),
      );
    }
    return list;
  }, [rows, search, filter, kindFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Businesses
          </h1>
          <p className="text-muted-foreground">Unified hub for every certified business — applications, certificates, subscriptions, invoices, documents and history.</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Register Business
          </Button>
        </div>

        {(counts.expiring > 0 || counts.expired > 0 || overdueSubs > 0) && (
          <div className="space-y-2">
            {(counts.expiring > 0 || counts.expired > 0) && (
              <Alert className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-sm">Certificate attention required</AlertTitle>
                <AlertDescription className="text-xs flex flex-wrap gap-3 mt-1">
                  {counts.expired > 0 && (
                    <button onClick={() => setFilter('expired')} className="underline-offset-2 hover:underline text-destructive font-medium">
                      {counts.expired} expired
                    </button>
                  )}
                  {counts.expiring > 0 && (
                    <button onClick={() => setFilter('expiring')} className="underline-offset-2 hover:underline text-amber-700 dark:text-amber-400 font-medium">
                      {counts.expiring} expiring within 30 days
                    </button>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {overdueSubs > 0 && (
              <Alert variant="destructive">
                <CalendarClock className="h-4 w-4" />
                <AlertTitle className="text-sm">{overdueSubs} subscription(s) past-due</AlertTitle>
                <AlertDescription className="text-xs">Open the relevant business to renew or cancel.</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Card>
          <CardHeader className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, PACRA #, or owner email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'business', 'branch'] as const).map((kind) => (
                <Button
                  key={kind}
                  variant={kindFilter === kind ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setKindFilter(kind)}
                >
                  {kind === 'all' ? 'All units' : kind === 'business' ? 'Parent businesses' : 'Branches'}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  variant={filter === f.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span className="ml-2 opacity-70 text-xs">{counts[f.key] ?? 0}</span>
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No businesses found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>PACRA #</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Directory</TableHead>
                    <TableHead>Open Apps</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{r.business_type === 'branch' ? (r.branch_name || r.entity_name) : r.entity_name}</span>
                          {r.business_type === 'branch' ? (
                            <span className="text-xs text-muted-foreground">Branch of {r.parent_name || 'parent business'}</span>
                          ) : r.branch_count ? (
                            <span className="text-xs text-muted-foreground">{r.branch_count} branch(es)</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.inherited_pacra_number || r.pacra_number}</TableCell>
                      <TableCell className="text-sm">{r.sector || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{r.owner_name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{r.owner_email || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.active_certs && r.active_certs > 0 ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600/90 text-white">
                            Active{r.active_cert_number ? ` · ${r.active_cert_number}` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <SubBadge status={r.sub_status} days={r.days_to_expiry} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.directory_visible && r.directory_status === 'listed' ? 'default' : 'outline'} className="capitalize">
                          {r.directory_visible ? (r.directory_status || 'listed').replace(/_/g, ' ') : 'Hidden'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.open_apps ? 'secondary' : 'outline'}>{r.open_apps}</Badge>
                      </TableCell>
                      <TableCell className={r.outstanding ? 'text-destructive font-semibold' : ''}>
                        {r.outstanding ? `ZMW ${r.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/admin/businesses/${r.id}`}><Eye className="h-4 w-4 mr-1" /> Open</Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setToDelete(r)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this business?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <strong>{toDelete?.entity_name}</strong>. This will also remove all
              related applications, certificates, inspections, invoices, subscriptions, quotations, NCNs, messages,
              documents and history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Register Business</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>PACRA # *</Label>
                <div className="relative">
                  <Input
                    value={createForm.pacra_number}
                    onChange={(e) => setCreateForm((p) => ({ ...p, pacra_number: e.target.value }))}
                    className="pr-10"
                    aria-invalid={pacraCheck === 'registered'}
                  />
                  {pacraCheck === 'checking' && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                  {pacraCheck === 'available' && <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-emerald-600" />}
                  {pacraCheck === 'registered' && <XCircle className="absolute right-3 top-2.5 h-4 w-4 text-destructive" />}
                </div>
                {pacraCheckMessage && (
                  <p className={`mt-1 text-xs ${pacraCheck === 'registered' ? 'text-destructive' : pacraCheck === 'available' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {pacraCheckMessage}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input value={createForm.entity_name} onChange={(e) => setCreateForm((p) => ({ ...p, entity_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Sector</Label>
                <Input value={createForm.sector} onChange={(e) => setCreateForm((p) => ({ ...p, sector: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={createForm.address} onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={createForm.city} onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={createForm.status} onValueChange={(value) => setCreateForm((p) => ({ ...p, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visible in public directory</Label>
                <Select value={createForm.directory_visible ? 'yes' : 'no'} onValueChange={(value) => setCreateForm((p) => ({ ...p, directory_visible: value === 'yes' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Contact name</Label>
                <Input value={createForm.contact_name} onChange={(e) => setCreateForm((p) => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={createForm.contact_email} onChange={(e) => setCreateForm((p) => ({ ...p, contact_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={createForm.contact_phone} onChange={(e) => setCreateForm((p) => ({ ...p, contact_phone: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateBusiness} disabled={creating || pacraCheck === 'registered' || pacraCheck === 'checking'}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Register Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function SubBadge({ status, days }: { status?: SubStatus; days?: number | null }) {
  if (!status || status === 'none') return <Badge variant="outline">No cert</Badge>;
  if (status === 'expired') return <Badge variant="destructive">Expired</Badge>;
  if (status === 'expiring') return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">Expiring · {days}d</Badge>;
  return <Badge>Active · {days}d</Badge>;
}
