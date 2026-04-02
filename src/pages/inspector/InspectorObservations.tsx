import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, BookOpen } from "lucide-react";
import { format } from "date-fns";

const TAG_COLORS: Record<string, string> = {
  operational: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  training: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  infrastructure: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  documentation: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function InspectorObservations() {
  const [observations, setObservations] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState("all");
  const [newTag, setNewTag] = useState("");
  const [newObs, setNewObs] = useState("");
  const [newRec, setNewRec] = useState("");
  const [newSite, setNewSite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: obsData } = await (supabase.from("inspector_observations" as any).select("*").eq("created_by", session.user.id).order("created_at", { ascending: false }) as any);
    setObservations((obsData as any[]) || []);

    const { data: siteData } = await (supabase.from("organization_Inspectors" as any).select("*, organizations(name, id)").eq("inspector_id", session.user.id) as any);
    const siteList = (siteData as any[]) || [];
    setSites(siteList);
    if (siteList.length === 1) setNewSite(siteList[0].organization_id);

    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    if (!newSite || !newTag || !newObs.trim()) {
      toast({ variant: "destructive", title: "Incomplete", description: "Tag, site, and observation are required." });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await (supabase.from("inspector_observations" as any).insert({
        organization_id: newSite,
        tag: newTag,
        observation: newObs,
        recommendation: newRec || null,
        created_by: session.user.id,
      } as any) as any);

      if (error) throw error;
      toast({ title: "Observation Saved" });
      setIsDialogOpen(false);
      setNewTag("");
      setNewObs("");
      setNewRec("");
      loadData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = tagFilter === "all" ? observations : observations.filter((o: any) => o.tag === tagFilter);

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Observations</h1>
            <p className="text-muted-foreground mt-1">Structured notes and recommendations</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Observation
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", "operational", "training", "infrastructure", "documentation"].map(tag => (
            <Button key={tag} variant={tagFilter === tag ? "default" : "outline"} size="sm" onClick={() => setTagFilter(tag)}>
              {tag === "all" ? "All" : tag.charAt(0).toUpperCase() + tag.slice(1)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No observations recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((obs: any) => (
              <Card key={obs.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[obs.tag] || ""}`}>{obs.tag}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(obs.created_at), "dd MMM yyyy HH:mm")}</span>
                  </div>
                  <p className="text-sm">{obs.observation}</p>
                  {obs.recommendation && (
                    <p className="text-xs text-muted-foreground mt-2 border-t pt-2"><strong>Recommendation:</strong> {obs.recommendation}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Observation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Company *</Label>
                {sites.length <= 1 ? (
                  <Input value={sites[0]?.organizations?.name || "No company assigned"} disabled className="bg-muted" />
                ) : (
                  <Select value={newSite} onValueChange={setNewSite}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s: any) => <SelectItem key={s.id} value={s.organization_id}>{s.organizations?.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tag *</Label>
                <Select value={newTag} onValueChange={setNewTag}>
                  <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observation *</Label>
                <Textarea value={newObs} onChange={(e) => setNewObs(e.target.value)} rows={3} placeholder="Describe your observation..." />
              </div>
              <div className="space-y-2">
                <Label>Recommendation</Label>
                <Textarea value={newRec} onChange={(e) => setNewRec(e.target.value)} rows={2} placeholder="Any recommended actions..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Observation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </InspectorLayout>
  );
}
