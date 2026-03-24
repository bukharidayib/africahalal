import { useEffect, useState } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { 
  Loader2, Building2, FileText, AlertTriangle, AlertOctagon, 
  TrendingUp, ClipboardCheck, Plus 
} from "lucide-react";
import { format, subDays, isAfter } from "date-fns";

export default function SupervisorDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [site, setSite] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [todayReport, setTodayReport] = useState<any>(null);
  const [latestScore, setLatestScore] = useState<any>(null);
  const [pendingNcrs, setPendingNcrs] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [recentScores, setRecentScores] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get assigned site
      const { data: siteData } = await (supabase.from("supervisor_sites" as any)
        .select("*, organizations(name)")
        .eq("supervisor_id", session.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle() as any);

      if (siteData) {
        setSite(siteData);
        setOrgName((siteData as any).organizations?.name || "");

        // Today's report
        const today = format(new Date(), "yyyy-MM-dd");
        const { data: todayData } = await (supabase.from("supervisor_reports" as any)
          .select("*")
          .eq("site_id", (siteData as any).id)
          .eq("report_date", today)
          .eq("report_type", "daily_checklist")
          .limit(1)
          .maybeSingle() as any);
        setTodayReport(todayData);

        // Latest compliance score
        const { data: scoreData } = await (supabase.from("supervisor_compliance_scores" as any)
          .select("*")
          .eq("site_id", (siteData as any).id)
          .order("score_date", { ascending: false })
          .limit(1)
          .maybeSingle() as any);
        setLatestScore(scoreData);

        // Recent scores for mini trend
        const { data: scoresData } = await (supabase.from("supervisor_compliance_scores" as any)
          .select("score_date, overall_score, risk_level")
          .eq("site_id", (siteData as any).id)
          .order("score_date", { ascending: false })
          .limit(7) as any);
        setRecentScores(((scoresData as any[]) || []).reverse());

        // Pending NCRs
        const { count: ncrCount } = await (supabase.from("supervisor_ncrs" as any)
          .select("id", { count: "exact", head: true })
          .eq("site_id", (siteData as any).id)
          .in("status", ["open", "corrective_action_submitted"]) as any);
        setPendingNcrs(ncrCount || 0);

        // Overdue reports (days in last 7 with no submitted daily report)
        const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
        const { data: recentReports } = await (supabase.from("supervisor_reports" as any)
          .select("report_date")
          .eq("site_id", (siteData as any).id)
          .eq("report_type", "daily_checklist")
          .eq("status", "submitted")
          .gte("report_date", sevenDaysAgo) as any);
        const submittedDates = new Set(((recentReports as any[]) || []).map((r: any) => r.report_date));
        let overdue = 0;
        for (let i = 1; i <= 7; i++) {
          const d = format(subDays(new Date(), i), "yyyy-MM-dd");
          if (!submittedDates.has(d)) overdue++;
        }
        setOverdueCount(overdue);
      } else {
        // Fallback: check organization_supervisors
        const { data: supRecord } = await supabase
          .from("organization_supervisors")
          .select("organization_id, organizations(name)")
          .eq("supervisor_id", session.user.id)
          .limit(1)
          .maybeSingle();
        if (supRecord?.organizations) {
          setOrgName((supRecord.organizations as any).name || "");
        }
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  const riskColor = (level: string) => {
    if (level === "low") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (level === "medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  if (isLoading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Supervisor Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back. Here's your site overview.</p>
          </div>
          {site && (
            <Button asChild>
              <Link to="/supervisor/reports/new">
                <Plus className="mr-2 h-4 w-4" /> Start Daily Report
              </Link>
            </Button>
          )}
        </div>

        {/* Top cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Company</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{orgName || site?.site_name || "Not assigned"}</p>
              {site?.site_address && <p className="text-xs text-muted-foreground">{site.site_address}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Report</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {todayReport ? (
                <>
                  <Badge variant={todayReport.status === "submitted" ? "default" : "secondary"}>
                    {todayReport.status === "submitted" ? "Submitted" : "Draft"}
                  </Badge>
                  {todayReport.compliance_score != null && (
                    <p className="text-xs text-muted-foreground mt-1">Score: {todayReport.compliance_score}%</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-amber-600 font-medium">Not started</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {latestScore ? (
                <>
                  <p className="text-2xl font-bold">{latestScore.overall_score}%</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColor(latestScore.risk_level)}`}>
                    {latestScore.risk_level?.toUpperCase()}
                  </span>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {overdueCount > 0 && (
                  <p className="text-sm text-red-600 font-medium">{overdueCount} overdue report(s)</p>
                )}
                {pendingNcrs > 0 && (
                  <p className="text-sm text-amber-600 font-medium">{pendingNcrs} pending NCR(s)</p>
                )}
                {overdueCount === 0 && pendingNcrs === 0 && (
                  <p className="text-sm text-green-600 font-medium">All clear ✓</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score trend */}
        {recentScores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Compliance Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-24">
                {recentScores.map((s: any, idx: number) => (
                  <div key={idx} className="flex flex-col items-center flex-1 gap-1">
                    <div
                      className={`w-full rounded-t ${riskColor(s.risk_level).split(" ")[0]}`}
                      style={{ height: `${Math.max(s.overall_score * 0.8, 4)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{format(new Date(s.score_date), "dd/MM")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild variant="outline" className="h-16 justify-start">
            <Link to="/supervisor/reports"><FileText className="mr-3 h-5 w-5" /> View All Reports</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 justify-start">
            <Link to="/supervisor/ncrs"><AlertOctagon className="mr-3 h-5 w-5" /> NCR Management</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 justify-start">
            <Link to="/supervisor/incidents"><AlertTriangle className="mr-3 h-5 w-5" /> Report Incident</Link>
          </Button>
        </div>
      </div>
    </SupervisorLayout>
  );
}
