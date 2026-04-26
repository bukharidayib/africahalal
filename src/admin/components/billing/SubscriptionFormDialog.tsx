import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Save } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type BillingCycle =
  | '1_month' | '2_months' | '3_months' | '4_months' | '6_months' | '12_months'
  | '1_quarter' | '2_quarters' | '3_quarters' | '4_quarters';

const CYCLE_OPTIONS: { value: BillingCycle; label: string; months: number }[] = [
  { value: '1_month', label: '1 Month', months: 1 },
  { value: '2_months', label: '2 Months', months: 2 },
  { value: '3_months', label: '3 Months', months: 3 },
  { value: '4_months', label: '4 Months', months: 4 },
  { value: '6_months', label: '6 Months', months: 6 },
  { value: '12_months', label: '12 Months', months: 12 },
  { value: '1_quarter', label: '1 Quarter (3 mo)', months: 3 },
  { value: '2_quarters', label: '2 Quarters (6 mo)', months: 6 },
  { value: '3_quarters', label: '3 Quarters (9 mo)', months: 9 },
  { value: '4_quarters', label: '4 Quarters (12 mo)', months: 12 },
];

const STATUS_OPTIONS = ['active', 'suspended', 'cancelled', 'expired'] as const;

interface Sub {
  id?: string;
  organization_id: string;
  plan_name: string;
  billing_cycle: string;
  amount: number;
  currency?: string;
  status: string;
  start_date: string;
  end_date?: string | null;
  next_billing_date?: string | null;
  notes?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organizationId: string;
  initial?: Sub | null;
  onSaved?: (sub: Sub & { id: string }, eventType: 'created' | 'updated') => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (dateStr: string, months: number) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export function SubscriptionFormDialog({ open, onOpenChange, organizationId, initial, onSaved }: Props) {
  const { toast } = useToast();
  const isEdit = !!initial?.id;

  const [planName, setPlanName] = useState('Halal Certification Membership');
  const [cycle, setCycle] = useState<BillingCycle>('12_months');
  const [amount, setAmount] = useState<string>('0');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(addMonths(today(), 12));
  const [nextBilling, setNextBilling] = useState(addMonths(today(), 12));
  const [status, setStatus] = useState<string>('active');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const cycleMonths = useMemo(() => CYCLE_OPTIONS.find((c) => c.value === cycle)?.months ?? 12, [cycle]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setPlanName(initial.plan_name);
      setCycle((initial.billing_cycle as BillingCycle) || '12_months');
      setAmount(String(initial.amount ?? 0));
      setStartDate(initial.start_date || today());
      setEndDate(initial.end_date || addMonths(initial.start_date || today(), 12));
      setNextBilling(initial.next_billing_date || addMonths(initial.start_date || today(), 12));
      setStatus(initial.status || 'active');
      setNotes(initial.notes || '');
    } else {
      setPlanName('Halal Certification Membership');
      setCycle('12_months');
      setAmount('0');
      const t = today();
      setStartDate(t);
      setEndDate(addMonths(t, 12));
      setNextBilling(addMonths(t, 12));
      setStatus('active');
      setNotes('');
    }
  }, [open, initial]);

  // Recompute end / next billing when cycle or start changes (only for new)
  useEffect(() => {
    if (isEdit) return;
    setEndDate(addMonths(startDate, cycleMonths));
    setNextBilling(addMonths(startDate, cycleMonths));
  }, [cycle, startDate, isEdit, cycleMonths]);

  const save = async () => {
    if (!planName.trim()) { toast({ variant: 'destructive', title: 'Plan name required' }); return; }
    if (Number.isNaN(Number(amount)) || Number(amount) < 0) { toast({ variant: 'destructive', title: 'Invalid amount' }); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        organization_id: organizationId,
        plan_name: planName.trim(),
        billing_cycle: cycle,
        amount: Number(amount),
        currency: 'ZMW',
        status,
        start_date: startDate,
        end_date: endDate || null,
        next_billing_date: nextBilling || null,
        notes: notes.trim() || null,
      };
      let saved: any;
      if (isEdit && initial?.id) {
        const { data, error } = await supabase.from('subscriptions').update(payload).eq('id', initial.id).select().single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase.from('subscriptions').insert({ ...payload, created_by: user?.id }).select().single();
        if (error) throw error;
        saved = data;
      }
      toast({ title: isEdit ? 'Subscription updated' : 'Subscription created' });
      onOpenChange(false);
      onSaved?.(saved, isEdit ? 'updated' : 'created');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> {isEdit ? 'Edit' : 'New'} Subscription</DialogTitle>
          <DialogDescription>Subscriptions are independent from halal certificates. Pick month-based or quarter-based duration.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Plan Name *</Label>
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Billing Cycle *</Label>
              <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs text-muted-foreground">Month-based</div>
                  {CYCLE_OPTIONS.filter((c) => c.value.endsWith('month') || c.value.endsWith('months')).map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1">Quarter-based</div>
                  {CYCLE_OPTIONS.filter((c) => c.value.includes('quarter')).map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (ZMW) *</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>Next Billing</Label>
              <Input type="date" value={nextBilling} onChange={(e) => setNextBilling(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
