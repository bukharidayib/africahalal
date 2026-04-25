import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Send, Save } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { OrgCombobox } from '../OrgCombobox';
import { EmailTagsInput } from '../EmailTagsInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface OrgOption { id: string; name: string }

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgs: OrgOption[];
  invoiceId?: string | null;       // null/undefined = create
  defaultOrgId?: string;
  onSaved?: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const FEE_TYPES = [
  ['application_fee', 'Application Fee'],
  ['inspection', 'Inspection Fee'],
  ['certification', 'Certification Fee'],
  ['subscription', 'Subscription Fee'],
  ['renewal', 'Renewal Fee'],
  ['other', 'Other Services Charge'],
] as const;

export function InvoiceFormDialog({
  open, onOpenChange, orgs, invoiceId, defaultOrgId, onSaved,
}: InvoiceFormDialogProps) {
  const { toast } = useToast();
  const isEdit = Boolean(invoiceId);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [orgId, setOrgId] = useState(defaultOrgId || '');
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [feeType, setFeeType] = useState('certification');
  const [issueDate, setIssueDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(addDays(14));
  const [currency, setCurrency] = useState('ZMW');
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [status, setStatus] = useState('pending');

  // Hydrate when editing
  useEffect(() => {
    if (!open) return;
    setOrgId(defaultOrgId || '');
    setOrgDetails(null);
    if (!isEdit) {
      setFeeType('certification');
      setIssueDate(todayStr());
      setDueDate(addDays(14));
      setCurrency('ZMW');
      setTaxRate(0);
      setDiscount(0);
      setNotes('');
      setRecipientEmails([]);
      setItems([{ description: '', quantity: 1, unit_price: 0 }]);
      setStatus('pending');
      return;
    }
    void loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId]);

  // Fetch org details when orgId changes (autofill bill-to + default email)
  useEffect(() => {
    if (!orgId) { setOrgDetails(null); return; }
    void loadOrg(orgId);
  }, [orgId]);

  const loadInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const [{ data: inv, error }, { data: lineItems }] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', invoiceId).single(),
        supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order'),
      ]);
      if (error) throw error;
      if (!inv) throw new Error('Invoice not found');
      setOrgId(inv.organization_id);
      setFeeType(inv.fee_type || 'other');
      setIssueDate(inv.issue_date || inv.created_at?.slice(0, 10) || todayStr());
      setDueDate(inv.due_date || addDays(14));
      setCurrency(inv.currency || 'ZMW');
      setTaxRate(Number(inv.tax_rate || 0));
      setDiscount(Number(inv.discount || 0));
      setNotes(inv.notes || inv.description || '');
      setRecipientEmails(Array.isArray(inv.recipient_emails) ? inv.recipient_emails : []);
      setStatus(inv.status || 'pending');
      const li = (lineItems || []).map((r: any) => ({
        id: r.id, description: r.description, quantity: Number(r.quantity), unit_price: Number(r.unit_price),
      }));
      setItems(li.length ? li : [{ description: inv.description || '', quantity: 1, unit_price: Number(inv.amount || 0) }]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const loadOrg = async (id: string) => {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, registration_number, address, city, country, contact_email, contact_phone')
      .eq('id', id)
      .maybeSingle();
    setOrgDetails(data);
    // For NEW invoices, auto-seed recipient emails from org/owner
    if (!isEdit && data) {
      const seed: string[] = [];
      if (data.contact_email) seed.push(String(data.contact_email).toLowerCase());
      // Also fetch owner profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('organization_id', id)
        .limit(1)
        .maybeSingle();
      if (profile?.email && !seed.includes(profile.email.toLowerCase())) {
        seed.push(profile.email.toLowerCase());
      }
      setRecipientEmails(seed);
    }
  };

  // Totals
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0),
    [items],
  );
  const taxAmount = useMemo(() => +(subtotal * (Number(taxRate) || 0) / 100), [subtotal, taxRate]);
  const total = useMemo(() => Math.max(0, subtotal + taxAmount - Number(discount || 0)), [subtotal, taxAmount, discount]);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const validate = (): string | null => {
    if (!orgId) return 'Please select a business.';
    if (!dueDate) return 'Due date is required.';
    if (items.length === 0) return 'Add at least one line item.';
    for (const it of items) {
      if (!it.description.trim()) return 'Each line item needs a description.';
      if (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0) return 'Quantity must be positive.';
      if (!Number.isFinite(Number(it.unit_price)) || Number(it.unit_price) < 0) return 'Unit price must be ≥ 0.';
    }
    return null;
  };

  const persist = async (): Promise<string | null> => {
    const err = validate();
    if (err) { toast({ variant: 'destructive', title: 'Invalid form', description: err }); return null; }

    const payload: any = {
      organization_id: orgId,
      fee_type: feeType,
      description: notes || items[0]?.description || null,
      amount: total, // total used as amount for compatibility
      currency,
      due_date: dueDate,
      issue_date: issueDate,
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, discount, total,
      notes: notes || null,
      recipient_emails: recipientEmails,
      status,
    };

    let id = invoiceId || null;
    if (isEdit && id) {
      const { error } = await supabase.from('invoices').update(payload).eq('id', id);
      if (error) throw error;
      // Replace items
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
    } else {
      const { data: invNum } = await supabase.rpc('generate_invoice_number');
      payload.invoice_number = invNum;
      const { data, error } = await supabase.from('invoices').insert(payload).select('id').single();
      if (error) throw error;
      id = data.id;
    }

    // Insert items
    if (id && items.length) {
      const rows = items.map((it, i) => ({
        invoice_id: id!,
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        sort_order: i,
      }));
      const { error: itemsErr } = await supabase.from('invoice_items').insert(rows);
      if (itemsErr) throw itemsErr;
    }

    // Activity log
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('invoice_activity_log').insert({
      invoice_id: id,
      action: isEdit ? 'invoice_edited' : 'invoice_created',
      performed_by: user?.id,
      metadata: { items: items.length, total, recipient_count: recipientEmails.length },
    });

    return id;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = await persist();
      if (id) {
        toast({ title: isEdit ? 'Invoice updated' : 'Invoice created', description: `Total: ${currency} ${total.toFixed(2)}` });
        onOpenChange(false);
        onSaved?.();
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSend = async () => {
    if (recipientEmails.length === 0) {
      toast({ variant: 'destructive', title: 'No recipients', description: 'Add at least one email address.' });
      return;
    }
    setSending(true);
    try {
      const id = await persist();
      if (!id) return;
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: id, recipient_emails: recipientEmails },
      });
      if (error) {
        const ctx: any = (error as any).context;
        let detail = error.message;
        try { const body = await ctx?.json?.(); if (body?.error) detail = body.error; } catch {}
        throw new Error(detail);
      }
      toast({ title: 'Invoice sent', description: `Emailed to ${(data?.recipients || recipientEmails).join(', ')}` });
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Send failed', description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Business + Fee type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Business *</Label>
                <OrgCombobox options={orgs} value={orgId} onChange={setOrgId} />
                {orgDetails && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5 border rounded-md p-2 bg-muted/30">
                    <p className="font-semibold text-foreground">{orgDetails.name}</p>
                    {orgDetails.registration_number && <p>Reg: {orgDetails.registration_number}</p>}
                    {orgDetails.address && <p>{orgDetails.address}</p>}
                    {(orgDetails.city || orgDetails.country) && <p>{[orgDetails.city, orgDetails.country].filter(Boolean).join(', ')}</p>}
                    {orgDetails.contact_phone && <p>📞 {orgDetails.contact_phone}</p>}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Fee Type *</Label>
                  <Select value={feeType} onValueChange={setFeeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FEE_TYPES.map(([v, lbl]) => <SelectItem key={v} value={v}>{lbl}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Issue Date *</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Recipient Emails */}
            <div>
              <Label>Recipient Emails *</Label>
              <EmailTagsInput value={recipientEmails} onChange={setRecipientEmails} placeholder="client@example.com" />
            </div>

            <Separator />

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">Description</TableHead>
                    <TableHead className="w-[12%]">Qty</TableHead>
                    <TableHead className="w-[18%]">Unit Price</TableHead>
                    <TableHead className="w-[18%] text-right">Line Total</TableHead>
                    <TableHead className="w-[7%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={it.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="Service or product description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min="0" step="1"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min="0" step="0.01"
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currency} {(Number(it.quantity || 0) * Number(it.unit_price || 0)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                onClick={() => removeItem(idx)} disabled={items.length === 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals + meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Payment terms, references…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZMW">ZMW</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isEdit && (
                    <div>
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 border rounded-lg p-4 bg-muted/30 self-start">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-3">
                  <span className="text-muted-foreground">Tax (%)</span>
                  <Input type="number" min="0" max="100" step="0.01" className="w-24 h-8"
                         value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
                  <span className="font-semibold w-28 text-right">{currency} {taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-3">
                  <span className="text-muted-foreground">Discount</span>
                  <Input type="number" min="0" step="0.01" className="w-24 h-8"
                         value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                  <span className="font-semibold w-28 text-right">−{currency} {Number(discount || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-primary">{currency} {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || sending}>Cancel</Button>
          <Button variant="secondary" onClick={handleSave} disabled={saving || sending || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? 'Save Changes' : 'Save Draft'}
          </Button>
          <Button onClick={handleSaveAndSend} disabled={saving || sending || loading}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Save & Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
