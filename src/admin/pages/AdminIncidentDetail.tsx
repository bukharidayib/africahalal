import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";

const severityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminIncidentDetail() {
  const { source, id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incident, setIncident] = useState<any>(null);
  const [reporterName, setReporterName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const tableName = source === "supervisor" ? "supervisor_incidents" : "inspector_incidents";
  const sourceLabel = source === "supervisor" ? "Supervisor" : "Inspector";

  useEffect(() => {
    async function load() {
      const { data } = await (supabase.from(tableName as any).select("*").eq("id", id).maybeSingle() as any);
      setIncident(data);
      if (data) {
        const [profileRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", (data as any).reported_by).maybeSingle(),
        ]);
        setReporterName(profileRes.data?.full_name || "Unknown");

        if (source === "supervisor" && (data as any).site_id) {
          const { data: site } = await (supabase.from("supervisor_sites" as any).select("organization_id, site_name").eq("id", (data as any).site_id).maybeSingle() as any);
          const orgId = (site as any)?.organization_id;
          if (orgId) {
            const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
            setOrgName(org?.name || (site as any)?.site_name || "Unknown");
          } else {
            setOrgName((site as any)?.site_name || "Unknown");
          }
        } else if ((data as any).organization_id) {
          const { data: org } = await supabase.from("organizations").select("name").eq("id", (data as any).organization_id).maybeSingle();
          setOrgName(org?.name || "Unknown");
        }
      }
      setIsLoading(false);
    }
    if (id) load();
  }, [id, source, tableName]);

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await (supabase.from(tableName as any).update({ status: newStatus } as any).eq("id", id) as any);
      if (error) throw error;
      setIncident({ ...incident, status: newStatus });
      toast({ title: "Status updated", description: `Incident marked as ${newStatus}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }
  if (!incident) {
    return <AdminLayout><p className="text-muted-foreground text-center py-20">Incident not found.</p></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/reports")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-600" /> Incident {incident.incident_number}
            </h2>
            <p className="text-muted-foreground">
              Reported by <span className="font-medium text-foreground">{reporterName}</span> ({sourceLabel}) — {orgName} — {format(new Date(incident.created_at), "dd MMM yyyy HH:mm")}
            </p>
          </div>
          <Badge variant="outline">{incident.status}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center"><span className={`text-sm font-bold px-3 py-1 rounded-full ${severityColors[incident.severity] || ""}`}>{incident.severity?.toUpperCase()}</span><p className="text-xs text-muted-foreground mt-2">Severity</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-base font-semibold capitalize">{(incident.incident_type || "").replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground mt-1">Type</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-base font-semibold capitalize">{incident.status}</p><p className="text-xs text-muted-foreground mt-1">Status</p></CardContent></Card>
          <Card><CardContent className="pt-4"><Select value={incident.status} onValueChange={updateStatus} disabled={isUpdating}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select><p className="text-xs text-muted-foreground mt-1 text-center">Update status</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{incident.description}</p></CardContent>
        </Card>

        {incident.immediate_action_taken && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Immediate Action Taken</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{incident.immediate_action_taken}</p></CardContent>
          </Card>
        )}

        {incident.evidence_urls?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Evidence</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-4 w-4" /> {incident.evidence_urls.length} file(s) attached
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
