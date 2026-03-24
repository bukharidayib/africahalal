import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Building2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function SupervisorInspectionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [inspection, setInspection] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

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
            organizations (name, city, country)
          )
        `)
        .eq("id", id)
        .maybeSingle();

      setInspection(insp);

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

  const responseIcon = (response: string) => {
    if (response === "compliant") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (response === "non_compliant") return <XCircle className="h-4 w-4 text-red-600" />;
    if (response === "partial") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground">N/A</span>;
  };

  if (isLoading) {
    return <SupervisorLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></SupervisorLayout>;
  }

  if (!inspection) {
    return <SupervisorLayout><div className="text-center py-20"><p className="text-muted-foreground">Inspection not found</p></div></SupervisorLayout>;
  }

  const categories = [...new Set(checklistItems.map(i => i.category))];

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/supervisor/inspections")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Inspection Report</h1>
            <p className="text-muted-foreground">
              {inspection.certification_applications?.organizations?.name} • {format(new Date(inspection.scheduled_date), "dd MMM yyyy")}
            </p>
          </div>
          {report && (
            <div className="text-right">
              <p className="text-2xl font-bold">{report.compliance_score ?? "—"}%</p>
              <Badge variant={report.status === "approved" ? "default" : report.status === "rejected" ? "destructive" : "secondary"}>
                {report.status || "draft"}
              </Badge>
            </div>
          )}
        </div>

        {/* Checklist Results */}
        {categories.map((cat) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">{cat.replace(/_/g, " ")}</CardTitle>
            </CardHeader>
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

        {/* Overall Assessment */}
        {report && (
          <Card>
            <CardHeader><CardTitle>Overall Assessment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {report.overall_assessment && <div><p className="text-sm text-muted-foreground">Assessment</p><p className="text-sm">{report.overall_assessment}</p></div>}
              {report.recommendations && <div><p className="text-sm text-muted-foreground">Recommendations</p><p className="text-sm">{report.recommendations}</p></div>}
              {report.review_notes && <div className="border-t pt-3"><p className="text-sm text-muted-foreground">Manager Review Notes</p><p className="text-sm">{report.review_notes}</p></div>}
            </CardContent>
          </Card>
        )}
      </div>
    </SupervisorLayout>
  );
}
