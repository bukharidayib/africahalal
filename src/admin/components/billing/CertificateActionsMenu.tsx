import { useState } from 'react';
import {
  MoreHorizontal, Download, Mail, ExternalLink, Pause, XCircle, Play, Loader2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CertRow {
  id: string;
  certificate_number: string;
  status: string;
}

interface Props {
  cert: CertRow;
  onChanged?: () => void;
}

type ActionKey = 'suspend' | 'revoke' | 'reactivate' | null;

export function CertificateActionsMenu({ cert, onChanged }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ActionKey>(null);
  const [reason, setReason] = useState('');

  const verifyUrl = `${window.location.origin}/verify/${cert.certificate_number}`;

  const downloadPdf = () => {
    // Open the public verify page (which contains the printable certificate template).
    window.open(verifyUrl + '?print=1', '_blank');
  };

  const sendEmail = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-certificate-email', {
        body: { certificate_id: cert.id, event_type: 'manual' },
      });
      if (error) throw error;
      toast({ title: 'Certificate emailed', description: `Sent to ${data?.recipient || 'client'}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Email failed', description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const applyStatus = async (next: 'active' | 'suspended' | 'revoked') => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('certificates')
        .update({ status: next as any })
        .eq('id', cert.id);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('certificate_history').insert({
        certificate_id: cert.id,
        action: next === 'active' ? 'reactivated' : next,
        reason: reason || `Status changed to ${next}`,
        performed_by: user?.id,
      });
      // Auto-notify client
      const eventType = next === 'active' ? 'reactivated' : next === 'suspended' ? 'suspended' : 'revoked';
      supabase.functions.invoke('send-certificate-email', {
        body: { certificate_id: cert.id, event_type: eventType, custom_message: reason || undefined },
      }).catch((err) => console.warn('cert email failed', err));
      toast({ title: 'Status updated', description: `${cert.certificate_number} → ${next} · client notified` });
      setConfirm(null);
      setReason('');
      onChanged?.();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = () => {
    if (confirm === 'suspend') return applyStatus('suspended');
    if (confirm === 'revoke') return applyStatus('revoked');
    if (confirm === 'reactivate') return applyStatus('active');
  };

  const confirmText = {
    suspend: { title: 'Suspend Certificate', desc: 'Temporarily disable this certificate. It can be reactivated later.', cta: 'Suspend' },
    revoke: { title: 'Revoke Certificate', desc: 'Permanently revoke this certificate. This action is logged in the audit trail.', cta: 'Revoke' },
    reactivate: { title: 'Reactivate Certificate', desc: 'Restore this certificate to active status.', cta: 'Reactivate' },
    null: null as any,
  }[confirm ?? 'null'];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{cert.certificate_number}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={sendEmail}>
            <Mail className="h-4 w-4 mr-2" /> Email to Client
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(verifyUrl, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" /> View Public Page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {cert.status === 'active' && (
            <>
              <DropdownMenuItem onClick={() => setConfirm('suspend')}>
                <Pause className="h-4 w-4 mr-2" /> Suspend
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setConfirm('revoke')}>
                <XCircle className="h-4 w-4 mr-2" /> Revoke
              </DropdownMenuItem>
            </>
          )}
          {(cert.status === 'suspended' || cert.status === 'revoked') && (
            <DropdownMenuItem onClick={() => setConfirm('reactivate')}>
              <Play className="h-4 w-4 mr-2" /> Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md">
          {confirmText && (
            <>
              <DialogHeader>
                <DialogTitle>{confirmText.title}</DialogTitle>
                <DialogDescription>{confirmText.desc}</DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Label>Reason (audit log)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional reason…" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
                <Button
                  variant={confirm === 'revoke' ? 'destructive' : 'default'}
                  onClick={confirmAction}
                  disabled={busy}
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {confirmText.cta}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
