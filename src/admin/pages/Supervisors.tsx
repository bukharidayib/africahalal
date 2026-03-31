import React, { useState, useEffect, useCallback } from "react";
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
import {
  Loader2, UserPlus, Trash2, Building2, FileText, AlertTriangle,
  AlertOctagon, Activity, Send, Clock, CheckCircle, XCircle,
  RotateCcw, RefreshCw, Mail, MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isPast } from "date-fns";

interface Supervisor {
  id: string;
  email: string;
  full_name: string;
  organization?: { id: string; name: string } | null;
  sites: { id: string; site_name: string; site_address: string | null; is_active: boolean }[];
}

interface Organization {
  id: string;
  name: string;
}

interface SupervisorInvitation {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string | null;
  site_name: string | null;
  site_address: string | null;
  invited_by: string;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  org_name?: string;
  inviter_name?: string;
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
  const [activeTab, setActiveTab] = useState("supervisors");

  // Create Supervisor dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createOrgId, setCreateOrgId] = useState("");
  const [createSiteName, setCreateSiteName] = useState("");
  const [createSiteAddress, setCreateSiteAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Assign Site dialog
  const [isSiteDialogOpen, setIsSiteDialogOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteSupId, setSiteSupId] = useState("");
  const [siteOrgId, setSiteOrgId] = useState("");

  // Invitations
  const [invitations, setInvitations] = useState<SupervisorInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Tab data
  const [reports, setReports] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => { fetchSupervisors(); }, []);

  useEffect(() => {
    if (activeTab === "invitations") fetchInvitations();
    else if (activeTab !== "supervisors") loadTabData(activeTab);
  }, [activeTab]);

