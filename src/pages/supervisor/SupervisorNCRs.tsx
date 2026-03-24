import { useEffect, useState } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, AlertOctagon } from "lucide-react";
import { format } from "date-fns";

const severityColors: Record<string, string> = {
  minor: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  major: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  critical: "bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  open: "secondary",
  corrective_action_submitted: "outline",
  under_review: "default",
  closed: "default",
  escalated: "destructive",
};

export default function SupervisorNCRs() {
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await (supabase.from("supervisor_ncrs" as any).select("*").order("created_at", { ascending: false }) as any);
      setNcrs((data as any[]) || []);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">NCR Management</h1>
          <p className="text-muted-foreground mt-1">Non-Conformance Reports from your site inspections</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : ncrs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertOctagon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No NCRs recorded. NCRs are automatically created when major non-compliance is detected in reports.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCR #</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncrs.map((ncr: any) => (
                  <TableRow key={ncr.id} className="cursor-pointer hover:bg-muted/50">
                    <Link to={`/supervisor/ncrs/${ncr.id}`} className="contents">
                      <TableCell className="font-mono text-xs">{ncr.ncr_number}</TableCell>
                      <TableCell className="text-sm">{ncr.category}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[ncr.severity] || ""}`}>
                          {ncr.severity?.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(statusColors[ncr.status] as any) || "outline"}>
                          {ncr.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ncr.due_date ? format(new Date(ncr.due_date), "dd MMM yyyy") : "—"}
                      </TableCell>
                    </Link>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </SupervisorLayout>
  );
}
