import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Search, ClipboardList, Building2, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function InspectorInspections() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: inspector } = await supabase
        .from("inspectors")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!inspector) { setIsLoading(false); return; }

      let query = supabase
        .from("inspections")
        .select(`
          *,
          certification_applications (
            application_number,
            scope,
            organizations (name, city, country)
          )
        `)
        .eq("inspector_id", inspector.id)
        .order("scheduled_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data } = await query;
      const rows = data || [];

      if (rows.length > 0) {
        const ids = rows.map((r: any) => r.id);
        const { data: reports } = await supabase
          .from("inspection_reports")
          .select("inspection_id, status, compliance_score")
          .in("inspection_id", ids);
        const map = new Map((reports || []).map((r: any) => [r.inspection_id, r]));
        rows.forEach((r: any) => { r.report = map.get(r.id) || null; });
      }

      setInspections(rows);
      setIsLoading(false);
    }
    load();
  }, [statusFilter]);

  const filtered = inspections.filter((insp) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      insp.certification_applications?.application_number?.toLowerCase().includes(s) ||
      insp.certification_applications?.organizations?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">My Inspections</h1>
          <p className="text-muted-foreground">View and manage your assigned inspections</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by organization or application..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{filtered.length} Inspection{filtered.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No inspections found</h3>
                <p className="text-sm">Inspections assigned to you will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Report Review</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((insp) => {
                    const status = statusConfig[insp.status] || statusConfig.scheduled;
                    const reportStatus = insp.report?.status as string | undefined;
                    const reportBadge: Record<string, { label: string; cls: string }> = {
                      submitted: { label: "Awaiting Review", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
                      approved: { label: "Approved", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
                      rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
                      conditional: { label: "Conditional", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
                      draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
                    };
                    const rb = reportStatus ? reportBadge[reportStatus] : null;
                    return (
                      <TableRow key={insp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{insp.certification_applications?.organizations?.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">
                                {[insp.certification_applications?.organizations?.city, insp.certification_applications?.organizations?.country].filter(Boolean).join(", ")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{insp.certification_applications?.application_number || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(insp.scheduled_date), "dd MMM yyyy")}
                            {insp.scheduled_time && <span className="text-muted-foreground">@ {insp.scheduled_time}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {rb ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rb.cls}`}>{rb.label}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/inspector/inspections/${insp.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </InspectorLayout>
  );
}