  const fetchSupervisors = async () => {
    setIsLoading(true);
    try {
      // Only get actual supervisors (those with organization_supervisors records)
      const { data: assignments } = await (supabase.from('organization_supervisors' as any).select('supervisor_id, organization_id') as any);
      if (!assignments || assignments.length === 0) {
        setSupervisors([]);
        const { data: orgs } = await supabase.from('organizations').select('id, name').order('name');
        setOrganizations((orgs as any[]) || []);
        setIsLoading(false);
        return;
      }

      const supervisorIds = [...new Set((assignments as any[]).map((a: any) => a.supervisor_id))];
      const orgIds = [...new Set((assignments as any[]).map((a: any) => a.organization_id))];

      const [profilesRes, orgsRes, sitesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', supervisorIds),
        supabase.from('organizations').select('id, name').order('name'),
        supabase.from('supervisor_sites' as any).select('*').in('supervisor_id', supervisorIds) as any,
      ]);

      const profileMap = new Map(((profilesRes.data as any[]) || []).map((p: any) => [p.id, p]));
      const orgMap = new Map(((orgsRes.data as any[]) || []).map((o: any) => [o.id, o]));
      const sitesMap = new Map<string, any[]>();
      ((sitesRes.data as any[]) || []).forEach((s: any) => {
        if (!sitesMap.has(s.supervisor_id)) sitesMap.set(s.supervisor_id, []);
        sitesMap.get(s.supervisor_id)!.push(s);
      });

      const assignmentMap = new Map<string, string>();
      (assignments as any[]).forEach((a: any) => assignmentMap.set(a.supervisor_id, a.organization_id));

      const formatted: Supervisor[] = supervisorIds.map(id => {
        const profile = profileMap.get(id);
        const orgId = assignmentMap.get(id);
        return {
          id,
          email: profile?.email || 'Unknown',
          full_name: profile?.full_name || profile?.email || 'Unknown',
          organization: orgId ? orgMap.get(orgId) || null : null,
          sites: sitesMap.get(id) || [],
        };
      });

      setSupervisors(formatted);
      setOrganizations((orgsRes.data as any[]) || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const { data, error } = await (supabase
        .from('supervisor_invitations' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;

      const orgIds = [...new Set(((data as any[]) || []).filter((i: any) => i.organization_id).map((i: any) => i.organization_id))];
      const inviterIds = [...new Set(((data as any[]) || []).map((i: any) => i.invited_by))];

      const [orgsRes, profilesRes] = await Promise.all([
        orgIds.length > 0 ? supabase.from('organizations').select('id, name').in('id', orgIds) : Promise.resolve({ data: [] }),
        inviterIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', inviterIds) : Promise.resolve({ data: [] }),
      ]);

      const orgMap = new Map(((orgsRes.data as any[]) || []).map((o: any) => [o.id, o.name]));
      const profileMap = new Map(((profilesRes.data as any[]) || []).map((p: any) => [p.id, p.full_name]));

      const enriched = ((data as any[]) || []).map((inv: any) => ({
        ...inv,
        org_name: inv.organization_id ? orgMap.get(inv.organization_id) : null,
        inviter_name: profileMap.get(inv.invited_by) || 'Admin',
        status: inv.status === 'pending' && isPast(new Date(inv.expires_at)) ? 'expired' : inv.status,
      }));

      setInvitations(enriched);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setInvitationsLoading(false);
    }
  }, [toast]);

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

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCreateSupervisor = async () => {
    const email = createEmail.trim().toLowerCase();
    if (!email || !createOrgId) {
      toast({ variant: "destructive", title: "Required", description: "Email and organization are required." });
      return;
    }
    if (!isValidEmail(email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address (e.g. name@example.com)." });
      return;
    }

    // Check duplicate pending invitation
    const existing = invitations.find(i => i.email === email && i.status === 'pending');
    if (existing) {
      toast({ variant: "destructive", title: "Duplicate", description: "A pending invitation already exists for this email." });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get inviter name
      const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();

      // Create invitation record
      const { data: invitation, error: insertError } = await (supabase
        .from('supervisor_invitations' as any)
        .insert({
          email,
          full_name: createName || null,
          organization_id: createOrgId,
          site_name: createSiteName || null,
          site_address: createSiteAddress || null,
          invited_by: session.user.id,
        } as any)
        .select()
        .single() as any);

      if (insertError) throw insertError;

      // Get org name
      const org = organizations.find(o => o.id === createOrgId);

      // Send invitation email
      const response = await fetch(
        `https://xdixdqyzjfdqummwpuzg.supabase.co/functions/v1/send-supervisor-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email,
            full_name: createName || '',
            organization_name: org?.name || '',
            site_name: createSiteName || '',
            invitation_id: invitation.id,
            invitation_token: invitation.token,
            inviter_name: inviterProfile?.full_name || 'Administrator',
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send invitation');

      // Audit log
      await supabase.rpc('log_audit', {
        _action: 'supervisor_invitation_sent',
        _resource_type: 'supervisor_invitations',
        _resource_id: invitation.id,
        _metadata: { email, organization_id: createOrgId, site_name: createSiteName },
      });

      toast({ title: "Invitation Sent", description: `Supervisor invitation sent to ${email}` });
      setIsCreateOpen(false);
      setCreateEmail("");
      setCreateName("");
      setCreateOrgId("");
      setCreateSiteName("");
      setCreateSiteAddress("");
      fetchInvitations();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveAssignment = async (supervisorId: string) => {
    if (!confirm("Remove this supervisor's assignment? They will lose access to the Supervisor Portal.")) return;
    try {
      // Remove sites first
      await (supabase.from('supervisor_sites' as any).delete().eq('supervisor_id', supervisorId) as any);
      const { error } = await (supabase.from('organization_supervisors' as any).delete().eq('supervisor_id', supervisorId) as any);
      if (error) throw error;
      toast({ title: "Assignment removed" });
      fetchSupervisors();
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
      fetchSupervisors();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleCancelInvitation = async (inv: SupervisorInvitation) => {
    if (!confirm(`Cancel the invitation for ${inv.email}?`)) return;
    try {
      const { error } = await (supabase
        .from('supervisor_invitations' as any)
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
        .eq('id', inv.id) as any);
      if (error) throw error;
      toast({ title: "Invitation cancelled" });
      fetchInvitations();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleResendInvitation = async (inv: SupervisorInvitation) => {
    if (!isValidEmail(inv.email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: `The email "${inv.email}" is invalid. Please delete this invitation and create a new one with a correct email.` });
      return;
    }
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Reset invitation
      await (supabase
        .from('supervisor_invitations' as any)
        .update({
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          cancelled_at: null,
        } as any)
        .eq('id', inv.id) as any);

      const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();

      const response = await fetch(
        `https://xdixdqyzjfdqummwpuzg.supabase.co/functions/v1/send-supervisor-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: inv.email,
            full_name: inv.full_name || '',
            organization_name: inv.org_name || '',
            site_name: inv.site_name || '',
            invitation_id: inv.id,
            invitation_token: inv.token,
            inviter_name: inviterProfile?.full_name || 'Administrator',
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to resend');

      toast({ title: "Invitation resent", description: `New invitation sent to ${inv.email}` });
      fetchInvitations();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteInvitation = async (inv: SupervisorInvitation) => {
    if (!confirm(`Permanently delete the invitation for ${inv.email}?`)) return;
    try {
      const { error } = await (supabase.from('supervisor_invitations' as any).delete().eq('id', inv.id) as any);
      if (error) throw error;
      toast({ title: "Invitation deleted" });
      fetchInvitations();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'expired': return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const invStats = {
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    cancelled: invitations.filter(i => i.status === 'cancelled').length,
    expired: invitations.filter(i => i.status === 'expired').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Supervisors</h2>
            <p className="text-muted-foreground">Manage field supervisors, site assignments, and compliance tracking.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSiteDialogOpen(true)}>
              <MapPin className="mr-2 h-4 w-4" /> Assign Site
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Create Supervisor
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
            <TabsTrigger value="invitations"><Mail className="mr-1 h-3 w-3" />Invitations</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="mr-1 h-3 w-3" />Reports</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="incidents"><AlertTriangle className="mr-1 h-3 w-3" />Incidents</TabsTrigger>
            <TabsTrigger value="ncrs"><AlertOctagon className="mr-1 h-3 w-3" />NCRs</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="mr-1 h-3 w-3" />Activity</TabsTrigger>
          </TabsList>

          {/* SUPERVISORS TAB */}
          <TabsContent value="supervisors">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Assigned Company</TableHead>
                    <TableHead>Sites</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : supervisors.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No supervisors found. Use "Create Supervisor" to invite one.
                    </TableCell></TableRow>
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
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.sites.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">No sites</span>
                            ) : s.sites.map(site => (
                              <Badge key={site.id} variant="secondary" className="text-xs gap-1">
                                <MapPin className="h-2.5 w-2.5" />{site.site_name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveAssignment(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* INVITATIONS TAB */}
          <TabsContent value="invitations">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Pending', count: invStats.pending, icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
                  { label: 'Accepted', count: invStats.accepted, icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600' },
                  { label: 'Cancelled', count: invStats.cancelled, icon: XCircle, bg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600' },
                  { label: 'Expired', count: invStats.expired, icon: AlertTriangle, bg: 'bg-muted', iconColor: 'text-muted-foreground' },
                ].map(({ label, count, icon: Icon, bg, iconColor }) => (
                  <Card key={label}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs text-muted-foreground">{label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={fetchInvitations}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>

              {/* Invitations Table */}
              <Card>
                <CardContent className="pt-6">
                  {invitationsLoading ? (
                    <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                  ) : invitations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="font-medium mb-1">No invitations yet</h3>
                      <p className="text-sm">Use "Create Supervisor" to send the first invitation.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invited By</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.email}</TableCell>
                            <TableCell>{inv.full_name || '—'}</TableCell>
                            <TableCell>{inv.org_name || '—'}</TableCell>
                            <TableCell>{inv.site_name || '—'}</TableCell>
                            <TableCell>{getStatusBadge(inv.status)}</TableCell>
                            <TableCell className="text-sm">{inv.inviter_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.created_at), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {(inv.status === 'pending' || inv.status === 'expired' || inv.status === 'cancelled') && (
                                  <Button variant="ghost" size="sm" onClick={() => handleResendInvitation(inv)} disabled={isSending} title="Resend">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {inv.status === 'pending' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(inv)} title="Cancel">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {(inv.status === 'cancelled' || inv.status === 'expired' || inv.status === 'accepted') && (
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteInvitation(inv)} title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
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
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/admin/supervisor-reports/${r.id}`}>
                        <TableCell>{format(new Date(r.report_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-sm capitalize">{r.report_type?.replace(/_/g, " ")}</TableCell>
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

        {/* Create Supervisor Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Supervisor</DialogTitle>
              <DialogDescription>Send a branded invitation email to onboard a new field supervisor.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="supervisor@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="John Mwanza" />
              </div>
              <div className="space-y-2">
                <Label>Organization *</Label>
                <Select value={createOrgId} onValueChange={setCreateOrgId}>
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>{organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSupervisor} disabled={isCreating || !createEmail || !createOrgId}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Site Dialog */}
        <Dialog open={isSiteDialogOpen} onOpenChange={setIsSiteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Site to Supervisor</DialogTitle>
              <DialogDescription>Create a new site assignment for an existing supervisor.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select value={siteSupId} onValueChange={setSiteSupId}>
                  <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                  <SelectContent>{supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
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
