import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Send, Save, Building2, Calendar, ArrowLeft, Upload, CheckCircle2, ThumbsUp, ThumbsDown, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const CHECKLIST_CATEGORIES = [
  {
    key: "hygiene_compliance",
    label: "Hygiene Compliance",
    items: [
      "Premises cleanliness and sanitation standards",
      "Personal hygiene of staff (handwashing, protective gear)",
      "Pest control measures in place",
      "Waste management and disposal procedures",
      "Water quality and supply standards",
    ],
  },
  {
    key: "ingredient_sourcing",
    label: "Ingredient Sourcing",
    items: [
      "All ingredients have valid Halal certificates",
      "Supplier documentation is up to date",
      "No cross-contamination risk from non-Halal ingredients",
      "Traceability records available for all raw materials",
      "Alcohol-based ingredients properly documented",
    ],
  },
  {
    key: "storage_processes",
    label: "Storage & Processing",
    items: [
      "Halal and non-Halal products stored separately",
      "Temperature control measures in place",
      "FIFO (First In, First Out) system followed",
      "Equipment cleanliness between Halal/non-Halal runs",
      "Proper labeling of stored ingredients",
    ],
  },
  {
    key: "slaughter_compliance",
    label: "Slaughter Compliance",
    items: [
      "Slaughter performed by trained Muslim slaughterer",
      "Correct Islamic invocation (Tasmiyyah/Takbir) recited",
      "Proper slaughter method and animal handling",
      "Stunning procedures compliant with Halal standards",
      "Post-slaughter inspection procedures followed",
    ],
  },
  {
    key: "staff_practices",
    label: "Staff Practices",
    items: [
      "Staff trained on Halal compliance requirements",
      "Training records available and up to date",
      "Halal awareness displayed in work areas",
      "Proper segregation of duties maintained",
      "Incident reporting procedures understood by staff",
    ],
  },
];

interface ChecklistItem {
  id?: string;
  category: string;
  item_description: string;
  response: string | null;
  notes: string;
  sort_order: number;
}

