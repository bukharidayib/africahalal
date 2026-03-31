import { useState, useEffect } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2, Upload, Save, Send } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  { key: "shariah_compliance", label: "Shariah Compliance Operations" },
  { key: "sop_adherence", label: "SOP & Process Adherence" },
  { key: "staff_training", label: "Staff & Training Compliance" },
  { key: "facility_hygiene", label: "Facility & Hygiene Controls" },
  { key: "documentation", label: "Documentation & Records" },
];

const DEFAULT_ITEMS: Record<string, string[]> = {
  shariah_compliance: ["Halal slaughter procedures followed", "Shariah-compliant ingredients verified", "Prayer/blessing requirements met", "Separation of halal/non-halal maintained"],
  sop_adherence: ["Standard operating procedures displayed", "Process flow followed correctly", "Quality control checkpoints active", "Temperature monitoring in compliance"],
  staff_training: ["Staff certifications current", "Training records up to date", "Hygiene protocols followed by staff", "PPE worn correctly"],
  facility_hygiene: ["Production area cleanliness", "Equipment sanitization completed", "Pest control measures active", "Waste management procedures followed"],
  documentation: ["Production records maintained", "Traceability documentation complete", "Supplier certificates on file", "Corrective action records updated"],
};

const RESPONSES = [
  { value: "compliant", label: "Compliant", color: "text-green-700 dark:text-green-400" },
  { value: "minor_deviation", label: "Minor Deviation", color: "text-amber-700 dark:text-amber-400" },
  { value: "major_non_compliance", label: "Major Non-Compliance", color: "text-red-700 dark:text-red-400" },
  { value: "not_applicable", label: "N/A", color: "text-muted-foreground" },
];

const WEEKLY_SECTIONS = [
  { key: "executive_summary", label: "Executive Summary", placeholder: "Provide a high-level overview of this week's operations, compliance status, and key outcomes..." },
  { key: "key_achievements", label: "Key Achievements This Week", placeholder: "List major accomplishments, milestones reached, and positive compliance outcomes..." },
  { key: "compliance_issues", label: "Compliance Issues Identified", placeholder: "Detail any compliance deviations, concerns, or areas needing attention..." },
  { key: "corrective_actions", label: "Corrective Actions Taken", placeholder: "Describe corrective measures implemented, follow-ups, and resolutions..." },
  { key: "recommendations", label: "Recommendations for Next Week", placeholder: "Provide recommendations, planned activities, and focus areas for the coming week..." },
];

// KPI_FIELDS moved to SupervisorPerformance.tsx

interface ChecklistItem {
  id: string;
  category: string;
  item_description: string;
  response: string;
  observation_notes: string;
  observation_time: string;
  evidence_urls: string[];
}

