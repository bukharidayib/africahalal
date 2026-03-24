import { useEffect, useState } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, ClipboardList, Building2, Calendar, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function SupervisorInspections() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get inspections where this user is supervisor
      const { data } = await supabase
        .from("inspections")
        .select(`
          *,
          certification_applications (
            application_number,
            organizations (name)
          ),
          inspectors (
            inspector_number
          )
        `)
        .eq("supervisor_id", session.user.id)
        .order("scheduled_date", { ascending: false });

      setInspections(data || []);
      setIsLoading(false);
    }
    load();
  }, []);

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    scheduled: "outline",
    in_progress: "default",
    completed: "secondary",
    cancelled: "destructive",
  };

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Assigned Inspections</h1>
          <p className="text-muted-foreground">View inspections assigned to your site</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{inspections.length} Inspection{inspections.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No inspections found</h3>
                <p className="text-sm">Inspections assigned to your site will appear here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((insp) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-medium">
                        {insp.certification_applications?.organizations?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {insp.certification_applications?.application_number}
                      </TableCell>
                      <TableCell>{insp.inspectors?.inspector_number || "N/A"}</TableCell>
                      <TableCell>{format(new Date(insp.scheduled_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[insp.status] || "outline"}>
                          {insp.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {insp.status === "completed" && (
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/supervisor/inspections/${insp.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
