import React, { useState, useEffect } from "react";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Building2, FileText, AlertTriangle, AlertOctagon, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Supervisor {
  id: string;
  email: string;
  full_name: string;
  organization?: { id: string; name: string } | null;
}

interface Organization {
  id: string;
  name: string;
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function Supervisors() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isSiteDialogOpen, setIsSiteDialogOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteSupId, setSiteSupId] = useState("");
  const [siteOrgId, setSiteOrgId] = useState("");
  const [activeTab, setActiveTab] = useState("assignments");

  // Tab data
  const [reports, setReports] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab !== "assignments") loadTabData(activeTab);
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');
      const { data: assignments } = await (supabase.from('organization_supervisors' as any).select('supervisor_id, organization_id') as any);
      const { data: orgs } = await supabase.from('organizations').select('id, name').order('name');

      const assignmentMap = new Map<string, string>();
      ((assignments as any[]) || []).forEach((a: any) => assignmentMap.set(a.supervisor_id, a.organization_id));

      const orgMap = new Map<string, Organization>();
      ((orgs as any[]) || []).forEach((o: any) => orgMap.set(o.id, o));

      const formatted = ((profiles as any[]) || []).map((p: any) => {
        const orgId = assignmentMap.get(p.id);
        return { id: p.id, email: p.email, full_name: p.full_name || p.email, organization: orgId ? orgMap.get(orgId) || null : null };
      });

      setSupervisors(formatted);
      setOrganizations((orgs as any[]) || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async (tab: string) => {
    setTabLoading(true);
    try {
      if (tab === "reports") {
        const { data } = await (supabase.from("supervisor_reports" as any).select("*").order("created_at", { ascending: false }).limit(100) as any);
        setReports((data as any[]) || []);
      } else if (tab === "compliance") {
        const { data } = await (supabase.from("supervisor_compliance_scores" as any).select("*").order("score_date", { ascending: false }).limit(100) as any);
        setScores((data as any[]) || []);
      } else if (tab === "incidents") {
        const { data } = await (supabase.from("supervisor_incidents" as any).select("*").order("reported_at", { ascending: false }).limit(100) as any);
        setIncidents((data as any[]) || []);
      } else if (tab === "ncrs") {
        const { data } = await (supabase.from("supervisor_ncrs" as any).select("*").order("created_at", { ascending: false }).limit(100) as any);
        setNcrs((data as any[]) || []);
      } else if (tab === "activity") {
        const { data } = await (supabase.from("supervisor_activity_log" as any).select("*").order("created_at", { ascending: false }).limit(100) as any);
        setActivityLog((data as any[]) || []);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setTabLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSupervisor || !selectedOrg) return;
    try {
      const existing = supervisors.find(s => s.id === selectedSupervisor);
      if (existing?.organization) {
        await (supabase.from('organization_supervisors' as any).delete().eq('supervisor_id', selectedSupervisor) as any);
      }
      const { error } = await (supabase.from('organization_supervisors' as any).insert({ supervisor_id: selectedSupervisor, organization_id: selectedOrg } as any) as any);
      if (error) throw error;
      toast({ title: "Success", description: "Supervisor assigned successfully" });
      setIsAssignOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleRemoveAssignment = async (supervisorId: string) => {
    if (!confirm("Remove this assignment?")) return;
    try {
      const { error } = await (supabase.from('organization_supervisors' as any).delete().eq('supervisor_id', supervisorId) as any);
      if (error) throw error;
      toast({ title: "Assignment removed" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleCreateSite = async () => {
    if (!siteSupId || !siteOrgId || !siteName.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await (supabase.from("supervisor_sites" as any).insert({
        supervisor_id: siteSupId,
        organization_id: siteOrgId,
        site_name: siteName,
        site_address: siteAddress || null,
        assigned_by: session?.user?.id,
      } as any) as any);
      if (error) throw error;
      toast({ title: "Site Created", description: `Site "${siteName}" assigned.` });
      setIsSiteDialogOpen(false);
      setSiteName("");
      setSiteAddress("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleUpdateNcrStatus = async (ncrId: string, newStatus: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const updates: any = { status: newStatus };
      if (newStatus === "closed") { updates.resolved_at = new Date().toISOString(); updates.resolved_by = session?.user?.id; }
      const { error } = await (supabase.from("supervisor_ncrs" as any).update(updates).eq("id", ncrId) as any);
      if (error) throw error;
      toast({ title: "NCR Updated" });
      loadTabData("ncrs");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Supervisors</h2>
            <p className="text-muted-foreground">Manage supervisors, sites, reports, and compliance tracking.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSiteDialogOpen(true)}>
              <Building2 className="mr-2 h-4 w-4" /> Assign Site
            </Button>
            <Button onClick={() => setIsAssignOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Assign Supervisor
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="mr-1 h-3 w-3" />Reports</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="incidents"><AlertTriangle className="mr-1 h-3 w-3" />Incidents</TabsTrigger>
            <TabsTrigger value="ncrs"><AlertOctagon className="mr-1 h-3 w-3" />NCRs</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="mr-1 h-3 w-3" />Activity</TabsTrigger>
          </TabsList>

          {/* ASSIGNMENTS TAB */}
          <TabsContent value="assignments">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Assigned Company</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : supervisors.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No supervisors found.</TableCell></TableRow>
                  ) : (
                    supervisors.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{s.full_name}</span>
                            <span className="text-xs text-muted-foreground">{s.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.organization ? (
                            <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" />{s.organization.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.organization && (
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveAssignment(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports">
            {tabLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No reports.</TableCell></TableRow>
                    ) : reports.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.report_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-sm">{r.report_type?.replace(/_/g, " ")}</TableCell>
                        <TableCell><Badge variant={r.status === "submitted" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                        <TableCell>{r.compliance_score != null ? `${r.compliance_score}%` : "—"}</TableCell>
                        <TableCell>{r.risk_level ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColors[r.risk_level] || ""}`}>{r.risk_level.toUpperCase()}</span> : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* COMPLIANCE TAB */}
          <TabsContent value="compliance">
            {tabLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Overall Score</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Categories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No scores.</TableCell></TableRow>
                    ) : scores.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.score_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-bold">{s.overall_score}%</TableCell>
                        <TableCell><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColors[s.risk_level] || ""}`}>{s.risk_level?.toUpperCase()}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{Object.entries(s.category_scores || {}).map(([k, v]) => `${k}: ${v}%`).join(", ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* INCIDENTS TAB */}
          <TabsContent value="incidents">
            {tabLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incident #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No incidents.</TableCell></TableRow>
                    ) : incidents.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.incident_number}</TableCell>
                        <TableCell className="text-sm">{i.incident_type?.replace(/_/g, " ")}</TableCell>
                        <TableCell><Badge variant={i.severity === "critical" ? "destructive" : "outline"}>{i.severity}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                        <TableCell className="text-sm">{format(new Date(i.reported_at), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* NCRs TAB */}
          <TabsContent value="ncrs">
            {tabLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NCR #</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ncrs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No NCRs.</TableCell></TableRow>
                    ) : ncrs.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono text-xs">{n.ncr_number}</TableCell>
                        <TableCell className="text-sm">{n.category}</TableCell>
                        <TableCell><Badge variant={n.severity === "critical" ? "destructive" : "outline"}>{n.severity}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{n.status?.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell>
                          {n.status === "corrective_action_submitted" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleUpdateNcrStatus(n.id, "under_review")}>Review</Button>
                              <Button size="sm" variant="outline" onClick={() => handleUpdateNcrStatus(n.id, "closed")}>Close</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleUpdateNcrStatus(n.id, "escalated")}>Escalate</Button>
                            </div>
                          )}
                          {n.status === "under_review" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleUpdateNcrStatus(n.id, "closed")}>Close</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleUpdateNcrStatus(n.id, "escalated")}>Escalate</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity">
            {tabLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <div className="space-y-2">
                {activityLog.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No activity recorded.</p>
                ) : activityLog.map((log: any) => (
                  <Card key={log.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{log.action?.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{log.resource_type} {log.resource_id ? `• ${log.resource_id.slice(0, 8)}...` : ""}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy HH:mm")}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Assign Supervisor Dialog */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Supervisor</DialogTitle>
              <DialogDescription>Select a user and a company to assign them to.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Supervisor (User)</Label>
                <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>{supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign}>Assign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Site Dialog */}
        <Dialog open={isSiteDialogOpen} onOpenChange={setIsSiteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Site to Supervisor</DialogTitle>
              <DialogDescription>Create a site assignment for a supervisor.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select value={siteSupId} onValueChange={setSiteSupId}>
                  <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                  <SelectContent>{supervisors.filter(s => s.organization).map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={siteOrgId} onValueChange={setSiteOrgId}>
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>{organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Site Name *</Label>
                <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. Main Production Facility" />
              </div>
              <div className="space-y-2">
                <Label>Site Address</Label>
                <Input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Physical address" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSiteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSite}>Create Site</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
