import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Upload } from "lucide-react";
import { format } from "date-fns";

const STATUS_STEPS = ["open", "corrective_action_submitted", "under_review", "closed"];

export default function InspectorNCRDetail() {
  const { id } = useParams();
  const [ncr, setNcr] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const { data } = await (supabase.from("inspector_ncrs" as any).select("*").eq("id", id).single() as any);
      setNcr(data);
      if ((data as any)?.corrective_action) setCorrectiveAction((data as any).corrective_action);
      setIsLoading(false);
    }
    if (id) load();
  }, [id]);

  const handleSubmitCorrectiveAction = async () => {
    if (!correctiveAction.trim()) { toast({ variant: "destructive", title: "Error", description: "Please enter a corrective action." }); return; }
    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from("inspector_ncrs" as any)
        .update({ corrective_action: correctiveAction, status: "corrective_action_submitted" } as any)
        .eq("id", id) as any);
      if (error) throw error;
      toast({ title: "Submitted", description: "Corrective action submitted for review." });
      setNcr((prev: any) => ({ ...prev, status: "corrective_action_submitted", corrective_action: correctiveAction }));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <InspectorLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></InspectorLayout>;
  if (!ncr) return <InspectorLayout><p className="text-center py-20 text-muted-foreground">NCR not found.</p></InspectorLayout>;

  const currentStep = STATUS_STEPS.indexOf(ncr.status);

  return (
    <InspectorLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">{ncr.ncr_number}</h1>
            <p className="text-muted-foreground mt-1">{ncr.category}</p>
          </div>
          <Badge variant={ncr.status === "escalated" ? "destructive" : "default"}>
            {ncr.status?.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, idx) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center ${idx <= currentStep ? "text-primary" : "text-muted-foreground/40"}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${idx <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {idx + 1}
                    </div>
                    <span className="text-[10px] mt-1 text-center max-w-[80px]">{step.replace(/_/g, " ")}</span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${idx < currentStep ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Severity:</span> <span className="font-semibold ml-1">{ncr.severity?.toUpperCase()}</span></div>
              <div><span className="text-muted-foreground">Raised:</span> <span className="ml-1">{format(new Date(ncr.raised_at), "dd MMM yyyy")}</span></div>
              {ncr.due_date && <div><span className="text-muted-foreground">Due:</span> <span className="ml-1">{format(new Date(ncr.due_date), "dd MMM yyyy")}</span></div>}
            </div>
            <p className="text-sm mt-2">{ncr.description}</p>
          </CardContent>
        </Card>

        {/* Corrective Action */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Corrective Action</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ncr.status === "open" ? (
              <>
                <Label>Describe the corrective action taken</Label>
                <Textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={4} placeholder="Detail the steps taken to address this non-conformance..." />
                <Button onClick={handleSubmitCorrectiveAction} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit Corrective Action
                </Button>
              </>
            ) : (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">{ncr.corrective_action || "No corrective action submitted."}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InspectorLayout>
  );
}
