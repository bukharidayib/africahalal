import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_STEPS = ["open", "corrective_action_submitted", "under_review", "closed"];

export default function SupervisorNCRDetail() {
  const { id } = useParams();
  const [ncr, setNcr] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: ncnData } = await supabase
        .from("non_conformance_notices")
        .select(`*, certification_applications ( application_number, organizations ( name ) )`)
        .eq("id", id)
        .maybeSingle();
      setNcr(ncnData);

      const { data: caData } = await supabase
        .from("corrective_actions")
        .select("*")
        .eq("ncn_id", id)
        .order("submitted_at", { ascending: false });
      setActions((caData as any[]) || []);
      setIsLoading(false);
    }
    if (id) load();
  }, [id]);

  if (isLoading) return <SupervisorLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></SupervisorLayout>;
  if (!ncr) return <SupervisorLayout><p className="text-center py-20 text-muted-foreground">NCR not found.</p></SupervisorLayout>;

  // Derive timeline step from NCN status + corrective action state
  let derivedStatus = ncr.status;
  if (actions.length > 0) {
    const latest = actions[0];
    if (latest.status === "accepted") derivedStatus = "closed";
    else if (latest.status === "under_review") derivedStatus = "under_review";
    else derivedStatus = "corrective_action_submitted";
  }
  const currentStep = Math.max(STATUS_STEPS.indexOf(derivedStatus), 0);

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">{ncr.ncn_number}</h1>
            <p className="text-muted-foreground mt-1">{ncr.category}</p>
          </div>
          <Badge variant={derivedStatus === "closed" ? "default" : derivedStatus === "open" ? "destructive" : "secondary"}>
            {derivedStatus?.replace(/_/g, " ")}
          </Badge>
        </div>

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
              <div><span className="text-muted-foreground">Organization:</span> <span className="ml-1">{ncr.certification_applications?.organizations?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Severity:</span> <span className="font-semibold ml-1">{ncr.severity?.toUpperCase()}</span></div>
              <div><span className="text-muted-foreground">Issued:</span> <span className="ml-1">{format(new Date(ncr.issued_at), "dd MMM yyyy")}</span></div>
              {ncr.due_date && <div><span className="text-muted-foreground">Due:</span> <span className="ml-1">{format(new Date(ncr.due_date), "dd MMM yyyy")}</span></div>}
              <div><span className="text-muted-foreground">Source:</span> <Badge variant="outline" className="ml-1 capitalize">{ncr.source || "admin"}</Badge></div>
            </div>
            <p className="text-sm mt-2">{ncr.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Client Corrective Action</CardTitle></CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No corrective action submitted by the client yet.</p>
            ) : (
              <div className="space-y-4">
                {actions.map((a) => (
                  <div key={a.id} className="border rounded-md p-3 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={a.status === "accepted" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(a.submitted_at), "dd MMM yyyy HH:mm")}</span>
                    </div>
                    <p className="text-sm">{a.response}</p>
                    {a.review_notes && <p className="text-xs text-muted-foreground border-t pt-2"><span className="font-semibold">Officer notes:</span> {a.review_notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
