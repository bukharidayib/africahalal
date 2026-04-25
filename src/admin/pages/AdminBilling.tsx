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
  Receipt, Plus, Eye, Pencil, Trash2, RefreshCw, CreditCard,
  Calculator, Send, FileText, Repeat, Download
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
import PendingPricingTab from '../components/accountant/PendingPricingTab';
import SubscriptionsTab from '../components/accountant/SubscriptionsTab';
import QuotationsTab from '../components/accountant/QuotationsTab';
import { OrgCombobox } from '../components/OrgCombobox';

// --- Validity helpers ---
const VALIDITY_MONTHS: Record<string, number> = {
  '1_quarter': 3, '2_quarter': 6, '3_quarter': 9, '4_quarter': 12,
};
const validityLabel = (v: string) => ({
  '1_quarter': '1 Quarter (3 months)',
  '2_quarter': '2 Quarters (6 months)',
  '3_quarter': '3 Quarters (9 months)',
  '4_quarter': '4 Quarters (12 months)',
} as Record<string, string>)[v] || v;
const todayStr = () => new Date().toISOString().slice(0, 10);
const addMonthsStr = (dateStr: string, months: number) => {
  if (!dateStr || !months) return '';
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};
const needsValidity = (feeType: string) =>
  feeType === 'certification' || feeType === 'subscription';

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
  start_date?: string | null;
  expiry_date?: string | null;
  validity_period?: string | null;
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
    start_date: todayStr(),
    expiry_date: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // View dialog
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Edit dialog
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ organization_id: '', fee_type: '', description: '', amount: '', due_date: '', status: '', validity_period: '', start_date: '', expiry_date: '' });
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

  useEffect(() => { fetchData(); fetchTransactions(); }, []);

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

  const handleCheckStatus = async (tx: PaymentTransaction) => {
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

  // Helper: invoke certificate issuance after a payment
  const triggerCertificateIssuance = async (invoiceId: string) => {
    try {
      await supabase.functions.invoke('issue-certificate-on-payment', { body: { invoice_id: invoiceId } });
    } catch (e) {
      console.warn('issue-certificate-on-payment failed', e);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.organization_id || !newInvoice.amount || !newInvoice.due_date) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
      return;
    }
    if (needsValidity(newInvoice.fee_type) && !newInvoice.validity_period) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Validity period is required for this fee type.' });
      return;
    }
    setIsCreating(true);
    try {
      const { data: invNum } = await supabase.rpc('generate_invoice_number');
      const usesValidity = needsValidity(newInvoice.fee_type);
      const { error } = await supabase.from('invoices').insert({
        invoice_number: invNum as string,
        organization_id: newInvoice.organization_id,
        fee_type: newInvoice.fee_type,
        description: newInvoice.description || null,
        amount: parseFloat(newInvoice.amount),
        due_date: newInvoice.due_date,
        validity_period: usesValidity ? newInvoice.validity_period : null,
        start_date: usesValidity ? (newInvoice.start_date || todayStr()) : null,
        expiry_date: usesValidity ? (newInvoice.expiry_date || null) : null,
      });
      if (error) throw error;
      toast({ title: 'Invoice Created', description: `Invoice ${invNum} has been created.` });
      setShowCreate(false);
      setNewInvoice({ organization_id: '', fee_type: 'certification', description: '', amount: '', due_date: '', validity_period: '', start_date: todayStr(), expiry_date: '' });
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
      validity_period: inv.validity_period || inv.certification_applications?.validity_period || '',
      start_date: inv.start_date || todayStr(),
      expiry_date: inv.expiry_date || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editInvoice) return;
    setIsSaving(true);
    try {
      const usesValidity = needsValidity(editForm.fee_type);
      const updateData: any = {
        organization_id: editForm.organization_id,
        fee_type: editForm.fee_type,
        description: editForm.description || null,
        amount: parseFloat(editForm.amount),
        due_date: editForm.due_date,
        status: editForm.status,
        validity_period: usesValidity ? (editForm.validity_period || null) : null,
        start_date: usesValidity ? (editForm.start_date || null) : null,
        expiry_date: usesValidity ? (editForm.expiry_date || null) : null,
      };
      const becamePaid = editForm.status === 'paid' && editInvoice.status !== 'paid';
      if (becamePaid) updateData.paid_at = new Date().toISOString();
      const { error } = await supabase.from('invoices').update(updateData).eq('id', editInvoice.id);
      if (error) throw error;
      if (editInvoice.application_id && editForm.validity_period) {
        await supabase.from('certification_applications').update({
          validity_period: editForm.validity_period,
        }).eq('id', editInvoice.application_id);
      }
      await supabase.from('invoice_activity_log').insert({
        invoice_id: editInvoice.id,
        action: 'invoice_edited',
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        metadata: { changes: editForm },
      });
      if (becamePaid) await triggerCertificateIssuance(editInvoice.id);
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

  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleSendInvoiceEmail = async (inv: Invoice) => {
    setEmailingId(inv.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', { body: { invoice_id: inv.id } });
      if (error) {
        const ctx: any = (error as any).context;
        let detail = error.message;
        try {
          const body = await ctx?.json?.();
          if (body?.missing_field) detail = `Missing field: ${body.missing_field}`;
          else if (body?.error) detail = body.error;
        } catch {}
        throw new Error(detail);
      }
      toast({ title: 'Email sent', description: `Invoice emailed to ${data?.recipient || 'client'}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Email failed', description: e.message });
    } finally { setEmailingId(null); }
  };

  const handleDownloadInvoicePdf = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', { body: { invoice_id: inv.id } });
      if (error) throw error;
      const b64 = (data as any)?.pdf_base64;
      if (!b64) throw new Error('No PDF returned');
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${inv.invoice_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: e.message });
    } finally { setDownloadingId(null); }
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
      application_fee: 'Application Fee', certification: 'Certification Fee',
      subscription: 'Subscription Fee', renewal: 'Renewal Fee',
      inspection: 'Inspection Fee', other: 'Other Services Charge',
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif flex items-center gap-2"><Calculator className="h-6 w-6" /> Accountant</h1>
            <p className="text-muted-foreground">Pricing, invoices, subscriptions, quotations and payment reconciliation.</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Invoice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Organization *</Label>
                  <OrgCombobox
                    options={orgs}
                    value={newInvoice.organization_id}
                    onChange={(v) => setNewInvoice(p => ({ ...p, organization_id: v }))}
                  />
                </div>
                <div>
                  <Label>Fee Type *</Label>
                  <Select
                    value={newInvoice.fee_type}
                    onValueChange={(v) => setNewInvoice(p => {
                      const next = { ...p, fee_type: v };
                      if (!needsValidity(v)) {
                        next.validity_period = '';
                        next.expiry_date = '';
                      } else if (!next.start_date) {
                        next.start_date = todayStr();
                      }
                      return next;
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application_fee">Application Fee</SelectItem>
                      <SelectItem value="inspection">Inspection Fee</SelectItem>
                      <SelectItem value="certification">Certification Fee</SelectItem>
                      <SelectItem value="subscription">Subscription Fee</SelectItem>
                      <SelectItem value="other">Other Services Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {needsValidity(newInvoice.fee_type) && (
                  <>
                    <div>
                      <Label>Validity Period *</Label>
                      <Select
                        value={newInvoice.validity_period}
                        onValueChange={(v) => setNewInvoice(p => ({
                          ...p,
                          validity_period: v,
                          expiry_date: addMonthsStr(p.start_date || todayStr(), VALIDITY_MONTHS[v] || 0),
                        }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select validity period" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_quarter">1 Quarter (3 months)</SelectItem>
                          <SelectItem value="2_quarter">2 Quarters (6 months)</SelectItem>
                          <SelectItem value="3_quarter">3 Quarters (9 months)</SelectItem>
                          <SelectItem value="4_quarter">4 Quarters (12 months)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Date *</Label>
                        <Input
                          type="date"
                          value={newInvoice.start_date}
                          onChange={(e) => setNewInvoice(p => ({
                            ...p,
                            start_date: e.target.value,
                            expiry_date: p.validity_period
                              ? addMonthsStr(e.target.value, VALIDITY_MONTHS[p.validity_period] || 0)
                              : p.expiry_date,
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Expiry Date *</Label>
                        <Input
                          type="date"
                          value={newInvoice.expiry_date}
                          onChange={(e) => setNewInvoice(p => ({ ...p, expiry_date: e.target.value }))}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Auto-filled. Editable.</p>
                      </div>
                    </div>
                  </>
                )}

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
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending" className="gap-2"><AlertTriangle className="h-4 w-4" /> Pending Pricing</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2"><Receipt className="h-4 w-4" /> Invoices</TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2"><Repeat className="h-4 w-4" /> Subscriptions</TabsTrigger>
            <TabsTrigger value="quotations" className="gap-2"><FileText className="h-4 w-4" /> Quotations</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2"><CreditCard className="h-4 w-4" /> Payment Transactions</TabsTrigger>
            
          </TabsList>

          <TabsContent value="pending"><PendingPricingTab /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
          <TabsContent value="quotations"><QuotationsTab /></TabsContent>


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
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadInvoicePdf(inv)} title="Download PDF" disabled={downloadingId === inv.id}>
                                {downloadingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSendInvoiceEmail(inv)} title="Email to client" disabled={emailingId === inv.id}>
                                {emailingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Organization *</Label>
                <OrgCombobox
                  options={orgs}
                  value={editForm.organization_id}
                  onChange={(v) => setEditForm(p => ({ ...p, organization_id: v }))}
                />
              </div>
              <div>
                <Label>Fee Type *</Label>
                <Select
                  value={editForm.fee_type}
                  onValueChange={(v) => setEditForm(p => {
                    const next = { ...p, fee_type: v };
                    if (!needsValidity(v)) {
                      next.validity_period = '';
                      next.expiry_date = '';
                    } else if (!next.start_date) {
                      next.start_date = todayStr();
                    }
                    return next;
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application_fee">Application Fee</SelectItem>
                    <SelectItem value="inspection">Inspection Fee</SelectItem>
                    <SelectItem value="certification">Certification Fee</SelectItem>
                    <SelectItem value="subscription">Subscription Fee</SelectItem>
                    <SelectItem value="other">Other Services Charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {needsValidity(editForm.fee_type) && (
                <>
                  <div>
                    <Label>Validity Period *</Label>
                    <Select
                      value={editForm.validity_period}
                      onValueChange={(v) => setEditForm(p => ({
                        ...p,
                        validity_period: v,
                        expiry_date: addMonthsStr(p.start_date || todayStr(), VALIDITY_MONTHS[v] || 0),
                      }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select validity period" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1_quarter">1 Quarter (3 months)</SelectItem>
                        <SelectItem value="2_quarter">2 Quarters (6 months)</SelectItem>
                        <SelectItem value="3_quarter">3 Quarters (9 months)</SelectItem>
                        <SelectItem value="4_quarter">4 Quarters (12 months)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={editForm.start_date}
                        onChange={(e) => setEditForm(p => ({
                          ...p,
                          start_date: e.target.value,
                          expiry_date: p.validity_period
                            ? addMonthsStr(e.target.value, VALIDITY_MONTHS[p.validity_period] || 0)
                            : p.expiry_date,
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Expiry Date *</Label>
                      <Input
                        type="date"
                        value={editForm.expiry_date}
                        onChange={(e) => setEditForm(p => ({ ...p, expiry_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </>
              )}

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
