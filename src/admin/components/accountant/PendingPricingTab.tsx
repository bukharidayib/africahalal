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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, DollarSign, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const VALIDITY_OPTIONS = [
  { value: '1_quarter', label: '1 Quarter (3 months)' },
  { value: '2_quarter', label: '2 Quarters (6 months)' },
  { value: '3_quarter', label: '3 Quarters (9 months)' },
  { value: '4_quarter', label: '4 Quarters (12 months)' },
];

interface PendingApp {
  id: string;
  application_number: string;
  scope: string;
  sector: string;
  validity_period: string | null;
  organization_id: string;
  submitted_at: string | null;
  organizations?: { name: string; contact_email: string | null } | null;
}

export default function PendingPricingTab() {
  const [apps, setApps] = useState<PendingApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingApp, setPricingApp] = useState<PendingApp | null>(null);
  const [form, setForm] = useState({
    application_fee: '',
    validity_period: '2_quarter',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    description: '',
    add_subscription: false,
    sub_cycle: 'yearly' as 'monthly' | 'quarterly' | 'yearly',
    sub_amount: '',
    sub_plan: 'Annual Maintenance',
    send_email: true,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchApps = async () => {
    setLoading(true);
    try {
      // submitted apps
      const { data: subs, error } = await supabase
        .from('certification_applications')
        .select('id, application_number, scope, sector, validity_period, organization_id, submitted_at, organizations(name, contact_email)')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });
      if (error) throw error;

      // exclude apps that already have an application_fee invoice
      const appIds = (subs || []).map((a: any) => a.id);
      let invoicedIds = new Set<string>();
      if (appIds.length > 0) {
        const { data: invs } = await supabase
          .from('invoices')
          .select('application_id')
          .in('application_id', appIds)
          .eq('fee_type', 'application_fee');
        invoicedIds = new Set((invs || []).map((i: any) => i.application_id));
      }
      setApps(((subs || []) as any[]).filter((a) => !invoicedIds.has(a.id)) as PendingApp[]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, []);

  const openPricing = (app: PendingApp) => {
    setPricingApp(app);
    setForm({
      application_fee: '',
      validity_period: app.validity_period || '2_quarter',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      description: `Halal certification application fee — ${app.application_number}`,
      add_subscription: false,
      sub_cycle: 'yearly',
      sub_amount: '',
      sub_plan: 'Annual Maintenance',
      send_email: true,
    });
  };

  const handleSubmit = async () => {
    if (!pricingApp || !form.application_fee || Number(form.application_fee) <= 0) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Enter a valid application fee.' });
      return;
    }
    setSaving(true);
    try {
      // Update validity + fee on application
      await supabase.from('certification_applications').update({
        validity_period: form.validity_period,
        application_fee: parseFloat(form.application_fee),
      }).eq('id', pricingApp.id);

      // Create application_fee invoice
      const { data: invNum, error: numErr } = await supabase.rpc('generate_invoice_number');
      if (numErr) throw numErr;
      if (!invNum) throw new Error('Could not generate invoice number');
      const { data: createdInv, error: invErr } = await supabase.from('invoices').insert({
        invoice_number: invNum as string,
        organization_id: pricingApp.organization_id,
        application_id: pricingApp.id,
        fee_type: 'application_fee',
        description: form.description || null,
        amount: parseFloat(form.application_fee),
        due_date: form.due_date,
      }).select('id').single();
      if (invErr) throw invErr;
      const createdInvoiceIds: string[] = [createdInv!.id];

      // Optional subscription + linked invoice
      if (form.add_subscription && form.sub_amount && Number(form.sub_amount) > 0) {
        const startDate = new Date().toISOString().slice(0, 10);
        const next = new Date();
        if (form.sub_cycle === 'monthly') next.setMonth(next.getMonth() + 1);
        else if (form.sub_cycle === 'quarterly') next.setMonth(next.getMonth() + 3);
        else next.setFullYear(next.getFullYear() + 1);
        const { data: sub, error: subErr } = await supabase.from('subscriptions').insert({
          organization_id: pricingApp.organization_id,
          application_id: pricingApp.id,
          plan_name: form.sub_plan,
          billing_cycle: form.sub_cycle,
          amount: parseFloat(form.sub_amount),
          start_date: startDate,
          next_billing_date: next.toISOString().slice(0, 10),
          status: 'active',
        }).select('id').single();
        if (subErr) throw subErr;

        const { data: subInvNum } = await supabase.rpc('generate_invoice_number');
        const { data: subInv, error: subInvErr } = await supabase.from('invoices').insert({
          invoice_number: subInvNum as string,
          organization_id: pricingApp.organization_id,
          application_id: pricingApp.id,
          subscription_id: sub!.id,
          fee_type: 'subscription',
          description: `${form.sub_plan} (${form.sub_cycle})`,
          amount: parseFloat(form.sub_amount),
          due_date: form.due_date,
        }).select('id').single();
        if (subInvErr) throw subInvErr;
        createdInvoiceIds.push(subInv!.id);
      }

      // Send emails
      if (form.send_email) {
        for (const id of createdInvoiceIds) {
          try {
            await supabase.functions.invoke('send-invoice-email', { body: { invoice_id: id } });
          } catch (e) {
            console.error('email send failed', e);
          }
        }
      }

      toast({
        title: 'Invoice created',
        description: form.send_email ? 'Invoice(s) emailed to client.' : 'Invoice(s) saved.',
      });
      setPricingApp(null);
      fetchApps();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-600" /> Awaiting Pricing</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Submitted applications waiting for an invoice.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchApps} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : apps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">All caught up — no pending applications.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.application_number}</TableCell>
                  <TableCell>{a.organizations?.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{a.sector}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {a.validity_period
                      ? VALIDITY_OPTIONS.find(v => v.value === a.validity_period)?.label || a.validity_period
                      : <span className="text-muted-foreground">Not set</span>}
                  </TableCell>
                  <TableCell className="text-sm">{a.submitted_at ? format(new Date(a.submitted_at), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => openPricing(a)}>
                      <DollarSign className="h-4 w-4 mr-1" /> Set Price &amp; Invoice
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!pricingApp} onOpenChange={(o) => !o && setPricingApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Set Pricing — {pricingApp?.application_number}</DialogTitle>
          </DialogHeader>
          {pricingApp && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">{pricingApp.organizations?.name}</p>
                <p className="text-muted-foreground text-xs mt-1">{pricingApp.organizations?.contact_email || 'No contact email on file'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Validity Period *</Label>
                  <Select value={form.validity_period} onValueChange={(v) => setForm(p => ({ ...p, validity_period: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALIDITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Application Fee (ZMW) *</Label>
                  <Input type="number" step="0.01" min="0" value={form.application_fee} onChange={(e) => setForm(p => ({ ...p, application_fee: e.target.value }))} placeholder="e.g. 3500.00" />
                </div>
              </div>

              <div>
                <Label>Due Date *</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="border rounded-md p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.add_subscription} onChange={(e) => setForm(p => ({ ...p, add_subscription: e.target.checked }))} />
                  Bundle a recurring subscription
                </label>
                {form.add_subscription && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-xs">Plan name</Label>
                      <Input value={form.sub_plan} onChange={(e) => setForm(p => ({ ...p, sub_plan: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Cycle</Label>
                      <Select value={form.sub_cycle} onValueChange={(v: any) => setForm(p => ({ ...p, sub_cycle: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Subscription amount (ZMW)</Label>
                      <Input type="number" step="0.01" min="0" value={form.sub_amount} onChange={(e) => setForm(p => ({ ...p, sub_amount: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.send_email} onChange={(e) => setForm(p => ({ ...p, send_email: e.target.checked }))} />
                Email invoice(s) with PDF attachment now
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingApp(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
