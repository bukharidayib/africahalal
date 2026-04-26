import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  /** Edge function name to call. */
  functionName: 'send-certificate-email' | 'send-subscription-email';
  /** Body merged with { event_type: 'manual', custom_message }. */
  payload: Record<string, any>;
}

export function SendNotifyDialog({ open, onOpenChange, title, description, functionName, payload }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const send = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { ...payload, event_type: 'manual', custom_message: message.trim() || undefined },
      });
      if (error) throw error;
      toast({ title: 'Email sent', description: `Delivered to ${data?.recipient || 'client'}.` });
      setMessage('');
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Send failed', description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">
          <Label>Custom message (optional)</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Add a personal note for the client…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
