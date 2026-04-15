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
  Receipt, Plus, Eye, Pencil, Trash2, RefreshCw, CreditCard, Banknote,
  Image, XCircle, CheckCircle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- ZynlePay response code map ---
const ZYNLE_CODES: Record<string, { description: string; color: 'green' | 'yellow' | 'red' }> = {
  '100': { description: 'Transaction successful', color: 'green' },
  '120': { description: 'Transaction initiated', color: 'yellow' },
  '990': { description: 'Transaction pending', color: 'yellow' },
  '995': { description: 'Transaction failed', color: 'red' },
  '9901': { description: 'Merchant not found', color: 'red' },
  '9902': { description: 'Requesting Device IP is not whitelisted', color: 'red' },
  '9903': { description: 'Invalid Merchant API credentials or setup not complete', color: 'red' },
  '9904': { description: 'Merchant Account setup not complete', color: 'red' },
  '9905': { description: 'Invalid sender ID (mobile number)', color: 'red' },
  '9906': { description: 'Duplicate reference number detected', color: 'red' },
  '9907': { description: 'Mobile Number blacklisted', color: 'red' },
  '9908': { description: 'Merchant commission setup not complete', color: 'red' },
  '9909': { description: 'Merchant payment provider setup not complete', color: 'red' },
  '9910': { description: 'Merchant setup not complete', color: 'red' },
  '9911': { description: 'Merchant insufficient balance', color: 'red' },
  '9912': { description: 'Request amount exceeds disbursement limit', color: 'red' },
  '9913': { description: 'Invalid or wrong bank name provided', color: 'red' },
  '9914': { description: 'Cannot determine transaction status now, please try again later', color: 'red' },
};

function extractResponseCode(gatewayResponse: any): string {
  if (!gatewayResponse) return '';
  if (typeof gatewayResponse.response === 'string' || typeof gatewayResponse.response === 'number') {
    return String(gatewayResponse.response);
  }
  if (typeof gatewayResponse.response === 'object' && gatewayResponse.response !== null) {
    if (gatewayResponse.response.code !== undefined) return String(gatewayResponse.response.code);
    if (gatewayResponse.response.response_code !== undefined) return String(gatewayResponse.response.response_code);
  }
  if (gatewayResponse.code !== undefined) return String(gatewayResponse.code);
  if (gatewayResponse.response_code !== undefined) return String(gatewayResponse.response_code);
  return '';
}

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
  application_id: string | null;
  organizations?: { name: string } | null;
  certification_applications?: { application_number: string; validity_period: string | null } | null;
}

