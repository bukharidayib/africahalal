import { useEffect, useState } from 'react';
import { Loader2, Award, Pencil, Pause, XCircle, Play, Mail, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface HistoryRow {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  performed_by: string;
  actor_name?: string | null;
  actor_email?: string | null;
}

interface Props {
  certificateId: string;
  /** Compact mode used inside dialogs */
  compact?: boolean;
  /** External refresh signal */
  refreshKey?: number;
}

const ACTION_META: Record<string, { label: string; Icon: any; tone: string }> = {
  manually_issued: { label: 'Manually Issued', Icon: Award, tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  issued: { label: 'Issued', Icon: Award, tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  validity_updated: { label: 'Validity Updated', Icon: Pencil, tone: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  updated: { label: 'Updated', Icon: Pencil, tone: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  suspended: { label: 'Suspended', Icon: Pause, tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  revoked: { label: 'Revoked', Icon: XCircle, tone: 'bg-destructive/15 text-destructive' },
  reactivated: { label: 'Reactivated', Icon: Play, tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  emailed: { label: 'Emailed to Client', Icon: Mail, tone: 'bg-violet-500/15 text-violet-700 dark:text-violet-400' },
  default: { label: 'Activity', Icon: FileText, tone: 'bg-muted text-muted-foreground' },
};

const formatRel = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export function CertificateTimeline({ certificateId, compact, refreshKey }: Props) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: history } = await supabase
        .from('certificate_history')
        .select('id, action, reason, created_at, performed_by')
        .eq('certificate_id', certificateId)
        .order('created_at', { ascending: false });
      const list = (history || []) as HistoryRow[];
      const ids = Array.from(new Set(list.map((r) => r.performed_by).filter(Boolean)));
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ids as string[]);
        const map = new Map((profiles || []).map((p: any) => [p.id, p]));
        list.forEach((r) => {
          const p = map.get(r.performed_by);
          r.actor_name = p?.full_name || null;
          r.actor_email = p?.email || null;
        });
      }
      if (!cancelled) {
        setRows(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [certificateId, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading audit timeline…
      </div>
    );
  }

  if (!rows.length) {
    return <p className="text-xs text-muted-foreground py-2">No activity recorded yet.</p>;
  }

  const visible = compact ? rows.slice(0, 4) : rows;

  return (
    <ol className="relative border-l border-border/60 ml-2 space-y-3">
      {visible.map((r) => {
        const meta = ACTION_META[r.action] || ACTION_META.default;
        const Icon = meta.Icon;
        return (
          <li key={r.id} className="ml-4">
            <div className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full flex items-center justify-center ${meta.tone}`}>
              <Icon className="h-2.5 w-2.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={`${meta.tone} border-0 text-[10px] uppercase tracking-wide`}>
                {meta.label}
              </Badge>
              <span className="text-xs font-medium">
                {r.actor_name || r.actor_email || 'System'}
              </span>
              <span className="text-[11px] text-muted-foreground" title={new Date(r.created_at).toLocaleString()}>
                · {formatRel(r.created_at)}
              </span>
            </div>
            {r.reason && (
              <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{r.reason}</p>
            )}
          </li>
        );
      })}
      {compact && rows.length > visible.length && (
        <li className="ml-4 text-[11px] text-muted-foreground">+ {rows.length - visible.length} earlier event(s)</li>
      )}
    </ol>
  );
}
