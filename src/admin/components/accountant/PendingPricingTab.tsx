import { useEffect, useState, KeyboardEvent } from 'react';
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
import { Loader2, DollarSign, Send, AlertCircle, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';

const VALIDITY_OPTIONS = [
  { value: '1_quarter', label: '1 Quarter (3 months)' },
  { value: '2_quarter', label: '2 Quarters (6 months)' },
  { value: '3_quarter', label: '3 Quarters (9 months)' },
  { value: '4_quarter', label: '4 Quarters (12 months)' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDaysStr = (base: string, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

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
  const [emails, setEmails] = useState<string[]>([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [form, setForm] = useState({
    application_fee: '',
    validity_period: '2_quarter',
    start_date: todayStr(),
    due_date: addDaysStr(todayStr(), 7),
    description: '',
    send_email: true,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data: subs, error } = await supabase
        .from('certification_applications')
        .select('id, application_number, scope, sector, validity_period, organization_id, submitted_at, organizations(name, contact_email)')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });
      if (error) throw error;

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

  const openPricing = async (app: PendingApp) => {
    setPricingApp(app);
    const start = todayStr();
    setForm({
      application_fee: '',
      validity_period: app.validity_period || '2_quarter',
      start_date: start,
      due_date: addDaysStr(start, 7),
      description: `Halal certification application fee — ${app.application_number}`,
      send_email: true,
    });
    // Pre-populate emails: org contact + any linked profile emails
    const seed: string[] = [];
    if (app.organizations?.contact_email) seed.push(app.organizations.contact_email.trim());
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('organization_id', app.organization_id);
      (profiles || []).forEach((p: any) => {
        if (p?.email && !seed.includes(p.email.trim())) seed.push(p.email.trim());
      });
    } catch { /* ignore */ }
    setEmails(seed.filter((e) => EMAIL_RE.test(e)));
    setEmailDraft('');
  };

  const addEmailFromDraft = () => {
    const parts = emailDraft.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...emails];
    let invalid = '';
    for (const p of parts) {
      if (!EMAIL_RE.test(p)) { invalid = p; continue; }
      if (!next.includes(p)) next.push(p);
    }
    setEmails(next);
    setEmailDraft('');
    if (invalid) toast({ variant: 'destructive', title: 'Invalid email', description: invalid });
  };

  const handleEmailKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (emailDraft.trim()) {
        e.preventDefault();
        addEmailFromDraft();
      }
    } else if (e.key === 'Backspace' && !emailDraft && emails.length) {
      setEmails(emails.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    if (!pricingApp || !form.application_fee || Number(form.application_fee) <= 0) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Enter a valid application fee.' });
      return;
    }
    if (form.send_email && emails.length === 0) {
      toast({ variant: 'destructive', title: 'Recipient required', description: 'Add at least one email address.' });
      return;
    }
    setSaving(true);
    try {
      await supabase.from('certification_applications').update({
        validity_period: form.validity_period,
        application_fee: parseFloat(form.application_fee),
      }).eq('id', pricingApp.id);

      const { data: invNum } = await supabase.rpc('generate_invoice_number');
      const startNote = `Start date: ${format(new Date(form.start_date), 'dd MMM yyyy')}`;
      const fullDescription = form.description ? `${form.description}\n${startNote}` : startNote;

      const { data: createdInv, error: invErr } = await supabase.from('invoices').insert({
        invoice_number: invNum as string,
        organization_id: pricingApp.organization_id,
        application_id: pricingApp.id,
        fee_type: 'application_fee',
        description: fullDescription,
        amount: parseFloat(form.application_fee),
        due_date: form.due_date,
      }).select('id').single();
      if (invErr) throw invErr;

      if (form.send_email) {
        const { error: emailErr } = await supabase.functions.invoke('send-invoice-email', {
          body: { invoice_id: createdInv!.id, recipient_emails: emails },
        });
        if (emailErr) {
          console.error(emailErr);
          toast({ variant: 'destructive', title: 'Email send failed', description: emailErr.message });
        }
      }

      toast({
        title: 'Invoice created',
        description: form.send_email ? `Invoice emailed to ${emails.length} recipient(s).` : 'Invoice saved.',
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Pricing — {pricingApp?.application_number}</DialogTitle>
          </DialogHeader>
          {pricingApp && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Business Name</Label>
                <Input value={pricingApp.organizations?.name || ''} readOnly className="bg-muted" />
              </div>

              <div>
                <Label>Recipient Emails *</Label>
                <div className="min-h-10 w-full rounded-md border border-input bg-background px-2 py-1.5 flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-ring">
                  {emails.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                      {e}
                      <button
                        type="button"
                        onClick={() => setEmails(emails.filter(x => x !== e))}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${e}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-1"
                    placeholder={emails.length ? 'Add another…' : 'client@company.com, another@company.com'}
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    onKeyDown={handleEmailKey}
                    onBlur={() => emailDraft.trim() && addEmailFromDraft()}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Press Enter or comma to add. Backspace to remove last.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Certificate Validity Period *</Label>
                  <Select value={form.validity_period} onValueChange={(v) => setForm(p => ({ ...p, validity_period: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALIDITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Applies once the certificate is issued.</p>
                </div>
                <div>
                  <Label>Application Fee *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">ZMW</span>
                    <Input
                      type="number" step="0.01" min="0"
                      value={form.application_fee}
                      onChange={(e) => setForm(p => ({ ...p, application_fee: e.target.value }))}
                      placeholder="3500.00"
                      className="pl-14"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm(p => ({ ...p, start_date: v, due_date: addDaysStr(v, 7) }));
                    }}
                  />
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.send_email} onChange={(e) => setForm(p => ({ ...p, send_email: e.target.checked }))} />
                Email invoice with PDF attachment now
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
