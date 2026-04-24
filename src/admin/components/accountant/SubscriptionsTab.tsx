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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, RefreshCw, Repeat, Pencil, Send } from 'lucide-react';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  organization_id: string;
  application_id: string | null;
  plan_name: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  status: string;
  start_date: string;
  next_billing_date: string | null;
  end_date: string | null;
  notes: string | null;
  organizations?: { name: string } | null;
}

const blank = {
  id: '',
  organization_id: '',
  application_id: '',
  plan_name: '',
  billing_cycle: 'yearly',
  amount: '',
  start_date: new Date().toISOString().slice(0, 10),
  next_billing_date: '',
  end_date: '',
  notes: '',
  status: 'active',
};

export default function SubscriptionsTab() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        supabase.from('subscriptions').select('*, organizations(name)').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
      ]);
      if (s.error) throw s.error;
      setSubs((s.data || []) as Subscription[]);
      setOrgs(o.data || []);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const computeNext = (start: string, cycle: string) => {
    const d = new Date(start);
    if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, next_billing_date: computeNext(blank.start_date, 'yearly') });
    setShowForm(true);
  };

  const openEdit = (s: Subscription) => {
    setEditing(s);
    setForm({
      id: s.id,
      organization_id: s.organization_id,
      application_id: s.application_id || '',
      plan_name: s.plan_name,
      billing_cycle: s.billing_cycle,
      amount: String(s.amount),
      start_date: s.start_date,
      next_billing_date: s.next_billing_date || '',
      end_date: s.end_date || '',
      notes: s.notes || '',
      status: s.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.organization_id || !form.plan_name || !form.amount) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Organization, plan and amount required.' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        organization_id: form.organization_id,
        application_id: form.application_id || null,
        plan_name: form.plan_name,
        billing_cycle: form.billing_cycle,
        amount: parseFloat(form.amount),
        start_date: form.start_date,
        next_billing_date: form.next_billing_date || computeNext(form.start_date, form.billing_cycle),
        end_date: form.end_date || null,
        notes: form.notes || null,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from('subscriptions').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscriptions').insert(payload);
        if (error) throw error;
      }
      toast({ title: editing ? 'Updated' : 'Created', description: 'Subscription saved.' });
      setShowForm(false);
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setSaving(false); }
  };

  const handleGenerateInvoice = async (s: Subscription) => {
    setGenerating(s.id);
    try {
      const { data: invNum, error: numErr } = await supabase.rpc('generate_invoice_number');
      if (numErr) throw numErr;
      if (!invNum) throw new Error('Could not generate invoice number');
      const due = new Date(); due.setDate(due.getDate() + 7);
      const { data: inv, error } = await supabase.from('invoices').insert({
        invoice_number: invNum as string,
        organization_id: s.organization_id,
        application_id: s.application_id,
        subscription_id: s.id,
        fee_type: 'subscription',
        description: `${s.plan_name} (${s.billing_cycle})`,
        amount: s.amount,
        due_date: due.toISOString().slice(0, 10),
      }).select('id').single();
      if (error) throw error;

      // Advance next_billing_date
      if (s.next_billing_date) {
        await supabase.from('subscriptions').update({
          next_billing_date: computeNext(s.next_billing_date, s.billing_cycle),
        }).eq('id', s.id);
      }

      // Email it
      try { await supabase.functions.invoke('send-invoice-email', { body: { invoice_id: inv!.id } }); } catch {}
      toast({ title: 'Invoice generated', description: `Invoice ${invNum} created and emailed.` });
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setGenerating(null); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default', paused: 'secondary', cancelled: 'destructive', expired: 'outline',
    };
    return <Badge variant={map[s] || 'outline'}>{s}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Repeat className="h-5 w-5" /> Subscriptions</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Recurring revenue plans for clients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Subscription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Subscription</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Organization *</Label>
                  <Select value={form.organization_id} onValueChange={(v) => setForm(p => ({ ...p, organization_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Plan name *</Label>
                    <Input value={form.plan_name} onChange={(e) => setForm(p => ({ ...p, plan_name: e.target.value }))} placeholder="e.g. Annual Maintenance" />
                  </div>
                  <div>
                    <Label>Billing cycle *</Label>
                    <Select value={form.billing_cycle} onValueChange={(v) => setForm(p => ({ ...p, billing_cycle: v, next_billing_date: computeNext(p.start_date, v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount (ZMW) *</Label>
                    <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value, next_billing_date: computeNext(e.target.value, p.billing_cycle) }))} />
                  </div>
                  <div>
                    <Label>Next billing</Label>
                    <Input type="date" value={form.next_billing_date} onChange={(e) => setForm(p => ({ ...p, next_billing_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>End date</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : subs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Repeat className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No subscriptions yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Next billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.plan_name}</TableCell>
                  <TableCell>{s.organizations?.name || '—'}</TableCell>
                  <TableCell className="capitalize">{s.billing_cycle}</TableCell>
                  <TableCell className="font-semibold">ZMW {Number(s.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-sm">{s.next_billing_date ? format(new Date(s.next_billing_date), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateInvoice(s)}
                        disabled={generating === s.id || s.status !== 'active'}
                      >
                        {generating === s.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                        Invoice now
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
  );
}
