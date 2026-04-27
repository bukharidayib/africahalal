import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const severityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
  critical: "bg-red-200 text-red-900",
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  halal_breach: "Halal Breach",
  cross_contamination: "Cross-Contamination",
  unauthorized_materials: "Unauthorized Materials",
  supplier_deviation: "Supplier Deviation",
  other: "Other",
};

export default function InspectorIncidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoading(false); return; }
      const { data } = await (supabase
        .from("inspector_incidents" as any)
        .select("*")
        .eq("reported_by", session.user.id)
        .order("created_at", { ascending: false }) as any);
      setIncidents((data as any[]) || []);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Incident Reports</h1>
            <p className="text-muted-foreground mt-1">Report and track compliance incidents</p>
          </div>
          <Button asChild>
            <Link to="/inspector/incidents/new"><Plus className="mr-2 h-4 w-4" /> Report Incident</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : incidents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No incidents reported.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((inc: any) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-mono text-xs">{inc.incident_number}</TableCell>
                    <TableCell className="text-sm">{INCIDENT_TYPE_LABELS[inc.incident_type] || inc.incident_type}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[inc.severity] || ""}`}>
                        {inc.severity?.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline">{inc.status}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(inc.created_at), "dd MMM yyyy HH:mm")}</TableCell>
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
