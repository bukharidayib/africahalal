import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, ClipboardList, AlertTriangle, TrendingUp, Eye, Search, Download } from "lucide-react";
import { format } from "date-fns";

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily_checklist: "Daily Checklist",
  weekly_summary: "Weekly Summary",
  monthly_performance: "Monthly Performance",
};

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const severityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface UnifiedRow {
  id: string;
  source: "inspector" | "supervisor";
  kind: "report" | "incident";
  date: string;
  authorName: string | unknown;
  orgName: string;
  type: string;
  status: string;
  score: number | null;
  risk: string | null;
  severity?: string | null;
  detailHref: string;
}

export default function AdminReports() {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [insRes, supRes, insIncRes, supIncRes] = await Promise.all([
          (supabase.from("inspector_reports" as any).select("*").order("created_at", { ascending: false }).limit(500) as any),
          (supabase.from("supervisor_reports" as any).select("*").order("created_at", { ascending: false }).limit(500) as any),
          (supabase.from("inspector_incidents" as any).select("*").order("created_at", { ascending: false }).limit(500) as any),
          (supabase.from("supervisor_incidents" as any).select("*").order("created_at", { ascending: false }).limit(500) as any),
        ]);

        const inspectorReports = (insRes.data as any[]) || [];
        const supervisorReports = (supRes.data as any[]) || [];
        const inspectorIncidents = (insIncRes.data as any[]) || [];
        const supervisorIncidents = (supIncRes.data as any[]) || [];

        // Collect all profile IDs and site IDs
        const profileIds = new Set<string>();
        const siteIds = new Set<string>();
        const orgIds = new Set<string>();

        inspectorReports.forEach((r) => { profileIds.add(r.inspector_id); if (r.organization_id) siteIds.add(r.organization_id); });
        supervisorReports.forEach((r) => { profileIds.add(r.supervisor_id); if (r.site_id) siteIds.add(r.site_id); });
        inspectorIncidents.forEach((r) => { profileIds.add(r.reported_by); if (r.organization_id) orgIds.add(r.organization_id); });
        supervisorIncidents.forEach((r) => { profileIds.add(r.reported_by); if (r.site_id) siteIds.add(r.site_id); });

        const [profilesRes, sitesRes] = await Promise.all([
          profileIds.size > 0
            ? supabase.from("profiles").select("id, full_name").in("id", Array.from(profileIds))
            : Promise.resolve({ data: [] } as any),
          siteIds.size > 0
            ? (supabase.from("supervisor_sites" as any).select("id, organization_id, site_name").in("id", Array.from(siteIds)) as any)
            : Promise.resolve({ data: [] } as any),
        ]);

        const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name || "Unknown"]));
        const siteMap = new Map((sitesRes.data || []).map((s: any) => [s.id, s]));

        // Add org IDs from sites too
        (sitesRes.data || []).forEach((s: any) => { if (s.organization_id) orgIds.add(s.organization_id); });

        const orgsRes = orgIds.size > 0
          ? await supabase.from("organizations").select("id, name").in("id", Array.from(orgIds))
          : { data: [] } as any;
        const orgMap = new Map((orgsRes.data || []).map((o: any) => [o.id, o.name]));

        const resolveOrgFromSite = (siteId: string) => {
          const site = siteMap.get(siteId) as any;
          if (!site) return "Unknown";
          if (site.organization_id && orgMap.has(site.organization_id)) return orgMap.get(site.organization_id) as string;
          return site.site_name || "Unknown";
        };

        const unified: UnifiedRow[] = [
          ...inspectorReports.map((r) => ({
            id: r.id,
            source: "inspector" as const,
            kind: "report" as const,
            date: r.report_date || r.created_at,
            authorName: profileMap.get(r.inspector_id) || "Unknown",
            orgName: r.organization_id ? resolveOrgFromSite(r.organization_id) : "Unknown",
            type: r.report_type,
            status: r.status,
            score: r.compliance_score,
            risk: r.risk_level,
            detailHref: `/admin/reports/inspector/${r.id}`,
          })),
          ...supervisorReports.map((r) => ({
            id: r.id,
            source: "supervisor" as const,
            kind: "report" as const,
            date: r.report_date || r.created_at,
            authorName: profileMap.get(r.supervisor_id) || "Unknown",
            orgName: r.site_id ? resolveOrgFromSite(r.site_id) : "Unknown",
            type: r.report_type,
            status: r.status,
            score: r.compliance_score,
            risk: r.risk_level,
            detailHref: `/admin/supervisor-reports/${r.id}`,
          })),
          ...inspectorIncidents.map((r) => ({
            id: r.id,
            source: "inspector" as const,
            kind: "incident" as const,
            date: r.created_at,
            authorName: profileMap.get(r.reported_by) || "Unknown",
            orgName: r.organization_id ? (orgMap.get(r.organization_id) as string) || "Unknown" : "Unknown",
            type: r.incident_type,
            status: r.status,
            score: null,
            risk: null,
            severity: r.severity,
            detailHref: `/admin/incidents/inspector/${r.id}`,
          })),
          ...supervisorIncidents.map((r) => ({
            id: r.id,
            source: "supervisor" as const,
            kind: "incident" as const,
            date: r.created_at,
            authorName: profileMap.get(r.reported_by) || "Unknown",
            orgName: r.site_id ? resolveOrgFromSite(r.site_id) : "Unknown",
            type: r.incident_type,
            status: r.status,
            score: null,
            risk: null,
            severity: r.severity,
            detailHref: `/admin/incidents/supervisor/${r.id}`,
          })),
        ];

        unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRows(unified);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const reports = rows.filter((r) => r.kind === "report");
    const incidents = rows.filter((r) => r.kind === "incident");
    const today = format(new Date(), "yyyy-MM-dd");
    const submittedToday = reports.filter((r) => r.status === "submitted" && r.date?.startsWith(today)).length;
    const openIncidents = incidents.filter((i) => i.status === "open").length;
    const submittedReports = reports.filter((r) => r.status === "submitted" && r.score != null);
    const avgScore = submittedReports.length
      ? Math.round(submittedReports.reduce((s, r) => s + Number(r.score || 0), 0) / submittedReports.length)
      : 0;
    return { total: reports.length, submittedToday, openIncidents, avgScore };
  }, [rows]);

  const applyFilters = (subset: UnifiedRow[]) => {
    return subset.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (riskFilter !== "all" && r.risk !== riskFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.authorName.toLowerCase().includes(q) && !r.orgName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  };

  const allFiltered = applyFilters(rows);
  const inspectorReportRows = applyFilters(rows.filter((r) => r.source === "inspector" && r.kind === "report"));
  const supervisorReportRows = applyFilters(rows.filter((r) => r.source === "supervisor" && r.kind === "report"));
  const incidentRows = applyFilters(rows.filter((r) => r.kind === "incident"));

  const exportCsv = (data: UnifiedRow[], name: string) => {
    const headers = ["Date", "Source", "Kind", "Author", "Organization", "Type", "Status", "Score", "Risk", "Severity"];
    const lines = [headers.join(",")];
    data.forEach((r) => {
      lines.push([
        r.date, r.source, r.kind, r.authorName, r.orgName, r.type, r.status,
        r.score ?? "", r.risk ?? "", r.severity ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name}-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight">Reports & Incidents</h1>
            <p className="text-muted-foreground mt-1">Aggregated reports and incidents from inspector and supervisor portals</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Reports</p><p className="text-3xl font-bold mt-1">{stats.total}</p></div><FileText className="h-8 w-8 text-muted-foreground/40" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Submitted Today</p><p className="text-3xl font-bold mt-1">{stats.submittedToday}</p></div><ClipboardList className="h-8 w-8 text-muted-foreground/40" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Open Incidents</p><p className="text-3xl font-bold mt-1 text-amber-600">{stats.openIncidents}</p></div><AlertTriangle className="h-8 w-8 text-amber-500/40" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Avg. Compliance</p><p className="text-3xl font-bold mt-1">{stats.avgScore}%</p></div><TrendingUp className="h-8 w-8 text-muted-foreground/40" /></div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search author or organization..." className="pl-9" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="daily_checklist">Daily Checklist</SelectItem>
                  <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                  <SelectItem value="monthly_performance">Monthly Performance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <TabsList>
                <TabsTrigger value="all">All ({allFiltered.length})</TabsTrigger>
                <TabsTrigger value="inspector">Inspector Reports ({inspectorReportRows.length})</TabsTrigger>
                <TabsTrigger value="supervisor">Supervisor Reports ({supervisorReportRows.length})</TabsTrigger>
                <TabsTrigger value="incidents">Incidents ({incidentRows.length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all"><ReportTable data={allFiltered} onExport={() => exportCsv(allFiltered, "all-reports")} /></TabsContent>
            <TabsContent value="inspector"><ReportTable data={inspectorReportRows} onExport={() => exportCsv(inspectorReportRows, "inspector-reports")} /></TabsContent>
            <TabsContent value="supervisor"><ReportTable data={supervisorReportRows} onExport={() => exportCsv(supervisorReportRows, "supervisor-reports")} /></TabsContent>
            <TabsContent value="incidents"><ReportTable data={incidentRows} onExport={() => exportCsv(incidentRows, "incidents")} showSeverity /></TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}

function ReportTable({ data, onExport, showSeverity }: { data: UnifiedRow[]; onExport: () => void; showSeverity?: boolean }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No records match your filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-end p-3 border-b">
          <Button variant="outline" size="sm" onClick={onExport}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                {showSeverity ? <TableHead>Severity</TableHead> : <><TableHead>Score</TableHead><TableHead>Risk</TableHead></>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={`${r.kind}-${r.source}-${r.id}`} className="hover:bg-muted/30">
                  <TableCell className="font-medium whitespace-nowrap">{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                  <TableCell><Badge variant={r.source === "inspector" ? "default" : "secondary"} className="capitalize">{r.source}</Badge></TableCell>
                  <TableCell>{r.authorName}</TableCell>
                  <TableCell>{r.orgName}</TableCell>
                  <TableCell className="capitalize">{REPORT_TYPE_LABELS[r.type] || r.type?.replace(/_/g, " ")}</TableCell>
                  <TableCell><Badge variant={r.status === "submitted" || r.status === "closed" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                  {showSeverity ? (
                    <TableCell>{r.severity ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[r.severity] || ""}`}>{r.severity.toUpperCase()}</span> : "—"}</TableCell>
                  ) : (
                    <>
                      <TableCell>{r.score != null ? `${r.score}%` : "—"}</TableCell>
                      <TableCell>{r.risk ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColors[r.risk] || ""}`}>{r.risk.toUpperCase()}</span> : "—"}</TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={r.detailHref}><Eye className="h-4 w-4 mr-1" /> View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
