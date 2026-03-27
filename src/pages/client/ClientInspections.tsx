import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

interface InspectionRow {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  certification_applications: {
    application_number: string;
    scope: string;
    organizations: { name: string } | null;
  } | null;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function ClientInspections() {
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("inspections")
        .select("id, scheduled_date, scheduled_time, status, notes, certification_applications(application_number, scope, organizations(name))")
        .order("scheduled_date", { ascending: false });
      setInspections((data as any) || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Scheduled Inspections</h1>
          <p className="text-muted-foreground">View upcoming and past inspections for your organization.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Inspections Scheduled</h3>
              <p className="text-sm text-muted-foreground mt-1">Once your application is approved for inspection, it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {inspections.map((insp) => (
              <Card key={insp.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      {insp.certification_applications?.application_number || "—"}
                    </CardTitle>
                    <Badge className={statusColors[insp.status] || ""}>{insp.status.replace("_", " ")}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{insp.certification_applications?.organizations?.name} — {insp.certification_applications?.scope}</p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(insp.scheduled_date), "PPP")}
                    </span>
                    {insp.scheduled_time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {insp.scheduled_time}
                      </span>
                    )}
                  </div>
                  {insp.notes && <p className="text-muted-foreground italic">{insp.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