export default function InspectorInspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [inspection, setInspection] = useState<any>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [overallNotes, setOverallNotes] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CHECKLIST_CATEGORIES[0].key);
  const [reportInfo, setReportInfo] = useState<any>(null);

  useEffect(() => {
    loadInspection();
  }, [id]);

  async function loadInspection() {
    if (!id) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: insp } = await supabase
      .from("inspections")
      .select(`
        *,
        certification_applications (
          application_number,
          scope,
          sector,
          organizations (name, address, city, country, contact_name, contact_email, contact_phone)
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (!insp) { setIsLoading(false); return; }
    setInspection(insp);

    // Load existing checklist items
    const { data: existingItems } = await supabase
      .from("inspection_checklist_items" as any)
      .select("*")
      .eq("inspection_id", id)
      .order("sort_order", { ascending: true });

    if (existingItems && (existingItems as any[]).length > 0) {
      setChecklist((existingItems as any[]).map((item: any) => ({
        id: item.id,
        category: item.category,
        item_description: item.item_description,
        response: item.response,
        notes: item.notes || "",
        sort_order: item.sort_order,
      })));
    } else {
      // Initialize from template
      const items: ChecklistItem[] = [];
      let order = 0;
      for (const cat of CHECKLIST_CATEGORIES) {
        for (const desc of cat.items) {
          items.push({
            category: cat.key,
            item_description: desc,
            response: null,
            notes: "",
            sort_order: order++,
          });
        }
      }
      setChecklist(items);
    }

    // Load existing report
    const { data: report } = await supabase
      .from("inspection_reports")
      .select("*")
      .eq("inspection_id", id)
      .maybeSingle();

    if (report) {
      setOverallNotes(report.overall_assessment || "");
      setRecommendations(report.recommendations || "");
      setReportInfo(report);
    }

    setIsLoading(false);
  }

  async function handleStartInspection() {
    if (!id) return;
    const { error } = await supabase
      .from("inspections")
      .update({ status: "in_progress" as any, started_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) { toast.error("Failed to start inspection"); return; }
    toast.success("Inspection started");
    setInspection({ ...inspection, status: "in_progress", started_at: new Date().toISOString() });
  }

  function updateChecklistItem(index: number, field: string, value: string) {
    const updated = [...checklist];
    (updated[index] as any)[field] = value;
    setChecklist(updated);
  }

  async function handleSaveDraft() {
    if (!id) return;
    setIsSaving(true);
    try {
      // Upsert checklist items
      for (const item of checklist) {
        if (item.id) {
          await supabase
            .from("inspection_checklist_items" as any)
            .update({ response: item.response, notes: item.notes } as any)
            .eq("id", item.id);
        } else {
          const { data } = await supabase
            .from("inspection_checklist_items" as any)
            .insert({
              inspection_id: id,
              category: item.category,
              item_description: item.item_description,
              response: item.response,
              notes: item.notes,
              sort_order: item.sort_order,
            } as any)
            .select()
            .single();
          if (data) item.id = (data as any).id;
        }
      }

      // Upsert report
      const { data: existingReport } = await supabase
        .from("inspection_reports")
        .select("id")
        .eq("inspection_id", id)
        .maybeSingle();

      if (existingReport) {
        await supabase
          .from("inspection_reports")
          .update({
            overall_assessment: overallNotes,
            recommendations,
          } as any)
          .eq("id", existingReport.id);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase
          .from("inspection_reports")
          .insert({
            inspection_id: id,
            overall_assessment: overallNotes,
            recommendations,
            findings: {},
            inspector_attestation: false,
          } as any);
      }

      toast.success("Draft saved successfully");
    } catch (err) {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitReport() {
    // Validate all items have responses
    const unanswered = checklist.filter(i => !i.response);
    if (unanswered.length > 0) {
      toast.error(`Please respond to all checklist items. ${unanswered.length} items remaining.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Save draft first
      await handleSaveDraft();

      // Calculate compliance score
      const scored = checklist.filter(i => i.response !== "not_applicable");
      const score = scored.length > 0
        ? scored.reduce((sum, i) => {
            if (i.response === "compliant") return sum + 100;
            if (i.response === "partial") return sum + 50;
            return sum;
          }, 0) / scored.length
        : 0;

      // Update report
      const { data: report } = await supabase
        .from("inspection_reports")
        .select("id")
        .eq("inspection_id", id)
        .maybeSingle();

      if (report) {
        await supabase
          .from("inspection_reports")
          .update({
            submitted_at: new Date().toISOString(),
            inspector_attestation: true,
            attestation_timestamp: new Date().toISOString(),
            compliance_score: Math.round(score * 10) / 10,
            status: "submitted",
            findings: {
              categories: CHECKLIST_CATEGORIES.map(cat => ({
                key: cat.key,
                label: cat.label,
                items: checklist.filter(i => i.category === cat.key).map(i => ({
                  description: i.item_description,
                  response: i.response,
                  notes: i.notes,
                })),
              })),
            },
          } as any)
          .eq("id", report.id);
      }

      // Update inspection status
      await supabase
        .from("inspections")
        .update({ status: "completed" as any, completed_at: new Date().toISOString() })
        .eq("id", id!);

      toast.success("Inspection report submitted successfully!");
      navigate("/inspector/inspections");
    } catch (err) {
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  }

  const completedItems = checklist.filter(i => i.response).length;
  const progress = checklist.length > 0 ? (completedItems / checklist.length) * 100 : 0;
  const categoryItems = checklist.filter(i => i.category === activeCategory);
  const isReadOnly = inspection?.status === "completed" || inspection?.status === "cancelled";

  if (isLoading) {
    return (
      <InspectorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </InspectorLayout>
    );
  }

  if (!inspection) {
    return (
      <InspectorLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Inspection not found</p>
          <Button asChild className="mt-4"><a href="/inspector/inspections">Back to Inspections</a></Button>
        </div>
      </InspectorLayout>
    );
  }

  const org = inspection.certification_applications?.organizations;

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/inspector/inspections")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inspections
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">{org?.name || "Inspection"}</h1>
            <p className="text-muted-foreground">
              {inspection.certification_applications?.application_number} • {format(new Date(inspection.scheduled_date), "dd MMM yyyy")}
            </p>
          </div>
          <Badge variant={inspection.status === "completed" ? "secondary" : inspection.status === "in_progress" ? "default" : "outline"}>
            {inspection.status === "in_progress" ? "In Progress" : inspection.status === "completed" ? "Completed" : "Scheduled"}
          </Badge>
        </div>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" /> Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Organization:</span> <p className="font-medium">{org?.name}</p></div>
              <div><span className="text-muted-foreground">Address:</span> <p className="font-medium">{[org?.address, org?.city, org?.country].filter(Boolean).join(", ")}</p></div>
              <div><span className="text-muted-foreground">Contact:</span> <p className="font-medium">{org?.contact_name} • {org?.contact_email}</p></div>
              <div><span className="text-muted-foreground">Scope:</span> <p className="font-medium">{inspection.certification_applications?.scope}</p></div>
              <div><span className="text-muted-foreground">Sector:</span> <p className="font-medium">{inspection.certification_applications?.sector}</p></div>
              <div><span className="text-muted-foreground">Scheduled:</span> <p className="font-medium">{format(new Date(inspection.scheduled_date), "PPP")}{inspection.scheduled_time && ` @ ${inspection.scheduled_time}`}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Start Inspection Button */}
        {inspection.status === "scheduled" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <Play className="h-12 w-12 mx-auto text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2">Ready to Begin?</h3>
              <p className="text-sm text-muted-foreground mb-4">Start the inspection to begin the structured compliance checklist.</p>
              <Button onClick={handleStartInspection} size="lg">
                <Play className="mr-2 h-4 w-4" /> Start Inspection
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        {(inspection.status === "in_progress" || inspection.status === "completed") && (
          <>
            {/* Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Checklist Progress</span>
                  <span className="text-sm text-muted-foreground">{completedItems}/{checklist.length} items</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CHECKLIST_CATEGORIES.map((cat) => {
                const catItems = checklist.filter(i => i.category === cat.key);
                const catCompleted = catItems.filter(i => i.response).length;
                const isComplete = catCompleted === catItems.length;
                return (
                  <Button
                    key={cat.key}
                    variant={activeCategory === cat.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat.key)}
                    className="whitespace-nowrap"
                  >
                    {isComplete && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {cat.label} ({catCompleted}/{catItems.length})
                  </Button>
                );
              })}
            </div>

            {/* Active Category Items */}
            <Card>
              <CardHeader>
                <CardTitle>{CHECKLIST_CATEGORIES.find(c => c.key === activeCategory)?.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {categoryItems.map((item, idx) => {
                  const globalIndex = checklist.findIndex(c => c === item);
                  return (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                      <p className="font-medium text-sm">{item.item_description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Response</Label>
                          <Select
                            value={item.response || ""}
                            onValueChange={(v) => updateChecklistItem(globalIndex, "response", v)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select response" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compliant">Compliant</SelectItem>
                              <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                              <SelectItem value="not_applicable">Not Applicable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <Textarea
                            placeholder="Observation notes..."
                            value={item.notes}
                            onChange={(e) => updateChecklistItem(globalIndex, "notes", e.target.value)}
                            className="h-20"
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Overall Assessment */}
            {!isReadOnly && (
              <Card>
                <CardHeader>
                  <CardTitle>Overall Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Overall Notes</Label>
                    <Textarea
                      placeholder="Provide your overall assessment of the inspection..."
                      value={overallNotes}
                      onChange={(e) => setOverallNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label>Recommendations</Label>
                    <Textarea
                      placeholder="List any recommendations for improvement..."
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {!isReadOnly && (
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button onClick={handleSubmitReport} disabled={isSubmitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </InspectorLayout>
  );
}
