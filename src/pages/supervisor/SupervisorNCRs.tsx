import React, { useEffect, useState } from "react";
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

const statusVariant = (s: string): any => {
  if (s === "open") return "destructive";
  if (s === "closed") return "default";
  return "secondary";
};

export default function SupervisorNCRs() {
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("non_conformance_notices")
        .select(`
          id, ncn_number, category, severity, status, due_date, issued_at, source,
          certification_applications ( application_number, organizations ( name ) )
        `)
        .order("issued_at", { ascending: false });
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
          <p className="text-muted-foreground mt-1">
            Non-Conformance Reports you raised, or linked to inspections you supervise.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : ncrs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertOctagon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No NCRs visible. Raise one from a supervisor inspection report when major non-compliance is detected.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCN #</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncrs.map((ncr: any) => (
                  <TableRow key={ncr.id} className="cursor-pointer hover:bg-muted/50">
                    <Link to={`/supervisor/ncrs/${ncr.id}`} className="contents">
                      <TableCell className="font-mono text-xs">{ncr.ncn_number}</TableCell>
                      <TableCell className="text-sm">{ncr.certification_applications?.organizations?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{ncr.category}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[ncr.severity] || ""}`}>
                          {ncr.severity?.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(ncr.status)}>
                          {ncr.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ncr.due_date ? format(new Date(ncr.due_date), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{ncr.source || "admin"}</Badge></TableCell>
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
