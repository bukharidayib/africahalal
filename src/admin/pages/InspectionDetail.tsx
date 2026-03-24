import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Building2, CheckCircle2, XCircle, AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [inspection, setInspection] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [inspectorProfile, setInspectorProfile] = useState<any>(null);

  // Review dialog
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | "conditional" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data: insp } = await supabase
        .from("inspections")
        .select(`
          *,
          certification_applications (
            application_number,
            scope,
            sector,
            organizations (name, address, city, country, contact_name, contact_email)
          ),
          inspectors (
            inspector_number,
            user_id
          )
        `)
        .eq("id", id)
        .maybeSingle();

      setInspection(insp);

      if (insp?.inspectors?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", insp.inspectors.user_id)
          .maybeSingle();
        setInspectorProfile(profile);
      }

      const { data: rep } = await supabase
        .from("inspection_reports")
        .select("*")
        .eq("inspection_id", id)
        .maybeSingle();
      setReport(rep);

      const { data: items } = await supabase
        .from("inspection_checklist_items" as any)
        .select("*")
        .eq("inspection_id", id)
        .order("sort_order", { ascending: true });
      setChecklistItems((items as any[]) || []);

      setIsLoading(false);
    }
    load();
  }, [id]);

  async function handleReview() {
    if (!reviewAction || !report) return;
    setIsReviewing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      await supabase
        .from("inspection_reports")
        .update({
          status: reviewAction,
          reviewed_by: session?.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
        } as any)
        .eq("id", report.id);

      await supabase.rpc("log_audit", {
        _action: `inspection_report_${reviewAction}`,
        _resource_type: "inspection_reports",
        _resource_id: report.id,
        _metadata: { inspection_id: id, review_notes: reviewNotes },
      });

      toast.success(`Report ${reviewAction} successfully`);
      setReviewAction(null);
      setReport({ ...report, status: reviewAction, review_notes: reviewNotes });
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setIsReviewing(false);
    }
  }

  const responseIcon = (response: string) => {
    if (response === "compliant") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (response === "non_compliant") return <XCircle className="h-4 w-4 text-red-600" />;
    if (response === "partial") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground">N/A</span>;
  };

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  if (!inspection) {
    return <AdminLayout><div className="text-center py-20"><p>Inspection not found</p></div></AdminLayout>;
  }

  const org = inspection.certification_applications?.organizations;
  const categories = [...new Set(checklistItems.map(i => i.category))];
  const canReview = report && report.status === "submitted";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/inspections")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inspections
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Inspection Detail</h1>
            <p className="text-muted-foreground">
              {org?.name} • {inspection.certification_applications?.application_number}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {report && (
              <Badge variant={
                report.status === "approved" ? "default" :
                report.status === "rejected" ? "destructive" :
                "secondary"
              } className="text-sm px-3 py-1">
                {report.status?.toUpperCase() || "DRAFT"}
              </Badge>
            )}
            {canReview && (
              <div className="flex gap-2">
                <Button variant="default" onClick={() => setReviewAction("approved")}>
                  <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => setReviewAction("rejected")}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button variant="outline" onClick={() => setReviewAction("conditional")}>
                  Conditional
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checklist">Inspector Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Organization Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Organization:</span> <p className="font-medium">{org?.name}</p></div>
                  <div><span className="text-muted-foreground">Location:</span> <p className="font-medium">{[org?.city, org?.country].filter(Boolean).join(", ")}</p></div>
                  <div><span className="text-muted-foreground">Contact:</span> <p className="font-medium">{org?.contact_name} • {org?.contact_email}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Inspection Info</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Inspector:</span> <p className="font-medium">{inspectorProfile?.full_name || "Unknown"} ({inspection.inspectors?.inspector_number})</p></div>
                  <div><span className="text-muted-foreground">Scheduled:</span> <p className="font-medium">{format(new Date(inspection.scheduled_date), "PPP")}</p></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{inspection.status}</Badge></div>
                  {inspection.started_at && <div><span className="text-muted-foreground">Started:</span> <p className="font-medium">{format(new Date(inspection.started_at), "PPpp")}</p></div>}
                  {inspection.completed_at && <div><span className="text-muted-foreground">Completed:</span> <p className="font-medium">{format(new Date(inspection.completed_at), "PPpp")}</p></div>}
                  {report?.compliance_score != null && <div><span className="text-muted-foreground">Compliance Score:</span> <p className="text-2xl font-bold">{report.compliance_score}%</p></div>}
                </div>
              </CardContent>
            </Card>

            {report && (
              <Card>
                <CardHeader><CardTitle>Assessment</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {report.overall_assessment && <div><p className="text-sm text-muted-foreground">Overall Assessment</p><p className="text-sm">{report.overall_assessment}</p></div>}
                  {report.recommendations && <div><p className="text-sm text-muted-foreground">Recommendations</p><p className="text-sm">{report.recommendations}</p></div>}
                  {report.review_notes && <div className="border-t pt-3"><p className="text-sm text-muted-foreground">Review Notes</p><p className="text-sm">{report.review_notes}</p></div>}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4">
            {categories.length === 0 ? (
              <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground py-8">No checklist data available</p></CardContent></Card>
            ) : categories.map((cat) => (
              <Card key={cat}>
                <CardHeader><CardTitle className="capitalize">{cat.replace(/_/g, " ")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {checklistItems.filter(i => i.category === cat).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                        {responseIcon(item.response)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.item_description}</p>
                          {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{item.response?.replace(/_/g, " ") || "—"}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewAction} onOpenChange={(open) => !open && setReviewAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approved" ? "Approve" : reviewAction === "rejected" ? "Reject" : "Conditional Approval"} Report
            </DialogTitle>
            <DialogDescription>
              Provide notes for this decision. This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Review Notes *</Label>
              <Textarea
                placeholder="Enter your review notes..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>Cancel</Button>
            <Button
              onClick={handleReview}
              disabled={isReviewing || !reviewNotes.trim()}
              variant={reviewAction === "rejected" ? "destructive" : "default"}
            >
              {isReviewing ? "Processing..." : `Confirm ${reviewAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
