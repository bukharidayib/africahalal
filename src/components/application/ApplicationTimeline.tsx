import { useEffect, useState } from "react";
import { Clock, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  applicationId: string;
  createdAt?: string;
}

interface Event {
  id: string;
  ts: string;
  kind: "status" | "message";
  title: string;
  detail?: string | null;
  badge?: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  awaiting_inspection: "Awaiting Inspection",
  inspection_complete: "Inspection Complete",
  pending_decision: "Pending Decision",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

export function ApplicationTimeline({ applicationId, createdAt }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [history, messages] = await Promise.all([
        supabase
          .from("application_status_history")
          .select("id, from_status, to_status, created_at, reason")
          .eq("application_id", applicationId)
          .order("created_at", { ascending: true }),
        supabase
          .from("application_messages")
          .select("id, sender_role, message, sent_at, message_type")
          .eq("application_id", applicationId)
          .order("sent_at", { ascending: true }),
      ]);

      if (cancelled) return;

      const evts: Event[] = [];

      if (createdAt) {
        evts.push({
          id: "created",
          ts: createdAt,
          kind: "status",
          title: "Application Created",
          badge: "Draft",
        });
      }

      (history.data || []).forEach((h: any) => {
        const fromLabel = h.from_status ? STATUS_LABELS[h.from_status] || h.from_status : null;
        const toLabel = STATUS_LABELS[h.to_status] || h.to_status;
        evts.push({
          id: `s-${h.id}`,
          ts: h.created_at,
          kind: "status",
          title: fromLabel ? `${fromLabel} → ${toLabel}` : `Status: ${toLabel}`,
          detail: h.reason,
          badge: toLabel,
        });
      });

      (messages.data || []).forEach((m: any) => {
        evts.push({
          id: `m-${m.id}`,
          ts: m.sent_at,
          kind: "message",
          title: `${m.sender_role === "admin" ? "Admin" : "Client"} message`,
          detail: m.message,
          badge: m.message_type,
        });
      });

      evts.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      setEvents(evts);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, createdAt]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Application Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No timeline events yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6">
              {events.map((e) => {
                const Icon = e.kind === "status" ? ArrowRight : MessageSquare;
                return (
                  <div key={e.id} className="relative pl-10">
                    <div
                      className={`absolute left-1 top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background ${
                        e.kind === "status" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{e.title}</p>
                        {e.badge && (
                          <Badge variant="outline" className="text-xs">
                            {e.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.ts), "dd MMM yyyy, HH:mm")}
                      </p>
                      {e.detail && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
