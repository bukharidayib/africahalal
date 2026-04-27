import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily_checklist: "Daily Checklist",
  weekly_summary: "Weekly Summary",
  monthly_performance: "Monthly Performance",
  incident: "Incident Report",
};

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function InspectorReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let query = supabase
        .from("inspector_reports" as any)
        .select("*")
        .eq("inspector_id", session.user.id)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("report_type", typeFilter);
      }

      const { data } = await query;
      setReports((data as any[]) || []);
      setIsLoading(false);
    }
    load();
  }, [typeFilter]);

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Reports</h1>
            <p className="text-muted-foreground mt-1">View and create compliance reports</p>
          </div>
          <Button asChild>
            <Link to="/inspector/reports/new"><Plus className="mr-2 h-4 w-4" /> New Report</Link>
          </Button>
        </div>

        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="daily_checklist">Daily Checklist</SelectItem>
              <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
              <SelectItem value="monthly_performance">Monthly Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No reports yet. Start by creating your first daily checklist.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = r.status === "draft" ? `/inspector/reports/${r.id}/edit` : `/inspector/reports/${r.id}`}>
                    <TableCell>{format(new Date(r.report_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{REPORT_TYPE_LABELS[r.report_type] || r.report_type}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "submitted" ? "default" : "secondary"}>
                        {r.status === "submitted" ? "Submitted" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.compliance_score != null ? `${r.compliance_score}%` : "—"}</TableCell>
                    <TableCell>
                      {r.risk_level ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColors[r.risk_level] || ""}`}>
                          {r.risk_level.toUpperCase()}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </InspectorLayout>
  );
}
