import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, Bell, Building2, Calendar, Clock, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function InspectorNotifications() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoading(false); return; }

      const { data: inspector } = await supabase
        .from("inspectors")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!inspector) { setIsLoading(false); return; }

      const { data } = await supabase
        .from("inspections")
        .select(`
          id, scheduled_date, scheduled_time, status, assigned_at,
          certification_applications (
            application_number,
            organizations (name, city, country)
          )
        `)
        .eq("inspector_id", inspector.id)
        .order("assigned_at", { ascending: false })
        .limit(50);

      setInspections((data as any[]) || []);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Notifications</h1>
          <p className="text-muted-foreground">Inspections assigned to you</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No assigned inspections yet</h3>
                <p className="text-sm">When an inspection is assigned to you, it will appear here.</p>
              </div>
            ) : (
              <div className="divide-y">
                {inspections.map((insp: any) => {
                  const status = statusConfig[insp.status] || statusConfig.scheduled;
                  const orgName = insp.certification_applications?.organizations?.name || "Unknown organization";
                  const appNum = insp.certification_applications?.application_number || "N/A";
                  return (
                    <div
                      key={insp.id}
                      className="flex items-start gap-4 py-4 cursor-pointer hover:bg-muted/30 transition-colors px-2 rounded"
                      onClick={() => navigate(`/inspector/inspections/${insp.id}`)}
                    >
                      <div className="mt-1 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{orgName}</p>
                          <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{appNum}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(insp.scheduled_date), "dd MMM yyyy")}
                            {insp.scheduled_time && ` @ ${insp.scheduled_time}`}
                          </span>
                          {insp.assigned_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Assigned {formatDistanceToNow(new Date(insp.assigned_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InspectorLayout>
  );
}
