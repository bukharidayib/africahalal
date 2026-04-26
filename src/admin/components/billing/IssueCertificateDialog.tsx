import { useEffect, useMemo, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
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

export interface EligibleApp {
  id: string;
  application_number: string;
  scope?: string | null;
}

interface IssueCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the application is fixed and not selectable. */
  applicationId?: string;
  /** When applicationId is omitted, admin picks from this list (approved apps without a cert). */
  eligibleApps?: EligibleApp[];
  organizationId: string;
  defaultScope?: string;
  onIssued?: (certificateId: string) => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const oneYearStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Manually issue a certificate. Admin enters validity dates and scope.
 */
export function IssueCertificateDialog({
  open, onOpenChange, applicationId, eligibleApps, organizationId, defaultScope, onIssued,
}: IssueCertificateDialogProps) {
  const { toast } = useToast();
  const [certNumber, setCertNumber] = useState('');
  const [scope, setScope] = useState(defaultScope || '');
  const [issueDate, setIssueDate] = useState(todayStr());
  const [expiryDate, setExpiryDate] = useState(oneYearStr());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickedAppId, setPickedAppId] = useState<string>('');

  const showAppPicker = !applicationId;
  const apps = useMemo(() => eligibleApps || [], [eligibleApps]);

  useEffect(() => {
    if (!open) return;
    setScope(defaultScope || '');
    setIssueDate(todayStr());
    setExpiryDate(oneYearStr());
    setNotes('');
    setPickedAppId(showAppPicker && apps.length === 1 ? apps[0].id : '');
    void preloadNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preloadNumber = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('generate_certificate_number');
      if (data) setCertNumber(String(data));
    } finally {
      setLoading(false);
    }
  };

  const effectiveAppId = applicationId || pickedAppId;

  const handleIssue = async () => {
    if (!effectiveAppId) {
      toast({ variant: 'destructive', title: 'Select an application', description: 'Pick the approved application this certificate belongs to.' });
      return;
    }
    if (!certNumber || !scope.trim() || !issueDate || !expiryDate) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
      return;
    }
    if (new Date(expiryDate) <= new Date(issueDate)) {
      toast({ variant: 'destructive', title: 'Invalid dates', description: 'Expiry must be after issue date.' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const qrHash = crypto.randomUUID().replace(/-/g, '');
      const { data: cert, error } = await supabase.from('certificates').insert({
        certificate_number: certNumber,
        application_id: effectiveAppId,
        organization_id: organizationId,
        scope: scope.trim(),
        issue_date: issueDate,
        expiry_date: expiryDate,
        status: 'active',
        issued_by: user?.id,
        approved_by: user?.id,
        qr_hash: qrHash,
        manually_issued: true,
        issued_notes: notes.trim() || null,
      }).select('id').single();
      if (error) throw error;

      await supabase.from('certificate_history').insert({
        certificate_id: cert.id,
        action: 'manually_issued',
        reason: notes.trim() || 'Manual issuance by admin',
        performed_by: user?.id,
      });

      toast({ title: 'Certificate issued', description: `${certNumber} created successfully.` });
      onOpenChange(false);
      onIssued?.(cert.id);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Issuance failed', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const noApps = showAppPicker && apps.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Issue Certificate Manually
          </DialogTitle>
          <DialogDescription>
            Certificates can only be issued against an approved application that doesn't already have one.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : noApps ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No approved applications without a certificate are available for this business.
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {showAppPicker && (
              <div>
                <Label>Approved Application *</Label>
                <Select
                  value={pickedAppId}
                  onValueChange={(v) => {
                    setPickedAppId(v);
                    const app = apps.find((a) => a.id === v);
                    if (app?.scope && !scope) setScope(app.scope);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select approved application…" /></SelectTrigger>
                  <SelectContent>
                    {apps.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.application_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Certificate Number *</Label>
              <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Auto-generated. Editable.</p>
            </div>
            <div>
              <Label>Scope of Certification *</Label>
              <Textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={3} placeholder="Products / processes covered…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Issue Date *</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>Expiry Date *</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes (audit trail)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Reason for manual issuance…" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleIssue} disabled={submitting || loading}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Award className="h-4 w-4 mr-2" />}
            Issue Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
