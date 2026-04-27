import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertOctagon, Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";

interface RaiseNCRDialogProps {
  source: "supervisor" | "inspector";
  applicationId: string;
  inspectionId?: string | null;
  reportId?: string | null;
  raisedBy: string;
  onRaised?: (ncnId: string) => void;
}

const SEVERITIES = [
  { value: "minor", label: "Minor", days: 30 },
  { value: "major", label: "Major", days: 14 },
  { value: "critical", label: "Critical", days: 7 },
];

export function RaiseNCRDialog({ source, applicationId, inspectionId, reportId, raisedBy, onRaised }: RaiseNCRDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState<"minor" | "major" | "critical">("major");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const submit = async () => {
    if (!category.trim() || !description.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Category and description are required." });
      return;
    }
    setSubmitting(true);
    try {
      const sevConfig = SEVERITIES.find((s) => s.value === severity)!;
      const dueDate = format(addDays(new Date(), sevConfig.days), "yyyy-MM-dd");
      const prefix = source === "supervisor" ? "NCR-SUP" : "NCR-INS";
      const ncnNumber = `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`;
      const id = crypto.randomUUID();

      const { error } = await supabase.from("non_conformance_notices").insert({
        id,
        ncn_number: ncnNumber,
        application_id: applicationId,
        inspection_id: inspectionId || null,
        report_id: reportId || null,
        raised_by: raisedBy,
        source,
        category,
        severity,
        description,
        due_date: dueDate,
        status: "open",
        issued_at: new Date().toISOString(),
      } as any);

      if (error) throw error;
      toast({ title: "NCR raised", description: `${ncnNumber} created. Awaiting client response.` });
      setOpen(false);
      setCategory("");
      setDescription("");
      onRaised?.(id);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to raise NCR", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <AlertOctagon className="h-4 w-4 mr-2" /> Raise NCR
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise Non-Conformance Report</DialogTitle>
          <DialogDescription>Document a non-compliance finding from this report. Admin will review and notify the client.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Hygiene, Documentation, Ingredient sourcing" />
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label} — due in {s.days} days</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the non-conformance and required corrective action..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Raise NCR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
