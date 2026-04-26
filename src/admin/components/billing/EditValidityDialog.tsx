import { useEffect, useState } from 'react';
import { Loader2, CalendarDays, Save } from 'lucide-react';
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
import { CertificateTimeline } from './CertificateTimeline';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  certificateId: string;
  initial: { issue_date: string; expiry_date: string; status: string };
  onSaved?: () => void;
}

const addMonths = (dateStr: string, months: number) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export function EditValidityDialog({ open, onOpenChange, certificateId, initial, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [issueDate, setIssueDate] = useState(initial.issue_date);
  const [expiryDate, setExpiryDate] = useState(initial.expiry_date);
  const [status, setStatus] = useState(initial.status);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setIssueDate(initial.issue_date);
    setExpiryDate(initial.expiry_date);
    setStatus(initial.status);
    setReason('');
  }, [open, initial.issue_date, initial.expiry_date, initial.status]);

  const quickExtend = (months: number) => {
    setExpiryDate(addMonths(expiryDate || issueDate || new Date().toISOString().slice(0, 10), months));
  };

  const handleSave = async () => {
    if (!issueDate || !expiryDate) {
      toast({ variant: 'destructive', title: 'Dates required' });
      return;
    }
    if (new Date(expiryDate) <= new Date(issueDate)) {
      toast({ variant: 'destructive', title: 'Invalid dates', description: 'Expiry must be after issue date.' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('certificates')
        .update({ issue_date: issueDate, expiry_date: expiryDate, status: status as any })
        .eq('id', certificateId);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('certificate_history').insert({
        certificate_id: certificateId,
        action: 'validity_updated',
        reason: reason || `Validity manually updated to ${issueDate} → ${expiryDate}`,
        performed_by: user?.id,
      });

      // Auto-notify the client about the certificate change
      supabase.functions.invoke('send-certificate-email', {
        body: { certificate_id: certificateId, event_type: 'updated', custom_message: reason || undefined },
      }).catch((err) => console.warn('cert email failed', err));

      toast({ title: 'Validity updated', description: `Now expires ${expiryDate} · client notified` });
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Edit Certificate Validity</DialogTitle>
          <DialogDescription>Manually adjust the issue date, expiry date and subscription status.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Quick Extend</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Button type="button" size="sm" variant="outline" onClick={() => quickExtend(3)}>+3 months</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => quickExtend(6)}>+6 months</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => quickExtend(12)}>+1 year</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => quickExtend(24)}>+2 years</Button>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reason / Note (audit log)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Subscription extended after manual renewal payment." />
          </div>
        </div>

        <div className="border-t pt-3 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent activity</p>
          <CertificateTimeline certificateId={certificateId} compact />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Validity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
