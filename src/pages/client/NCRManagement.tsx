import React, { useEffect, useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Upload, Send, FileWarning, CheckCircle2, Clock } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface NCN {
  id: string;
  ncn_number: string;
  application_id: string;
  category: string;
  description: string;
  severity: "minor" | "major" | "critical";
  status: string;
  due_date: string;
  issued_at: string;
}

const severityClass: Record<string, string> = {
  minor: "border-amber-300 text-amber-700 bg-amber-50",
  major: "border-orange-300 text-orange-700 bg-orange-50",
  critical: "bg-red-100 text-red-800 border-red-300",
};

export default function NCRManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [ncns, setNcns] = useState<NCN[]>([]);
  const [activeNcn, setActiveNcn] = useState<NCN | null>(null);
  const [response, setResponse] = useState("");
  const [evidencePaths, setEvidencePaths] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("non_conformance_notices")
        .select("*")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      setNcns((data as any[]) || []);

      // Track NCNs that already have CA submitted by this user
      const ids = (data || []).map((n: any) => n.id);
      if (ids.length > 0) {
        const { data: cas } = await supabase
          .from("corrective_actions")
          .select("ncn_id")
          .in("ncn_id", ids);
        setSubmittedIds(new Set((cas || []).map((c: any) => c.ncn_id)));
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to load NCRs", description: e.message });
    } finally {
      setIsLoading(false);
    }
  }

  function openNcn(ncn: NCN) {
    setActiveNcn(ncn);
    setResponse("");
    setEvidencePaths([]);
  }

  async function handleUpload(file: File) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setIsUploading(true);
    try {
      const path = `${session.user.id}/corrective-actions/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("client-evidence").upload(path, file);
      if (error) throw error;
      setEvidencePaths(prev => [...prev, path]);
      toast({ title: "Evidence uploaded" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload failed", description: e.message });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit() {
    if (!activeNcn) return;
    if (!response.trim()) {
      toast({ variant: "destructive", title: "Response required", description: "Please describe the corrective action taken." });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error: caErr } = await supabase.from("corrective_actions").insert({
        id: crypto.randomUUID(),
        ncn_id: activeNcn.id,
        response,
        evidence_files: evidencePaths.length > 0 ? evidencePaths : null,
        submitted_by: session.user.id,
        status: "pending",
      } as any);
      if (caErr) throw caErr;

      // Move NCN status forward
      await supabase
        .from("non_conformance_notices")
        .update({ status: "corrective_action_submitted" } as any)
        .eq("id", activeNcn.id);

      toast({ title: "Corrective action submitted", description: `${activeNcn.ncn_number} sent for review.` });
      setActiveNcn(null);
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Submission failed", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const open = ncns.filter(n => n.status === "open").length;
  const submitted = ncns.filter(n => n.status === "corrective_action_submitted").length;
  const closed = ncns.filter(n => n.status === "closed").length;

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">NCR Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">View non-conformance notices issued to your organization and submit corrective actions.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Open</p><p className="text-3xl font-bold mt-1 text-red-600">{open}</p></div><AlertTriangle className="h-8 w-8 text-red-500/40" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Awaiting Review</p><p className="text-3xl font-bold mt-1 text-amber-600">{submitted}</p></div><Clock className="h-8 w-8 text-amber-500/40" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Resolved</p><p className="text-3xl font-bold mt-1 text-green-600">{closed}</p></div><CheckCircle2 className="h-8 w-8 text-green-500/40" /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileWarning className="h-5 w-5" /> Non-Conformance Notices</CardTitle>
            <CardDescription>Respond to each NCR with a corrective action and supporting evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" /></div>
            ) : ncns.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500/40" />
                <p>No non-conformance notices for your organization.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NCR #</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ncns.map((n) => {
                      const days = differenceInDays(new Date(n.due_date), new Date());
                      const dueLabel = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`;
                      const dueClass = days < 0 ? "text-destructive font-semibold" : days <= 7 ? "text-amber-600" : "text-muted-foreground";
                      const alreadySubmitted = submittedIds.has(n.id) || n.status !== "open";
                      return (
                        <TableRow key={n.id}>
                          <TableCell className="font-mono text-xs">{n.ncn_number}</TableCell>
                          <TableCell>{n.category}</TableCell>
                          <TableCell><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${severityClass[n.severity]}`}>{n.severity.toUpperCase()}</span></TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{n.status.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell><span className={dueClass}>{format(new Date(n.due_date), "dd MMM yyyy")} · {dueLabel}</span></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant={alreadySubmitted ? "outline" : "default"} onClick={() => openNcn(n)}>
                              {alreadySubmitted ? "View" : "Respond"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!activeNcn} onOpenChange={(o) => !o && setActiveNcn(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{activeNcn?.ncn_number} — {activeNcn?.category}</DialogTitle>
              <DialogDescription>
                Severity <span className="font-semibold uppercase">{activeNcn?.severity}</span> · Due {activeNcn?.due_date && format(new Date(activeNcn.due_date), "dd MMM yyyy")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-muted/30 text-sm whitespace-pre-wrap">{activeNcn?.description}</div>

              {activeNcn && (submittedIds.has(activeNcn.id) || activeNcn.status !== "open") ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  A corrective action has already been submitted for this NCR. The certification team will review and respond.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Corrective Action Response *</Label>
                    <Textarea rows={5} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Describe the actions taken to address this non-conformance..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Evidence (optional)</Label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept="image/*,.pdf,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                        <div className="flex items-center gap-1 text-sm text-primary border border-dashed border-primary/30 rounded-lg px-4 py-2 hover:bg-primary/5">
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Upload File
                        </div>
                      </label>
                      {evidencePaths.length > 0 && <span className="text-xs text-muted-foreground">{evidencePaths.length} file(s) attached</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveNcn(null)}>Close</Button>
              {activeNcn && !(submittedIds.has(activeNcn.id) || activeNcn.status !== "open") && (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit Corrective Action
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
