import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, ClipboardList, CheckCircle2, Clock, Play, Calendar, Building2 } from "lucide-react";
import { format, addDays, isAfter } from "date-fns";

export default function InspectorDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ scheduled: 0, in_progress: 0, completed: 0, total: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [inspectorName, setInspectorName] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get inspector record
      const { data: inspector } = await supabase
        .from("inspectors")
        .select("id, inspector_number")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!inspector) { setIsLoading(false); return; }

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .maybeSingle();
      setInspectorName(profile?.full_name || "Inspector");

      // Fetch all inspections for this inspector
      const { data: inspections } = await supabase
        .from("inspections")
        .select(`
          *,
          certification_applications (
            application_number,
            organizations (name)
          )
        `)
        .eq("inspector_id", inspector.id)
        .order("scheduled_date", { ascending: true });

      const all = inspections || [];
      setStats({
        scheduled: all.filter(i => i.status === "scheduled").length,
        in_progress: all.filter(i => i.status === "in_progress").length,
        completed: all.filter(i => i.status === "completed").length,
        total: all.length,
      });

      // Upcoming inspections (next 7 days, scheduled or in_progress)
      const nextWeek = addDays(new Date(), 7);
      const upcomingList = all
        .filter(i => ["scheduled", "in_progress"].includes(i.status))
        .slice(0, 5);
      setUpcoming(upcomingList);

      setIsLoading(false);
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <InspectorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </InspectorLayout>
    );
  }

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Inspector Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {inspectorName}.</p>
          </div>
          <Button asChild>
            <Link to="/inspector/inspections">
              <ClipboardList className="mr-2 h-4 w-4" /> View All Inspections
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.in_progress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Inspections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming inspections</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((insp) => (
                  <Link
                    key={insp.id}
                    to={`/inspector/inspections/${insp.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {insp.certification_applications?.organizations?.name || "Unknown Organization"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {insp.certification_applications?.application_number} • {format(new Date(insp.scheduled_date), "dd MMM yyyy")}
                          {insp.scheduled_time && ` @ ${insp.scheduled_time}`}
                        </span>
                      </div>
                    </div>
                    <Badge variant={insp.status === "in_progress" ? "default" : "outline"}>
                      {insp.status === "in_progress" ? "In Progress" : "Scheduled"}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild variant="outline" className="h-16 justify-start">
            <Link to="/inspector/inspections"><ClipboardList className="mr-3 h-5 w-5" /> All Inspections</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 justify-start">
            <Link to="/inspector/notifications"><Clock className="mr-3 h-5 w-5" /> Notifications</Link>
          </Button>
        </div>
      </div>
    </InspectorLayout>
  );
}
