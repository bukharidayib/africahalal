import { AdminLayout } from '../components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign, Clock, AlertTriangle, CheckCircle2, Loader2, Search,
  Receipt, Plus, Eye, Pencil, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

interface Invoice {
  id: string;
  invoice_number: string;
  fee_type: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  created_at: string;
  paid_at: string | null;
  organization_id: string;
  organizations?: { name: string } | null;
  certification_applications?: { application_number: string } | null;
}

interface BillingStats {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  invoiceCount: number;
}

export default function AdminBilling() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filtered, setFiltered] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats>({ totalPaid: 0, totalPending: 0, totalOverdue: 0, invoiceCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Create invoice form state
  const [showCreate, setShowCreate] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [newInvoice, setNewInvoice] = useState({
    organization_id: '',
    fee_type: 'certification',
    description: '',
    amount: '',
    due_date: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // View dialog
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Edit dialog
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ organization_id: '', fee_type: '', description: '', amount: '', due_date: '', status: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let result = invoices;
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i =>
        i.invoice_number.toLowerCase().includes(s) ||
        i.organizations?.name?.toLowerCase().includes(s) ||
        (i.description || '').toLowerCase().includes(s)
      );
    }
    setFiltered(result);
  }, [invoices, search, statusFilter]);

  const fetchData = async () => {
    try {
      const [invRes, orgRes] = await Promise.all([
        supabase.from('invoices')
          .select('*, organizations(name), certification_applications(application_number)')
          .order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
      ]);
      if (invRes.error) throw invRes.error;
      const all = (invRes.data || []) as Invoice[];
      setInvoices(all);
      setStats({
        totalPaid: all.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0),
        totalPending: all.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0),
        totalOverdue: all.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0),
        invoiceCount: all.length,
      });
      setOrgs(orgRes.data || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.organization_id || !newInvoice.amount || !newInvoice.due_date) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
      return;
    }
    setIsCreating(true);
    try {
      const { data: invNum } = await supabase.rpc('generate_invoice_number');
      const { error } = await supabase.from('invoices').insert({
        invoice_number: invNum as string,
        organization_id: newInvoice.organization_id,
        fee_type: newInvoice.fee_type,
        description: newInvoice.description || null,
        amount: parseFloat(newInvoice.amount),
        due_date: newInvoice.due_date,
      });
      if (error) throw error;
      toast({ title: 'Invoice Created', description: `Invoice ${invNum} has been created.` });
      setShowCreate(false);
      setNewInvoice({ organization_id: '', fee_type: 'certification', description: '', amount: '', due_date: '' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenView = async (inv: Invoice) => {
    setViewInvoice(inv);
    setLoadingActivity(true);
    try {
      const { data } = await supabase.from('invoice_activity_log')
        .select('*')
        .eq('invoice_id', inv.id)
        .order('created_at', { ascending: false });
      setActivityLog(data || []);
    } catch { setActivityLog([]); }
    finally { setLoadingActivity(false); }
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditInvoice(inv);
    setEditForm({
      organization_id: inv.organization_id,
      fee_type: inv.fee_type,
      description: inv.description || '',
      amount: String(inv.amount),
      due_date: inv.due_date,
      status: inv.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editInvoice) return;
    setIsSaving(true);
    try {
      const updateData: any = {
        organization_id: editForm.organization_id,
        fee_type: editForm.fee_type,
        description: editForm.description || null,
        amount: parseFloat(editForm.amount),
        due_date: editForm.due_date,
        status: editForm.status,
      };
      if (editForm.status === 'paid' && editInvoice.status !== 'paid') updateData.paid_at = new Date().toISOString();
      const { error } = await supabase.from('invoices').update(updateData).eq('id', editInvoice.id);
      if (error) throw error;
      await supabase.from('invoice_activity_log').insert({
        invoice_id: editInvoice.id,
        action: 'invoice_edited',
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        metadata: { changes: editForm },
      });
      toast({ title: 'Updated', description: 'Invoice updated successfully.' });
      setEditInvoice(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteInvoice) return;
    setIsDeleting(true);
    try {
      // Delete activity log first
      await supabase.from('invoice_activity_log').delete().eq('invoice_id', deleteInvoice.id);
      const { error } = await supabase.from('invoices').delete().eq('id', deleteInvoice.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `Invoice ${deleteInvoice.invoice_number} has been deleted.` });
      setDeleteInvoice(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally { setIsDeleting(false); }
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      paid: { variant: 'default', label: 'Paid' },
      pending: { variant: 'secondary', label: 'Pending' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    };
    const c = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const feeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      certification: 'Certification Fee', renewal: 'Renewal Fee',
      inspection: 'Inspection Fee', other: 'Service Charge',
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Billing & Invoices</h1>
            <p className="text-muted-foreground">Manage client invoices and track payments.</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Organization *</Label>
                  <Select value={newInvoice.organization_id} onValueChange={(v) => setNewInvoice(p => ({ ...p, organization_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee Type *</Label>
                  <Select value={newInvoice.fee_type} onValueChange={(v) => setNewInvoice(p => ({ ...p, fee_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certification">Certification Fee</SelectItem>
                      <SelectItem value="renewal">Renewal Fee</SelectItem>
                      <SelectItem value="inspection">Inspection Fee</SelectItem>
                      <SelectItem value="other">Other Service Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (USD) *</Label>
                  <Input type="number" step="0.01" min="0" value={newInvoice.amount} onChange={(e) => setNewInvoice(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input type="date" value={newInvoice.due_date} onChange={(e) => setNewInvoice(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={newInvoice.description} onChange={(e) => setNewInvoice(p => ({ ...p, description: e.target.value }))} placeholder="Optional description..." />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleCreateInvoice} disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : `$${stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Clock className="h-4 w-4 text-amber-600" /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : `$${stats.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : `$${stats.totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Receipt className="h-4 w-4 text-blue-600" /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : stats.invoiceCount}</div></CardContent>
          </Card>
        </div>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No invoices found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.organizations?.name || '—'}</TableCell>
                      <TableCell>{feeTypeLabel(inv.fee_type)}</TableCell>
                      <TableCell className="font-semibold">${Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{format(new Date(inv.due_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenView(inv)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(inv)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteInvoice(inv)} title="Delete">
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

        {/* View Invoice Dialog */}
        <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
            {viewInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Invoice #</span><p className="font-mono font-semibold">{viewInvoice.invoice_number}</p></div>
                  <div><span className="text-muted-foreground">Status</span><div className="mt-1">{statusBadge(viewInvoice.status)}</div></div>
                  <div><span className="text-muted-foreground">Client</span><p className="font-medium">{viewInvoice.organizations?.name || '—'}</p></div>
                  <div><span className="text-muted-foreground">Fee Type</span><p>{feeTypeLabel(viewInvoice.fee_type)}</p></div>
                  <div><span className="text-muted-foreground">Amount</span><p className="font-bold text-lg">${Number(viewInvoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
                  <div><span className="text-muted-foreground">Currency</span><p>{viewInvoice.currency}</p></div>
                  <div><span className="text-muted-foreground">Due Date</span><p>{format(new Date(viewInvoice.due_date), 'dd MMM yyyy')}</p></div>
                  <div><span className="text-muted-foreground">Created</span><p>{format(new Date(viewInvoice.created_at), 'dd MMM yyyy')}</p></div>
                  {viewInvoice.paid_at && <div><span className="text-muted-foreground">Paid At</span><p>{format(new Date(viewInvoice.paid_at), 'dd MMM yyyy HH:mm')}</p></div>}
                </div>
                {viewInvoice.description && (
                  <div><span className="text-sm text-muted-foreground">Description</span><p className="text-sm">{viewInvoice.description}</p></div>
                )}
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">Activity Log</h4>
                  {loadingActivity ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : activityLog.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No activity recorded.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {activityLog.map((log) => (
                        <div key={log.id} className="flex justify-between text-xs border-b pb-1">
                          <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground">{format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewInvoice(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Invoice Dialog */}
        <Dialog open={!!editInvoice} onOpenChange={(open) => !open && setEditInvoice(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Organization *</Label>
                <Select value={editForm.organization_id} onValueChange={(v) => setEditForm(p => ({ ...p, organization_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee Type *</Label>
                <Select value={editForm.fee_type} onValueChange={(v) => setEditForm(p => ({ ...p, fee_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certification">Certification Fee</SelectItem>
                    <SelectItem value="renewal">Renewal Fee</SelectItem>
                    <SelectItem value="inspection">Inspection Fee</SelectItem>
                    <SelectItem value="other">Other Service Charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (USD) *</Label>
                <Input type="number" step="0.01" min="0" value={editForm.amount} onChange={(e) => setEditForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Status *</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditInvoice(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteInvoice} onOpenChange={(open) => !open && setDeleteInvoice(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete invoice <span className="font-mono font-semibold">{deleteInvoice?.invoice_number}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Governance */}
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          <p>Payment confirmation does not constitute certification approval or trigger any certification workflow. All certification authority remains within AHI's internal systems.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
