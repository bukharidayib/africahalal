import { useState, useEffect } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Send, Upload } from "lucide-react";

export default function SupervisorIncidentForm() {
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await (supabase.from("supervisor_sites" as any).select("*, organizations(name)").eq("supervisor_id", session.user.id).eq("is_active", true) as any);
      const siteList = (data as any[]) || [];
      setSites(siteList);
      if (siteList.length === 1) setSelectedSite(siteList[0].id);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleEvidenceUpload = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setIsUploading(true);
    const path = `${session.user.id}/incidents/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("supervisor-evidence").upload(path, file);
    if (error) { toast({ variant: "destructive", title: "Upload Failed", description: error.message }); }
    else { setEvidenceUrls(prev => [...prev, path]); toast({ title: "Evidence Uploaded" }); }
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (!selectedSite || !incidentType || !description.trim()) {
      toast({ variant: "destructive", title: "Incomplete", description: "Please fill in all required fields." });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Generate incident number
      const { data: incNum } = await supabase.rpc("generate_supervisor_incident_number" as any);

      const { error } = await (supabase.from("supervisor_incidents" as any).insert({
        incident_number: incNum,
        site_id: selectedSite,
        incident_type: incidentType,
        severity,
        description,
        immediate_action_taken: immediateAction || null,
        evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : null,
        reported_by: session.user.id,
      } as any) as any);

      if (error) throw error;

      // Log activity
      await supabase.rpc("log_supervisor_activity" as any, {
        _supervisor_id: session.user.id,
        _action: "incident_reported",
        _resource_type: "supervisor_incidents",
        _metadata: { incident_type: incidentType, severity },
      } as any);

      toast({ title: "Incident Reported", description: `Incident ${incNum} has been filed.` });
      navigate("/supervisor/incidents");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <SupervisorLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></SupervisorLayout>;

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold font-serif">Report Incident</h1>
          <p className="text-muted-foreground mt-1">Report an immediate compliance or safety incident</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company *</Label>
                {sites.length <= 1 ? (
                  <Input value={sites[0]?.organizations?.name || sites[0]?.site_name || "No company assigned"} disabled className="bg-muted" />
                ) : (
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.organizations?.name || s.site_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Incident Type *</Label>
                <Select value={incidentType} onValueChange={setIncidentType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="halal_breach">Halal Breach</SelectItem>
                    <SelectItem value="cross_contamination">Cross-Contamination</SelectItem>
                    <SelectItem value="unauthorized_materials">Unauthorized Materials</SelectItem>
                    <SelectItem value="supplier_deviation">Supplier Deviation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the incident in detail..." />
            </div>

            <div className="space-y-2">
              <Label>Immediate Action Taken</Label>
              <Textarea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} rows={3} placeholder="Describe any immediate actions taken..." />
            </div>

            <div className="space-y-2">
              <Label>Evidence</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEvidenceUpload(f); }} />
                  <div className="flex items-center gap-1 text-sm text-primary hover:underline border border-dashed border-primary/30 rounded-lg px-4 py-2">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Evidence
                  </div>
                </label>
                {evidenceUrls.length > 0 && <span className="text-xs text-muted-foreground">{evidenceUrls.length} file(s) uploaded</span>}
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Incident Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
