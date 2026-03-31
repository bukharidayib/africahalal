import { useState, useEffect, useRef } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, BarChart3, TrendingUp, Download, Send, Save, Plus,
  Target, AlertTriangle, CheckCircle, Activity, FileText, Calendar,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import jsPDF from "jspdf";

const CATEGORIES = [
  { key: "shariah_compliance", label: "Shariah Compliance" },
  { key: "sop_adherence", label: "SOP & Process" },
  { key: "staff_training", label: "Staff & Training" },
  { key: "facility_hygiene", label: "Facility & Hygiene" },
  { key: "documentation", label: "Documentation" },
];

const KPI_FIELDS = [
  { key: "inspections_conducted", label: "Inspections Conducted", icon: CheckCircle },
  { key: "ncrs_raised", label: "NCRs Raised", icon: AlertTriangle },
  { key: "ncrs_resolved", label: "NCRs Resolved", icon: Target },
  { key: "incidents_reported", label: "Incidents Reported", icon: Activity },
  { key: "staff_training_sessions", label: "Training Sessions", icon: FileText },
  { key: "overall_compliance_pct", label: "Overall Compliance %", icon: TrendingUp },
];

const PIE_COLORS = ["hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(215, 20%, 65%)", "hsl(262, 52%, 47%)"];

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function SupervisorPerformance() {
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const [viewMode, setViewMode] = useState<"dashboard" | "create">("dashboard");

  const [reports, setReports] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  const [kpiValues, setKpiValues] = useState<Record<string, number>>(
    Object.fromEntries(KPI_FIELDS.map(f => [f.key, 0]))
  );
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map(c => [c.key, 0]))
  );
  const [commentary, setCommentary] = useState("");
  const [notes, setNotes] = useState("");

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadSites() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await (supabase
        .from("organization_supervisors" as any)
        .select("*, organizations(name, id)")
        .eq("supervisor_id", session.user.id) as any);
      const siteList = (data as any[]) || [];
      setSites(siteList);
      if (siteList.length === 1) setSelectedSite(siteList[0].organization_id);
      setIsLoading(false);
    }
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSite && viewMode === "dashboard") loadPerformanceData();
  }, [selectedSite, dateFrom, dateTo, viewMode]);

  const loadPerformanceData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Find all site IDs for this org
    const { data: siteRows } = await supabase
      .from("supervisor_sites")
      .select("id")
      .eq("supervisor_id", session.user.id)
      .eq("organization_id", selectedSite)
      .eq("is_active", true);

    const siteIds = (siteRows || []).map((s: any) => s.id);
    if (siteIds.length === 0) { setReports([]); setTrendData([]); return; }

    const { data } = await supabase
      .from("supervisor_reports")
      .select("*")
      .eq("supervisor_id", session.user.id)
      .in("site_id", siteIds)
      .eq("report_type", "monthly_performance")
      .gte("report_date", dateFrom)
      .lte("report_date", dateTo)
      .order("report_date", { ascending: true });

    const reportList = (data as any[]) || [];
    setReports(reportList);

    const trend = reportList.map((r: any) => {
      const content = r.report_content || {};
      const kpis = content.kpis || {};
      return {
        date: format(new Date(r.report_date), "MMM yyyy"),
        compliance: kpis.overall_compliance_pct || r.compliance_score || 0,
        inspections: kpis.inspections_conducted || 0,
        ncrs: kpis.ncrs_raised || 0,
      };
    });
    setTrendData(trend);
  };

  const saveReport = async (submit: boolean) => {
    if (!selectedSite) {
      toast({ variant: "destructive", title: "Error", description: "Please select a company." });
      return;
    }

    submit ? setIsSubmitting(true) : setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Resolve organization_id to supervisor_sites id (find or create)
      const selectedOrg = sites.find((s: any) => s.organization_id === selectedSite);
      const orgName = selectedOrg?.organizations?.name || "Site";
      let { data: existingSite } = await supabase
        .from("supervisor_sites")
        .select("id")
        .eq("supervisor_id", session.user.id)
        .eq("organization_id", selectedSite)
        .eq("is_active", true)
        .maybeSingle();

      if (!existingSite) {
        const { data: newSite, error: siteErr } = await supabase.from("supervisor_sites").insert({
          supervisor_id: session.user.id,
          organization_id: selectedSite,
          site_name: orgName,
        }).select("id").single();
        if (siteErr) throw siteErr;
        existingSite = newSite;
      }

      const siteId = existingSite!.id;

      const reportContent = {
        type: "monthly",
        kpis: kpiValues,
        category_breakdown: categoryBreakdown,
        commentary,
      };

      const riskLevel = kpiValues.overall_compliance_pct >= 80 ? "low" : kpiValues.overall_compliance_pct >= 60 ? "medium" : "high";

      const { error: reportError } = await supabase.from("supervisor_reports").insert({
        supervisor_id: session.user.id,
        site_id: siteId,
        report_type: "monthly_performance",
        report_date: format(new Date(), "yyyy-MM-dd"),
        status: submit ? "submitted" : "draft",
        submitted_at: submit ? new Date().toISOString() : null,
        compliance_score: submit ? kpiValues.overall_compliance_pct : null,
        risk_level: submit ? riskLevel : null,
        notes,
        report_content: reportContent,
      });

      if (reportError) throw reportError;

      if (submit) {
        toast({ title: "Performance Report Submitted", description: `Compliance: ${kpiValues.overall_compliance_pct}% | Risk: ${riskLevel.toUpperCase()}` });
      } else {
        toast({ title: "Draft Saved" });
      }

      setViewMode("dashboard");
      loadPerformanceData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const orgName = sites.find(s => s.organization_id === selectedSite)?.organizations?.name || "Unknown";

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Performance Report", 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Company: ${orgName}`, 14, 30);
      doc.text(`Period: ${format(new Date(dateFrom), "dd MMM yyyy")} — ${format(new Date(dateTo), "dd MMM yyyy")}`, 14, 36);
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 42);

      let y = 55;

      if (reports.length > 0) {
        const latest = reports[reports.length - 1];
        const kpis = latest.report_content?.kpis || {};

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Key Performance Indicators", 14, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        KPI_FIELDS.forEach(field => {
          const val = kpis[field.key] ?? 0;
          doc.text(`${field.label}: ${val}${field.key === "overall_compliance_pct" ? "%" : ""}`, 14, y);
          y += 7;
        });

        y += 5;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Category Compliance Breakdown", 14, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const catBreakdown = latest.report_content?.category_breakdown || {};
        CATEGORIES.forEach(cat => {
          doc.text(`${cat.label}: ${catBreakdown[cat.key] ?? 0}%`, 14, y);
          y += 7;
        });

        const commentary = latest.report_content?.commentary;
        if (commentary) {
          y += 5;
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Commentary", 14, y);
          y += 10;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(commentary, 180);
          doc.text(lines, 14, y);
        }
      }

      if (trendData.length > 1) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Performance Trend", 14, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        let ty = 35;
        doc.text("Date | Compliance % | Inspections | NCRs", 14, ty);
        ty += 7;
        trendData.forEach(t => {
          doc.text(`${t.date} | ${t.compliance}% | ${t.inspections} | ${t.ncrs}`, 14, ty);
          ty += 6;
        });
      }

      doc.save(`performance-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "PDF Exported" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Export Failed", description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <SupervisorLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></SupervisorLayout>;
  }

  const latestReport = reports.length > 0 ? reports[reports.length - 1] : null;
  const latestKpis = latestReport?.report_content?.kpis || {};
  const latestCategories = latestReport?.report_content?.category_breakdown || {};

  const barData = Object.entries(latestCategories).map(([key, value]) => ({
    name: CATEGORIES.find(c => c.key === key)?.label || key,
    score: value as number,
  }));

  const pieData = CATEGORIES.map(cat => ({
    name: cat.label,
    value: (latestCategories[cat.key] as number) || 0,
  })).filter(d => d.value > 0);

  return (
    <SupervisorLayout>
      <div className="space-y-6" ref={reportRef}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Monthly Performance
            </h1>
            <p className="text-muted-foreground mt-1">Track KPIs, compliance trends, and performance metrics</p>
          </div>
          <div className="flex gap-2">
            {viewMode === "dashboard" ? (
              <>
                <Button variant="outline" onClick={exportPDF} disabled={isExporting || reports.length === 0}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export PDF
                </Button>
                <Button onClick={() => setViewMode("create")}>
                  <Plus className="mr-2 h-4 w-4" /> New Report
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setViewMode("dashboard")}>
                Back to Dashboard
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                {sites.length <= 1 ? (
                  <Input value={sites[0]?.organizations?.name || "No company assigned"} disabled className="bg-muted" />
                ) : (
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s: any) => (
                        <SelectItem key={s.id} value={s.organization_id}>{s.organizations?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {viewMode === "dashboard" && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> From</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> To</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {viewMode === "dashboard" && (
          <>
            {reports.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg">No performance reports yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first monthly performance report to start tracking KPIs.</p>
                  <Button onClick={() => setViewMode("create")}>
                    <Plus className="mr-2 h-4 w-4" /> Create Report
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {KPI_FIELDS.map(field => {
                    const Icon = field.icon;
                    return (
                      <Card key={field.key}>
                        <CardContent className="pt-4 pb-3 text-center">
                          <Icon className="h-5 w-5 mx-auto text-primary mb-1" />
                          <p className="text-2xl font-bold">{latestKpis[field.key] ?? 0}{field.key === "overall_compliance_pct" ? "%" : ""}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{field.label}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {latestReport?.risk_level && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Risk Level:</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${riskColors[latestReport.risk_level] || ""}`}>
                      {latestReport.risk_level.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Last updated: {format(new Date(latestReport.report_date), "dd MMM yyyy")}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {barData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" /> Category Scores
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                              <YAxis type="category" dataKey="name" width={110} className="text-xs" />
                              <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} />
                              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {pieData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" /> Compliance Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${value}%`}>
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
                  )}
                </div>

                {trendData.length > 1 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" /> Performance Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ left: 0, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" className="text-xs" />
                            <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                            <Tooltip />
                            <Area type="monotone" dataKey="compliance" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} name="Compliance %" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Report History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reports.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                          <div>
                            <p className="text-sm font-medium">{format(new Date(r.report_date), "dd MMMM yyyy")}</p>
                            <p className="text-xs text-muted-foreground">
                              Score: {r.compliance_score ?? "N/A"}% | Risk: {r.risk_level?.toUpperCase() || "N/A"}
                            </p>
                          </div>
                          <Badge variant={r.status === "submitted" ? "default" : "secondary"}>{r.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {latestReport?.report_content?.commentary && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Latest Commentary</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{latestReport.report_content.commentary}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {viewMode === "create" && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {KPI_FIELDS.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={field.key === "overall_compliance_pct" ? 100 : undefined}
                        value={kpiValues[field.key]}
                        onChange={(e) => setKpiValues(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Category Compliance Breakdown (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CATEGORIES.map(cat => (
                    <div key={cat.key} className="space-y-1.5">
                      <Label className="text-xs">{cat.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={categoryBreakdown[cat.key]}
                        onChange={(e) => setCategoryBreakdown(prev => ({ ...prev, [cat.key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Trend Notes & Commentary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  placeholder="Provide trend analysis, performance commentary, and strategic observations..."
                  rows={5}
                  className="text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Label>Additional Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional comments..." rows={3} className="mt-2" />
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-end pb-8">
              <Button variant="outline" onClick={() => saveReport(false)} disabled={isSaving || isSubmitting}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save as Draft
              </Button>
              <Button onClick={() => saveReport(true)} disabled={isSaving || isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Report
              </Button>
            </div>
          </>
        )}
      </div>
    </SupervisorLayout>
  );
}