interface PaymentTransaction {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  transaction_reference: string | null;
  zynlepay_reference: string | null;
  gateway_response: any;
  created_at: string;
  paid_by: string | null;
  invoices?: { invoice_number: string; organizations?: { name: string } | null } | null;
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
    validity_period: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // View dialog
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Edit dialog
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ organization_id: '', fee_type: '', description: '', amount: '', due_date: '', status: '', validity_period: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Payment transactions state
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [filteredTx, setFilteredTx] = useState<PaymentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);

  // Offline payments state
  interface OfflinePayment {
    id: string;
    invoice_id: string;
    sender_name: string;
    sender_phone: string;
    amount: number;
    transaction_reference: string | null;
    screenshot_path: string;
    notes: string | null;
    status: string;
    submitted_by: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    created_at: string;
    invoices?: { invoice_number: string; organizations?: { name: string } | null } | null;
  }
  const [offlinePayments, setOfflinePayments] = useState<OfflinePayment[]>([]);
  const [offlineLoading, setOfflineLoading] = useState(true);
  const [offlineSearch, setOfflineSearch] = useState('');
  const [offlineStatusFilter, setOfflineStatusFilter] = useState('all');
  const [filteredOffline, setFilteredOffline] = useState<OfflinePayment[]>([]);
  const [reviewingPayment, setReviewingPayment] = useState<OfflinePayment | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  useEffect(() => { fetchData(); fetchTransactions(); fetchOfflinePayments(); }, []);

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

  useEffect(() => {
    let result = offlinePayments;
    if (offlineStatusFilter !== 'all') result = result.filter(o => o.status === offlineStatusFilter);
    if (offlineSearch) {
      const s = offlineSearch.toLowerCase();
      result = result.filter(o =>
        o.sender_name.toLowerCase().includes(s) ||
        o.sender_phone.includes(s) ||
        (o.invoices?.invoice_number || '').toLowerCase().includes(s) ||
        (o.invoices?.organizations?.name || '').toLowerCase().includes(s)
      );
    }
    setFilteredOffline(result);
  }, [offlinePayments, offlineSearch, offlineStatusFilter]);

  useEffect(() => {
    let result = transactions;
    if (txStatusFilter !== 'all') result = result.filter(t => t.status === txStatusFilter);
    if (txSearch) {
      const s = txSearch.toLowerCase();
      result = result.filter(t =>
        (t.transaction_reference || '').toLowerCase().includes(s) ||
        (t.zynlepay_reference || '').toLowerCase().includes(s) ||
        (t.invoices?.invoice_number || '').toLowerCase().includes(s) ||
        (t.invoices?.organizations?.name || '').toLowerCase().includes(s)
      );
    }
    setFilteredTx(result);
  }, [transactions, txSearch, txStatusFilter]);

  const fetchData = async () => {
    try {
      const [invRes, orgRes] = await Promise.all([
        supabase.from('invoices')
          .select('*, organizations(name), certification_applications(application_number, validity_period)')
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

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*, invoices(invoice_number, organizations(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTransactions((data || []) as PaymentTransaction[]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setTxLoading(false);
    }
  };

  const fetchOfflinePayments = async () => {
    setOfflineLoading(true);
    try {
      const { data, error } = await supabase
        .from('offline_payments')
        .select('*, invoices(invoice_number, organizations(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOfflinePayments((data || []) as OfflinePayment[]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setOfflineLoading(false);
    }
  };

  const handleReviewOfflinePayment = async () => {
    if (!reviewingPayment || !reviewAction) return;
    setIsReviewing(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Update offline payment status
      const { error: updateError } = await supabase
        .from('offline_payments')
        .update({
          status: reviewAction === 'approve' ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', reviewingPayment.id);
      if (updateError) throw updateError;

      // If approved, mark invoice as paid
      if (reviewAction === 'approve') {
        const { error: invError } = await supabase
          .from('invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', reviewingPayment.invoice_id);
        if (invError) throw invError;

        // Log to activity
        await supabase.from('invoice_activity_log').insert({
          invoice_id: reviewingPayment.invoice_id,
          action: 'offline_payment_approved',
          performed_by: user?.id,
          metadata: { offline_payment_id: reviewingPayment.id, sender_name: reviewingPayment.sender_name },
        });
      }

      toast({ title: reviewAction === 'approve' ? 'Payment Approved' : 'Payment Rejected', description: `Offline payment has been ${reviewAction === 'approve' ? 'approved' : 'rejected'}.` });
      setReviewingPayment(null);
      setReviewAction(null);
      setReviewNotes('');
      fetchOfflinePayments();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleViewScreenshot = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(path, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load screenshot.' });
    }
  };


    setCheckingStatusId(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { transaction_id: tx.id },
      });
      if (error) throw error;
      toast({ title: 'Status Updated', description: data?.message || 'Status checked.' });
      fetchTransactions();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setCheckingStatusId(null);
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
      setNewInvoice({ organization_id: '', fee_type: 'certification', description: '', amount: '', due_date: '', validity_period: '' });
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
      validity_period: inv.certification_applications?.validity_period || '',
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
      if (editInvoice.application_id && editForm.validity_period) {
        const appFee = editForm.validity_period === '6_months' ? 1500 : editForm.validity_period === '1_year' ? 3000 : null;
        await supabase.from('certification_applications').update({
          validity_period: editForm.validity_period,
          ...(appFee ? { application_fee: appFee } : {}),
        }).eq('id', editInvoice.application_id);
      }
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

  const txStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: 'default', label: 'Completed' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' },
    };
    const c = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const responseCodeBadge = (code: string) => {
    if (!code) return <span className="text-muted-foreground text-xs">—</span>;
    const info = ZYNLE_CODES[code];
    const colorClass = info?.color === 'green'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : info?.color === 'yellow'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>{code}</span>;
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
                  <Label>Certification Validity Period</Label>
                  <Select value={newInvoice.validity_period} onValueChange={(v) => {
                    const amount = v === '6_months' ? '1500' : v === '1_year' ? '3000' : newInvoice.amount;
                    setNewInvoice(p => ({ ...p, validity_period: v, amount }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select validity period (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6_months">6 Months (ZMW 1,500)</SelectItem>
                      <SelectItem value="1_year">1 Year (ZMW 3,000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (ZMW) *</Label>
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
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : `ZMW ${stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Clock className="h-4 w-4 text-amber-600" /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : `ZMW ${stats.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : `ZMW ${stats.totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Receipt className="h-4 w-4 text-blue-600" /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? '...' : stats.invoiceCount}</div></CardContent>
          </Card>
        </div>

        {/* Tabs: Invoices + Payment Transactions */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invoices" className="gap-2"><Receipt className="h-4 w-4" /> Invoices</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2"><CreditCard className="h-4 w-4" /> Payment Transactions</TabsTrigger>
          </TabsList>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
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
                          <TableCell className="font-semibold">ZMW {Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
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
          </TabsContent>

          {/* Payment Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search transactions..." value={txSearch} onChange={(e) => setTxSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={txLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${txLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : filteredTx.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No payment transactions found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTx.map((tx) => {
                          const code = extractResponseCode(tx.gateway_response);
                          const codeInfo = ZYNLE_CODES[code];
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-xs">{tx.transaction_reference || tx.zynlepay_reference || '—'}</TableCell>
                              <TableCell className="font-mono text-sm">{tx.invoices?.invoice_number || '—'}</TableCell>
                              <TableCell>{tx.invoices?.organizations?.name || '—'}</TableCell>
                              <TableCell className="font-semibold">ZMW {Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="capitalize">{tx.payment_method?.replace(/_/g, ' ') || '—'}</TableCell>
                              <TableCell>{txStatusBadge(tx.status)}</TableCell>
                              <TableCell>{responseCodeBadge(code)}</TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate" title={codeInfo?.description || ''}>
                                {codeInfo?.description || (code ? `Unknown code: ${code}` : '—')}
                              </TableCell>
                              <TableCell className="text-sm">{format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                              <TableCell className="text-right">
                                {tx.status === 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCheckStatus(tx)}
                                    disabled={checkingStatusId === tx.id}
                                  >
                                    {checkingStatusId === tx.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                    Check
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                  <div><span className="text-muted-foreground">Amount</span><p className="font-bold text-lg">ZMW {Number(viewInvoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
                  <div><span className="text-muted-foreground">Currency</span><p>ZMW</p></div>
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
                <Label>Certification Validity Period</Label>
                <Select value={editForm.validity_period} onValueChange={(v) => {
                  const amount = v === '6_months' ? '1500' : v === '1_year' ? '3000' : editForm.amount;
                  setEditForm(p => ({ ...p, validity_period: v, amount }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select validity period (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6_months">6 Months (ZMW 1,500)</SelectItem>
                    <SelectItem value="1_year">1 Year (ZMW 3,000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (ZMW) *</Label>
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
