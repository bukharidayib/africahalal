import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  shariah_compliance: "Shariah Compliance",
  sop_adherence: "SOP & Process",
  staff_training: "Staff & Training",
  facility_hygiene: "Facility & Hygiene",
  documentation: "Documentation",
};

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const responseIcons: Record<string, any> = {
  compliant: <CheckCircle className="h-4 w-4 text-green-600" />,
  minor_deviation: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  major_non_compliance: <XCircle className="h-4 w-4 text-red-600" />,
  not_applicable: <span className="text-xs text-muted-foreground">N/A</span>,
};

export default function SupervisorReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [scores, setScores] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: reportData } = await (supabase.from("supervisor_reports" as any).select("*").eq("id", id).single() as any);
      setReport(reportData);

      const { data: itemsData } = await (supabase.from("supervisor_checklist_items" as any).select("*").eq("report_id", id).order("sort_order") as any);
      setItems((itemsData as any[]) || []);

      const { data: scoreData } = await (supabase.from("supervisor_compliance_scores" as any).select("*").eq("report_id", id).single() as any);
      setScores(scoreData);

      setIsLoading(false);
    }
    if (id) load();
  }, [id]);

  if (isLoading) {
    return <SupervisorLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></SupervisorLayout>;
  }

  if (!report) {
    return <SupervisorLayout><p className="text-muted-foreground text-center py-20">Report not found.</p></SupervisorLayout>;
  }

  const categoryScores = scores?.category_scores || {};
  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Report Detail</h1>
            <p className="text-muted-foreground mt-1">{format(new Date(report.report_date), "dd MMMM yyyy")}</p>
          </div>
          <Badge variant={report.status === "submitted" ? "default" : "secondary"}>{report.status}</Badge>
        </div>

        {/* Score Summary */}
        {report.status === "submitted" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">{report.compliance_score}%</p>
                <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${riskColors[report.risk_level] || ""}`}>
                  {report.risk_level?.toUpperCase()}
                </span>
                <p className="text-xs text-muted-foreground mt-2">Risk Level</p>
              </CardContent>
            </Card>
            {Object.entries(categoryScores).slice(0, 2).map(([key, val]: [string, any]) => (
              <Card key={key}>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{val}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{CATEGORY_LABELS[key] || key}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Checklist Items by Category */}
        {Object.entries(groupedItems).map(([category, catItems]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{CATEGORY_LABELS[category] || category}</CardTitle>
                {categoryScores[category] != null && (
                  <span className="text-sm font-semibold text-muted-foreground">{categoryScores[category]}%</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(catItems as any[]).map((item: any, idx: number) => (
                <div key={item.id} className="border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-muted-foreground mt-0.5">{idx + 1}.</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {responseIcons[item.response] || null}
                        <span className="text-sm font-medium">{item.item_description}</span>
                      </div>
                      {item.observation_notes && (
                        <p className="text-xs text-muted-foreground ml-6">{item.observation_notes}</p>
                      )}
                      <div className="flex items-center gap-4 ml-6">
                        {item.observation_time && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(item.observation_time), "HH:mm")}
                          </span>
                        )}
                        {item.evidence_urls?.length > 0 && (
                          <span className="text-[10px] text-primary flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {item.evidence_urls.length} evidence file(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {report.notes && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Additional Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{report.notes}</p></CardContent>
          </Card>
        )}
      </div>
    </SupervisorLayout>
  );
}