export default function SupervisorReportForm() {
  const [reportType, setReportType] = useState("daily_checklist");
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  // Weekly report state
  const [weeklySections, setWeeklySections] = useState<Record<string, string>>(
    Object.fromEntries(WEEKLY_SECTIONS.map(s => [s.key, ""]))
  );
  const [weeklyEvidence, setWeeklyEvidence] = useState<string[]>([]);
  const [uploadingWeekly, setUploadingWeekly] = useState(false);

  // Monthly KPI state removed - now in SupervisorPerformance.tsx

  useEffect(() => {
    async function loadSites() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await (supabase.from("organization_supervisors" as any).select("*, organizations(name, id)").eq("supervisor_id", session.user.id) as any);
      const siteList = (data as any[]) || [];
      setSites(siteList);
      if (siteList.length === 1) setSelectedSite(siteList[0].organization_id);
      setIsLoading(false);
    }
    loadSites();
  }, []);

  useEffect(() => {
    const newItems: ChecklistItem[] = [];
    CATEGORIES.forEach(cat => {
      (DEFAULT_ITEMS[cat.key] || []).forEach((desc, idx) => {
        newItems.push({
          id: `${cat.key}-${idx}`,
          category: cat.key,
          item_description: desc,
          response: "",
          observation_notes: "",
          observation_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          evidence_urls: [],
        });
      });
    });
    setItems(newItems);
  }, []);

  const updateItem = (id: string, field: keyof ChecklistItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = (category: string) => {
    const newItem: ChecklistItem = {
      id: `${category}-custom-${Date.now()}`,
      category,
      item_description: "",
      response: "",
      observation_notes: "",
      observation_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      evidence_urls: [],
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleEvidenceUpload = async (itemId: string, file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUploadingItemId(itemId);
    const path = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("supervisor-evidence").upload(path, file);
    if (error) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } else {
      updateItem(itemId, "evidence_urls", [...(items.find(i => i.id === itemId)?.evidence_urls || []), path]);
      toast({ title: "Evidence Uploaded" });
    }
    setUploadingItemId(null);
  };

  const handleWeeklyEvidenceUpload = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUploadingWeekly(true);
    const path = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("supervisor-evidence").upload(path, file);
    if (error) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } else {
      setWeeklyEvidence(prev => [...prev, path]);
      toast({ title: "Evidence Uploaded" });
    }
    setUploadingWeekly(false);
  };

  const saveReport = async (submit: boolean) => {
    if (!selectedSite) { toast({ variant: "destructive", title: "Error", description: "Please select a site." }); return; }

    // Validation per type
    if (reportType === "daily_checklist") {
      const filledItems = items.filter(i => i.item_description.trim());
      if (submit && filledItems.some(i => !i.response || !i.observation_notes.trim())) {
        toast({ variant: "destructive", title: "Incomplete", description: "All checklist items must have a response and observation notes before submission." });
        return;
      }
    } else if (reportType === "weekly_summary") {
      if (submit && !weeklySections.executive_summary.trim()) {
        toast({ variant: "destructive", title: "Incomplete", description: "Executive Summary is required for weekly reports." });
        return;
      }
    }

    submit ? setIsSubmitting(true) : setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Build report_content based on type
      let reportContent: any = {};
      if (reportType === "weekly_summary") {
        reportContent = { type: "weekly", sections: weeklySections, evidence_urls: weeklyEvidence };
      }

      const { data: report, error: reportError } = await (supabase.from("supervisor_reports" as any).insert({
        supervisor_id: session.user.id,
        site_id: selectedSite,
        report_type: reportType,
        report_date: today,
        status: "draft",
        notes,
        report_content: reportContent,
      } as any).select().single() as any);

      if (reportError) throw reportError;

      // Insert checklist items only for daily reports
      if (reportType === "daily_checklist") {
        const filledItems = items.filter(i => i.item_description.trim());
        const itemsToInsert = filledItems.map((item, idx) => ({
          report_id: (report as any).id,
          category: item.category,
          item_description: item.item_description,
          response: item.response || null,
          observation_notes: item.observation_notes || null,
          observation_time: item.observation_time ? new Date(item.observation_time).toISOString() : null,
          evidence_urls: item.evidence_urls.length > 0 ? item.evidence_urls : null,
          sort_order: idx,
        }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await (supabase.from("supervisor_checklist_items" as any).insert(itemsToInsert as any) as any);
          if (itemsError) throw itemsError;
        }
      }

      if (submit) {
        if (reportType === "daily_checklist") {
          const { data: result, error: submitError } = await supabase.rpc("submit_supervisor_report" as any, { _report_id: (report as any).id } as any);
          if (submitError) throw submitError;
          const res = result as any;
          toast({
            title: "Report Submitted",
            description: `Compliance score: ${res.compliance_score}% (Risk: ${res.risk_level?.toUpperCase()})`,
          });
        } else {
          // For weekly/monthly, just mark as submitted directly
          const { error: updateError } = await (supabase.from("supervisor_reports" as any).update({
            status: "submitted",
            submitted_at: new Date().toISOString(),
            compliance_score: reportType === "monthly_performance" ? kpiValues.overall_compliance_pct : null,
            risk_level: reportType === "monthly_performance" ? (kpiValues.overall_compliance_pct >= 80 ? "low" : kpiValues.overall_compliance_pct >= 60 ? "medium" : "high") : null,
          } as any).eq("id", (report as any).id) as any);
          if (updateError) throw updateError;
          toast({ title: "Report Submitted", description: `${reportType === "weekly_summary" ? "Weekly" : "Monthly"} report submitted successfully.` });
        }
      } else {
        toast({ title: "Draft Saved", description: "Your report has been saved as a draft." });
      }

      navigate("/supervisor/reports");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <SupervisorLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></SupervisorLayout>;
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold font-serif">New Report</h1>
          <p className="text-muted-foreground mt-1">Create a new compliance report for your assigned site</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_checklist">Daily Checklist</SelectItem>
                    <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                {sites.length <= 1 ? (
                  <Input value={sites[0]?.organizations?.name || "No company assigned"} disabled className="bg-muted" />
                ) : (
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s: any) => (
                        <SelectItem key={s.id} value={s.organization_id}>{s.organizations?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Report Date</Label>
                <Input value={today} disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === DAILY CHECKLIST === */}
        {reportType === "daily_checklist" && (
          <>
            {CATEGORIES.map(cat => {
              const catItems = items.filter(i => i.category === cat.key);
              return (
                <Card key={cat.key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{cat.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {catItems.map((item, idx) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono text-muted-foreground mt-1">{idx + 1}.</span>
                          <div className="flex-1 space-y-3">
                            <Input
                              value={item.item_description}
                              onChange={(e) => updateItem(item.id, "item_description", e.target.value)}
                              placeholder="Checklist item description"
                              className="font-medium"
                            />
                            <RadioGroup
                              value={item.response}
                              onValueChange={(v) => updateItem(item.id, "response", v)}
                              className="flex flex-wrap gap-3"
                            >
                              {RESPONSES.map(r => (
                                <div key={r.value} className="flex items-center space-x-1.5">
                                  <RadioGroupItem value={r.value} id={`${item.id}-${r.value}`} />
                                  <Label htmlFor={`${item.id}-${r.value}`} className={`text-xs font-medium cursor-pointer ${r.color}`}>{r.label}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                            <Textarea
                              value={item.observation_notes}
                              onChange={(e) => updateItem(item.id, "observation_notes", e.target.value)}
                              placeholder="Observation notes (required)"
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Input
                                  type="datetime-local"
                                  value={item.observation_time}
                                  onChange={(e) => updateItem(item.id, "observation_time", e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*,.pdf,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleEvidenceUpload(item.id, file);
                                  }}
                                />
                                <div className="flex items-center gap-1 text-xs text-primary hover:underline">
                                  {uploadingItemId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                  Upload Evidence
                                </div>
                              </label>
                              {item.evidence_urls.length > 0 && (
                                <span className="text-xs text-muted-foreground">{item.evidence_urls.length} file(s)</span>
                              )}
                            </div>
                          </div>
                          {item.id.includes("custom") && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addItem(cat.key)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Item
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {/* === WEEKLY SUMMARY (Long-Form Document) === */}
        {reportType === "weekly_summary" && (
          <>
            {WEEKLY_SECTIONS.map(section => (
              <Card key={section.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{section.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={weeklySections[section.key]}
                    onChange={(e) => setWeeklySections(prev => ({ ...prev, [section.key]: e.target.value }))}
                    placeholder={section.placeholder}
                    rows={6}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Supporting Evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleWeeklyEvidenceUpload(file);
                    }}
                  />
                  {uploadingWeekly ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Evidence File
                </label>
                {weeklyEvidence.length > 0 && (
                  <div className="text-xs text-muted-foreground">{weeklyEvidence.length} file(s) attached</div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* === MONTHLY PERFORMANCE (KPI Entry) === */}
        {reportType === "monthly_performance" && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {KPI_FIELDS.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={field.key === "overall_compliance_pct" ? 100 : undefined}
                        value={kpiValues[field.key]}
                        onChange={(e) => setKpiValues(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Category Compliance Breakdown (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CATEGORIES.map(cat => (
                    <div key={cat.key} className="space-y-1.5">
                      <Label className="text-xs">{cat.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={categoryBreakdown[cat.key]}
                        onChange={(e) => setCategoryBreakdown(prev => ({ ...prev, [cat.key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Trend Notes & Commentary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={monthlyCommentary}
                  onChange={(e) => setMonthlyCommentary(e.target.value)}
                  placeholder="Provide trend analysis, performance commentary, and strategic observations for this month..."
                  rows={5}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardContent className="pt-6">
            <Label>Additional Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional observations or comments..." rows={3} className="mt-2" />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" onClick={() => saveReport(false)} disabled={isSaving || isSubmitting}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save as Draft
          </Button>
          <Button onClick={() => saveReport(true)} disabled={isSaving || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Report
          </Button>
        </div>
      </div>
    </SupervisorLayout>
  );
}
