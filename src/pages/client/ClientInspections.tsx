import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, ClipboardCheck, ThumbsUp, ThumbsDown, AlertTriangle, Hourglass } from "lucide-react";
import { format } from "date-fns";

interface InspectionRow {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  certification_applications: {
    application_number: string;
    scope: string;
    organizations: { name: string } | null;
  } | null;
  report?: {
    status: string | null;
    compliance_score: number | null;
    review_notes: string | null;
    reviewed_at: string | null;
  } | null;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const reportStatusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  submitted: { label: "Awaiting Admin Review", icon: Hourglass, cls: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20" },
  approved: { label: "Inspection Approved", icon: ThumbsUp, cls: "border-green-500/40 bg-green-50 dark:bg-green-950/20" },
  rejected: { label: "Inspection Rejected", icon: ThumbsDown, cls: "border-red-500/40 bg-red-50 dark:bg-red-950/20" },
  conditional: { label: "Conditional Approval", icon: AlertTriangle, cls: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20" },
};

export default function ClientInspections() {
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("inspections")
        .select("id, scheduled_date, scheduled_time, status, notes, certification_applications(application_number, scope, organizations(name))")
        .order("scheduled_date", { ascending: false });

      const rows = (data as any[]) || [];

      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const { data: reports } = await supabase
          .from("inspection_reports")
          .select("inspection_id, status, compliance_score, review_notes, reviewed_at")
          .in("inspection_id", ids);
        const map = new Map((reports || []).map((r: any) => [r.inspection_id, r]));
        rows.forEach(r => { r.report = map.get(r.id) || null; });
      }

      setInspections(rows);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Scheduled Inspections</h1>
          <p className="text-muted-foreground">View upcoming and past inspections for your organization.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Inspections Scheduled</h3>
              <p className="text-sm text-muted-foreground mt-1">Once your application is approved for inspection, it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {inspections.map((insp) => {
              const reportCfg = insp.report?.status ? reportStatusConfig[insp.report.status] : null;
              const ReportIcon = reportCfg?.icon;
              return (
                <Card key={insp.id} className={reportCfg?.cls}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        {insp.certification_applications?.application_number || "—"}
                      </CardTitle>
                      <Badge className={statusColors[insp.status] || ""}>{insp.status.replace("_", " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{insp.certification_applications?.organizations?.name} — {insp.certification_applications?.scope}</p>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(insp.scheduled_date), "PPP")}
                      </span>
                      {insp.scheduled_time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {insp.scheduled_time}
                        </span>
                      )}
                    </div>
                    {insp.notes && <p className="text-muted-foreground italic">{insp.notes}</p>}

                    {reportCfg && ReportIcon && (
                      <div className="mt-3 pt-3 border-t flex items-start gap-3">
                        <ReportIcon className="h-5 w-5 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold">{reportCfg.label}</p>
                          {insp.report?.compliance_score != null && (
                            <p className="text-xs text-muted-foreground mt-0.5">Compliance Score: <span className="font-medium text-foreground">{insp.report.compliance_score}%</span></p>
                          )}
                          {insp.report?.reviewed_at && (
                            <p className="text-xs text-muted-foreground">Reviewed on {format(new Date(insp.report.reviewed_at), "PPp")}</p>
                          )}
                          {insp.report?.review_notes && (
                            <div className="mt-2 p-2 bg-background/60 rounded border">
                              <p className="text-xs text-muted-foreground mb-0.5">Admin Review Notes</p>
                              <p className="text-sm whitespace-pre-wrap">{insp.report.review_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
