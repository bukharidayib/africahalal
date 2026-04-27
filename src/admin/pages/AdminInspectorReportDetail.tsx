import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, CheckCircle, AlertTriangle, XCircle, BarChart3, TrendingUp, ArrowLeft } from "lucide-react";
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

export default function AdminInspectorReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [inspectorName, setInspectorName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: reportData } = await (supabase.from("inspector_reports" as any).select("*").eq("id", id).single() as any);
      setReport(reportData);

      if (reportData) {
        const [profileRes, siteRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", reportData.inspector_id).maybeSingle(),
          (supabase.from("supervisor_sites" as any).select("organization_id, site_name").eq("id", reportData.organization_id).maybeSingle() as any),
        ]);
        setInspectorName(profileRes.data?.full_name || "Unknown");
        const orgId = (siteRes.data as any)?.organization_id;
        if (orgId) {
          const { data: orgData } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
          setOrgName(orgData?.name || (siteRes.data as any)?.site_name || "Unknown");
        } else {
          setOrgName((siteRes.data as any)?.site_name || "Unknown");
        }

        if (reportData.report_type === "daily_checklist") {
          const { data: itemsData } = await (supabase.from("Inspector_checklist_items" as any).select("*").eq("report_id", id).order("sort_order") as any);
          setItems((itemsData as any[]) || []);
        }
      }
      setIsLoading(false);
    }
    if (id) load();
  }, [id]);

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }
  if (!report) {
    return <AdminLayout><p className="text-muted-foreground text-center py-20">Report not found.</p></AdminLayout>;
  }

  const reportContent = report.report_content || {};
  const reportTypeLabel = report.report_type === "weekly_summary" ? "Weekly Summary" : report.report_type === "monthly_performance" ? "Monthly Performance" : "Daily Checklist";

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/reports")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-tight">Inspector Report</h2>
            <p className="text-muted-foreground">
              {reportTypeLabel} by <span className="font-medium text-foreground">{inspectorName}</span> — {orgName} — {format(new Date(report.report_date), "dd MMMM yyyy")}
            </p>
          </div>
          <Badge variant={report.status === "submitted" ? "default" : "secondary"}>{report.status}</Badge>
        </div>

        {report.report_type === "daily_checklist" && <DailyView report={report} items={items} />}
        {report.report_type === "weekly_summary" && <WeeklyView reportContent={reportContent} />}
        {report.report_type === "monthly_performance" && <MonthlyView report={report} reportContent={reportContent} />}

        {report.notes && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Additional Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.notes}</p></CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function DailyView({ report, items }: { report: any; items: any[] }) {
  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <>
      {report.status === "submitted" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{report.compliance_score}%</p><p className="text-xs text-muted-foreground mt-1">Overall Score</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><span className={`text-sm font-bold px-3 py-1 rounded-full ${riskColors[report.risk_level] || ""}`}>{report.risk_level?.toUpperCase()}</span><p className="text-xs text-muted-foreground mt-2">Risk Level</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{items.length}</p><p className="text-xs text-muted-foreground mt-1">Checklist Items</p></CardContent></Card>
        </div>
      )}

      {Object.entries(groupedItems).map(([category, catItems]) => (
        <Card key={category}>
          <CardHeader className="pb-3"><CardTitle className="text-lg">{CATEGORY_LABELS[category] || category}</CardTitle></CardHeader>
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
                    {item.observation_notes && <p className="text-xs text-muted-foreground ml-6">{item.observation_notes}</p>}
                    <div className="flex items-center gap-4 ml-6">
                      {item.observation_time && <span className="text-[10px] text-muted-foreground">{format(new Date(item.observation_time), "HH:mm")}</span>}
                      {item.evidence_urls?.length > 0 && <span className="text-[10px] text-primary flex items-center gap-1"><FileText className="h-3 w-3" /> {item.evidence_urls.length} evidence file(s)</span>}
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

function WeeklyView({ reportContent }: { reportContent: any }) {
  const sections = reportContent?.sections || {};
  const evidenceUrls = reportContent?.evidence_urls || [];
  return (
    <>
      {Object.entries(WEEKLY_SECTION_LABELS).map(([key, label]) => {
        const content = sections[key];
        if (!content) return null;
        return (
          <Card key={key}>
            <CardHeader className="pb-3"><CardTitle className="text-lg">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p></CardContent>
          </Card>
        );
      })}
      {evidenceUrls.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Supporting Evidence</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="h-4 w-4" /> {evidenceUrls.length} file(s) attached</p></CardContent>
        </Card>
      )}
    </>
  );
}

function MonthlyView({ report, reportContent }: { report: any; reportContent: any }) {
  const kpis = reportContent?.kpis || {};
  const categoryBreakdown = reportContent?.category_breakdown || {};
  const commentary = reportContent?.commentary || "";
  const barData = Object.entries(categoryBreakdown).map(([key, value]) => ({ name: CATEGORY_LABELS[key] || key, score: value as number }));
  const pieData = [
    { name: "Compliant", value: kpis.overall_compliance_pct || 0 },
    { name: "Non-Compliant", value: 100 - (kpis.overall_compliance_pct || 0) },
  ];

  return (
    <>
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

      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Category Compliance Scores</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={140} className="text-xs" />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Compliance Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {commentary && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Trend Notes & Commentary</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{commentary}</p></CardContent>
        </Card>
      )}
    </>
  );
}
