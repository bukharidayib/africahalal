import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  organizationId: string;
}

interface CertAlert {
  id: string;
  certificate_number: string;
  expiry_date: string;
  daysLeft: number;
}
interface SubAlert {
  id: string;
  plan_name: string;
  end_date: string;
  daysOverdue: number;
}

const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

export function BusinessAlerts({ organizationId }: Props) {
  const [certs, setCerts] = useState<CertAlert[]>([]);
  const [subs, setSubs] = useState<SubAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const today = new Date();
      const horizon = new Date();
      horizon.setDate(today.getDate() + 30);

      const [{ data: certRows }, { data: subRows }] = await Promise.all([
        supabase
          .from('certificates')
          .select('id, certificate_number, expiry_date, status')
          .eq('organization_id', organizationId)
          .in('status', ['active'])
          .lte('expiry_date', horizon.toISOString().slice(0, 10)),
        supabase
          .from('subscriptions')
          .select('id, plan_name, end_date, status')
          .eq('organization_id', organizationId)
          .in('status', ['active', 'suspended'])
          .lt('end_date', today.toISOString().slice(0, 10)),
      ]);

      setCerts(
        (certRows || []).map((c: any) => ({
          id: c.id,
          certificate_number: c.certificate_number,
          expiry_date: c.expiry_date,
          daysLeft: daysBetween(new Date(c.expiry_date), today),
        }))
      );
      setSubs(
        (subRows || []).map((s: any) => ({
          id: s.id,
          plan_name: s.plan_name,
          end_date: s.end_date,
          daysOverdue: daysBetween(today, new Date(s.end_date)),
        }))
      );
    })();
  }, [organizationId]);

  const dismiss = (key: string) => setDismissed((prev) => new Set(prev).add(key));
  const visibleCerts = certs.filter((c) => !dismissed.has(`c-${c.id}`));
  const visibleSubs = subs.filter((s) => !dismissed.has(`s-${s.id}`));

  if (!visibleCerts.length && !visibleSubs.length) return null;

  return (
    <div className="space-y-2">
      {visibleCerts.map((c) => {
        const expired = c.daysLeft < 0;
        return (
          <Alert
            key={c.id}
            variant={expired ? 'destructive' : 'default'}
            className={expired ? '' : 'border-amber-500/40 bg-amber-500/5'}
          >
            <AlertTriangle className={`h-4 w-4 ${expired ? '' : 'text-amber-600'}`} />
            <div className="flex-1">
              <AlertTitle className="text-sm">
                Certificate {c.certificate_number}{' '}
                {expired ? `expired ${Math.abs(c.daysLeft)} day(s) ago` : `expires in ${c.daysLeft} day(s)`}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {expired ? 'Expired' : 'Expiry'} date: {new Date(c.expiry_date).toLocaleDateString()}
              </AlertDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => dismiss(`c-${c.id}`)} className="h-6 w-6 p-0">
              <X className="h-3.5 w-3.5" />
            </Button>
          </Alert>
        );
      })}
      {visibleSubs.map((s) => (
        <Alert key={s.id} variant="destructive">
          <CalendarClock className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle className="text-sm">
              Subscription "{s.plan_name}" ended {s.daysOverdue} day(s) ago — renewal overdue
            </AlertTitle>
            <AlertDescription className="text-xs">
              End date: {new Date(s.end_date).toLocaleDateString()}
            </AlertDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => dismiss(`s-${s.id}`)} className="h-6 w-6 p-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
