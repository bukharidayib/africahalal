import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RaiseNCRDialog } from "@/components/ncr/RaiseNCRDialog";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, CheckCircle, AlertTriangle, XCircle, BarChart3, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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

const PIE_COLORS = ["hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(215, 20%, 65%)"];

const WEEKLY_SECTION_LABELS: Record<string, string> = {
  executive_summary: "Executive Summary",
  key_achievements: "Key Achievements This Week",
  compliance_issues: "Compliance Issues Identified",
  corrective_actions: "Corrective Actions Taken",
  recommendations: "Recommendations for Next Week",
};

const KPI_LABELS: Record<string, string> = {
  inspections_conducted: "Inspections Conducted",
  ncrs_raised: "NCRs Raised",
  ncrs_resolved: "NCRs Resolved",
  incidents_reported: "Incidents Reported",
  staff_training_sessions: "Training Sessions",
  overall_compliance_pct: "Overall Compliance %",
};

export default function SupervisorReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [scores, setScores] = useState<any>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: reportData } = await (supabase.from("supervisor_reports" as any).select("*").eq("id", id).single() as any);
      setReport(reportData);

      if (reportData?.report_type === "daily_checklist") {
        const { data: itemsData } = await (supabase.from("supervisor_checklist_items" as any).select("*").eq("report_id", id).order("sort_order") as any);
        setItems((itemsData as any[]) || []);

        const { data: scoreData } = await (supabase.from("supervisor_compliance_scores" as any).select("*").eq("report_id", id).single() as any);
        setScores(scoreData);
      }

      // Resolve application_id via site -> organization -> latest application
      if (reportData?.site_id) {
        const { data: site } = await (supabase.from("supervisor_sites" as any).select("organization_id").eq("id", reportData.site_id).maybeSingle() as any);
        if ((site as any)?.organization_id) {
          const { data: app } = await supabase
            .from("certification_applications")
            .select("id")
            .eq("organization_id", (site as any).organization_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          setApplicationId(app?.id ?? null);
        }
      }

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

  const reportContent = report.report_content || {};
  const reportTypeLabel = report.report_type === "weekly_summary" ? "Weekly Summary" : report.report_type === "monthly_performance" ? "Monthly Performance" : "Daily Checklist";

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Report Detail</h1>
            <p className="text-muted-foreground mt-1">{reportTypeLabel} — {format(new Date(report.report_date), "dd MMMM yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            {applicationId && userId && (
              <RaiseNCRDialog source="supervisor" applicationId={applicationId} reportId={report.id} raisedBy={userId} />
            )}
            <Badge variant={report.status === "submitted" ? "default" : "secondary"}>{report.status}</Badge>
          </div>
        </div>

        {/* === DAILY CHECKLIST VIEW === */}
        {report.report_type === "daily_checklist" && (
          <DailyChecklistView report={report} items={items} scores={scores} />
        )}

        {/* === WEEKLY SUMMARY VIEW === */}
        {report.report_type === "weekly_summary" && (
          <WeeklySummaryView reportContent={reportContent} />
        )}

        {/* === MONTHLY PERFORMANCE VIEW === */}
        {report.report_type === "monthly_performance" && (
          <MonthlyPerformanceView report={report} reportContent={reportContent} />
        )}

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

function DailyChecklistView({ report, items, scores }: { report: any; items: any[]; scores: any }) {
  const categoryScores = scores?.category_scores || {};
  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <>
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
    </>
  );
}

function WeeklySummaryView({ reportContent }: { reportContent: any }) {
  const sections = reportContent?.sections || {};
  const evidenceUrls = reportContent?.evidence_urls || [];

  return (
    <>
      {Object.entries(WEEKLY_SECTION_LABELS).map(([key, label]) => {
        const content = sections[key];
        if (!content) return null;
        return (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
            </CardContent>
          </Card>
        );
      })}

      {evidenceUrls.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Supporting Evidence</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-4 w-4" /> {evidenceUrls.length} file(s) attached
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function MonthlyPerformanceView({ report, reportContent }: { report: any; reportContent: any }) {
  const kpis = reportContent?.kpis || {};
  const categoryBreakdown = reportContent?.category_breakdown || {};
  const commentary = reportContent?.commentary || "";

  const barData = Object.entries(categoryBreakdown).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    score: value as number,
  }));

  const pieData = [
    { name: "Compliant", value: kpis.overall_compliance_pct || 0 },
    { name: "Non-Compliant", value: 100 - (kpis.overall_compliance_pct || 0) },
  ];

  return (
    <>
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(KPI_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">{kpis[key] ?? 0}{key === "overall_compliance_pct" ? "%" : ""}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk & Score Overview */}
      {report.status === "submitted" && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">{report.compliance_score ?? kpis.overall_compliance_pct ?? 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${riskColors[report.risk_level] || ""}`}>
                {report.risk_level?.toUpperCase() || "N/A"}
              </span>
              <p className="text-xs text-muted-foreground mt-2">Risk Level</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bar Chart - Category Scores */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Category Compliance Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart - Compliance Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Compliance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Commentary */}
      {commentary && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Trend Notes & Commentary</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{commentary}</p></CardContent>
        </Card>
      )}
    </>
  );
}
