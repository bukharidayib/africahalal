import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, RefreshCw, FileText, Send, Trash2, FileCheck, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { EmailTagsInput } from '@/admin/components/EmailTagsInput';

interface Item { label: string; qty: number; unit_price: number; total: number; }

interface Quotation {
  id: string;
  quotation_number: string;
  organization_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_address: string | null;
  title: string;
  items: Item[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  valid_until: string | null;
  status: string;
  notes: string | null;
  recipient_emails: string[] | null;
  sent_at: string | null;
  converted_invoice_id: string | null;
  organizations?: { name: string; contact_email: string | null } | null;
}

const blankForm = {
  customer_name: '',
  customer_email: '',
  customer_address: '',
  title: '',
  items: [{ label: '', qty: 1, unit_price: 0, total: 0 }] as Item[],
  tax_pct: '0',
  valid_until: '',
  notes: '',
  recipient_emails: [] as string[],
};

const EDITABLE_STATUSES = ['draft', 'sent'];
const DELETABLE_STATUSES = ['draft', 'rejected', 'expired'];

export default function QuotationsTab() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  // orgs are no longer used; quotations are now address-based
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = await supabase.from('quotations').select('*, organizations(name, contact_email)').order('created_at', { ascending: false });
      if (q.error) throw q.error;
      setQuotes((q.data || []) as any);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  // Auto-add customer_email into recipient_emails when typed (and not already present)
  useEffect(() => {
    const e = form.customer_email.trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (form.recipient_emails.includes(e)) return;
    setForm(p => ({ ...p, recipient_emails: [...p.recipient_emails, e] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer_email]);

  const updateItem = (i: number, key: keyof Item, val: any) => {
    setForm(p => {
      const items = [...p.items];
      const it = { ...items[i], [key]: key === 'label' ? val : Number(val) };
      it.total = (Number(it.qty) || 0) * (Number(it.unit_price) || 0);
      items[i] = it;
      return { ...p, items };
    });
  };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { label: '', qty: 1, unit_price: 0, total: 0 }] }));
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const subtotal = form.items.reduce((s, it) => s + (it.total || 0), 0);
  const taxAmt = subtotal * (Number(form.tax_pct) || 0) / 100;
  const total = subtotal + taxAmt;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blankForm });
    setShowForm(true);
  };

  const openEdit = (q: Quotation) => {
    setEditing(q);
    setForm({
      customer_name: q.customer_name || q.organizations?.name || '',
      customer_email: q.customer_email || q.organizations?.contact_email || '',
      customer_address: q.customer_address || '',
      title: q.title,
      items: (q.items && q.items.length ? q.items : [{ label: '', qty: 1, unit_price: 0, total: 0 }]) as Item[],
      tax_pct: String(q.tax_rate ?? 0),
      valid_until: q.valid_until || '',
      notes: q.notes || '',
      recipient_emails: q.recipient_emails || [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer_name.trim() || !form.title || form.items.some(i => !i.label)) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Customer name, title and item descriptions are required.' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim() || null,
        customer_address: form.customer_address.trim() || null,
        title: form.title,
        items: form.items as any,
        subtotal,
        tax_rate: Number(form.tax_pct) || 0,
        tax_amount: taxAmt,
        total,
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        recipient_emails: form.recipient_emails.length ? form.recipient_emails : null,
      };

      if (editing) {
        const { error } = await supabase.from('quotations').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Quotation updated', description: `Quotation ${editing.quotation_number} saved.` });
      } else {
        const { data: qNum } = await supabase.rpc('generate_quotation_number');
        const { error } = await supabase.from('quotations').insert({
          ...payload,
          quotation_number: qNum as string,
          status: 'draft',
        });
        if (error) throw error;
        toast({ title: 'Quotation created', description: `Quotation ${qNum} saved as draft.` });
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...blankForm });
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `Quotation ${deleteTarget.quotation_number} removed.` });
      setDeleteTarget(null);
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setDeleting(false); }
  };

  const handleSend = async (q: Quotation) => {
    setActingId(q.id);
    try {
      const { error } = await supabase.functions.invoke('send-quotation-email', { body: { quotation_id: q.id } });
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
      toast({ title: 'Sent', description: 'Quotation emailed to client.' });
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setActingId(null); }
  };

  const handleConvert = async (q: Quotation) => {
    if (!q.organization_id) {
      toast({ variant: 'destructive', title: 'Cannot convert', description: 'This quotation is not linked to a registered organization. Invoices require a registered business.' });
      return;
    }
    setActingId(q.id);
    try {
      const { data: invNum } = await supabase.rpc('generate_invoice_number');
      const due = new Date(); due.setDate(due.getDate() + 14);
      const { data: inv, error } = await supabase.from('invoices').insert({
        invoice_number: invNum as string,
        organization_id: q.organization_id,
        quotation_id: q.id,
        fee_type: 'other',
        description: q.title,
        amount: q.total,
        due_date: due.toISOString().slice(0, 10),
      }).select('id').single();
      if (error) throw error;
      await supabase.from('quotations').update({
        status: 'converted',
        converted_invoice_id: inv!.id,
      }).eq('id', q.id);
      try { await supabase.functions.invoke('send-invoice-email', { body: { invoice_id: inv!.id } }); } catch {}
      toast({ title: 'Converted', description: `Invoice ${invNum} created from quotation.` });
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setActingId(null); }
  };

  const handleSetStatus = async (q: Quotation, status: string) => {
    setActingId(q.id);
    try {
      const updates: any = { status };
      if (status === 'accepted') updates.accepted_at = new Date().toISOString();
      const { error } = await supabase.from('quotations').update(updates).eq('id', q.id);
      if (error) throw error;
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setActingId(null); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline', sent: 'secondary', accepted: 'default',
      rejected: 'destructive', expired: 'outline', converted: 'default',
    };
    return <Badge variant={map[s] || 'outline'}>{s}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Quotations</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Send formal quotes and convert to invoices.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditing(null); setForm({ ...blankForm }); } }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Quotation</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? `Edit Quotation ${editing.quotation_number}` : 'New Quotation'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Customer Name *</Label>
                    <Input
                      value={form.customer_name}
                      onChange={(e) => setForm(p => ({ ...p, customer_name: e.target.value }))}
                      placeholder="e.g. STAR BEEF COMPANY LIMITED"
                    />
                  </div>
                  <div>
                    <Label>Valid until</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm(p => ({ ...p, valid_until: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Customer Email</Label>
                    <Input
                      type="email"
                      value={form.customer_email}
                      onChange={(e) => setForm(p => ({ ...p, customer_email: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <Label>Customer Address</Label>
                    <Input
                      value={form.customer_address}
                      onChange={(e) => setForm(p => ({ ...p, customer_address: e.target.value }))}
                      placeholder="Street, City, Country"
                    />
                  </div>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Halal certification + annual audit" />
                </div>
                <div>
                  <Label>Send to (recipient emails)</Label>
                  <EmailTagsInput
                    value={form.recipient_emails}
                    onChange={(emails) => setForm(p => ({ ...p, recipient_emails: emails }))}
                    placeholder="Add recipient email and press Enter"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Line items</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((it, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <Input className="col-span-6" placeholder="Description" value={it.label} onChange={(e) => updateItem(i, 'label', e.target.value)} />
                        <Input className="col-span-1" type="number" min="1" placeholder="Qty" value={it.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                        <Input className="col-span-2" type="number" step="0.01" min="0" placeholder="Unit price" value={it.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} />
                        <div className="col-span-2 text-sm text-right font-semibold">ZMW {it.total.toFixed(2)}</div>
                        <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => removeItem(i)} disabled={form.items.length === 1}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <Label>Tax (%)</Label>
                    <Input type="number" step="0.01" min="0" value={form.tax_pct} onChange={(e) => setForm(p => ({ ...p, tax_pct: e.target.value }))} />
                  </div>
                  <div className="text-right space-y-1 text-sm">
                    <div>Subtotal: <span className="font-medium">ZMW {subtotal.toFixed(2)}</span></div>
                    <div>Tax: <span className="font-medium">ZMW {taxAmt.toFixed(2)}</span></div>
                    <div className="text-lg font-bold">Total: ZMW {total.toFixed(2)}</div>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editing ? 'Save Changes' : 'Save Draft'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No quotations yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => {
                const canEdit = EDITABLE_STATUSES.includes(q.status);
                const canDelete = DELETABLE_STATUSES.includes(q.status);
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm">{q.quotation_number}</TableCell>
                    <TableCell>{q.customer_name || q.organizations?.name || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{q.title}</TableCell>
                    <TableCell className="font-semibold">ZMW {Number(q.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm">{q.valid_until ? format(new Date(q.valid_until), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>{statusBadge(q.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {q.status !== 'converted' && q.status !== 'rejected' && (
                          <Button size="sm" variant="outline" onClick={() => handleSend(q)} disabled={actingId === q.id} title="Send to recipients">
                            {actingId === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          </Button>
                        )}
                        {q.status === 'sent' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleSetStatus(q, 'accepted')} disabled={actingId === q.id}>Accepted</Button>
                            <Button size="sm" variant="outline" onClick={() => handleSetStatus(q, 'rejected')} disabled={actingId === q.id}>Rejected</Button>
                          </>
                        )}
                        {(q.status === 'accepted' || q.status === 'sent') && (
                          <Button size="sm" onClick={() => handleConvert(q)} disabled={actingId === q.id}>
                            <FileCheck className="h-3 w-3 mr-1" /> To Invoice
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(q)}
                          disabled={!canEdit}
                          title={canEdit ? 'Edit quotation' : `Cannot edit ${q.status} quotation`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(q)}
                          disabled={!canDelete}
                          title={canDelete ? 'Delete quotation' : `Cannot delete ${q.status} quotation`}
                          className={canDelete ? 'hover:bg-destructive hover:text-destructive-foreground' : ''}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes quotation{' '}
              <span className="font-mono font-semibold">{deleteTarget?.quotation_number}</span>{' '}
              ({deleteTarget?.customer_name || deleteTarget?.organizations?.name || '—'}, ZMW{' '}
              {Number(deleteTarget?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
