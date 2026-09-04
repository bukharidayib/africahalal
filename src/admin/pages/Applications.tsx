import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Calendar,
  Plus,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminLayout } from '../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'awaiting_inspection'
  | 'inspection_complete'
  | 'pending_decision'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'withdrawn'
  | 'expired';

interface Application {
  id: string;
  application_number: string;
  organization_id: string;
  application_type: string;
  scope: string;
  sector: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  created_at: string;
  organizations?: {
    name: string;
    registration_number: string;
  };
}

interface BusinessOption {
  id: string;
  entity_name: string;
  branch_name: string | null;
  business_type: string | null;
  pacra_number: string;
  organization_id: string | null;
  sector?: string | null;
}

const statusConfig: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<any> }> = {
  draft: { label: 'Draft', variant: 'outline', icon: FileText },
  submitted: { label: 'Submitted', variant: 'default', icon: Clock },
  under_review: { label: 'Under Review', variant: 'secondary', icon: Search },
  awaiting_inspection: { label: 'Awaiting Inspection', variant: 'secondary', icon: Calendar },
  inspection_complete: { label: 'Inspection Complete', variant: 'secondary', icon: CheckCircle2 },
  pending_decision: { label: 'Pending Decision', variant: 'default', icon: AlertCircle },
  pending_approval: { label: 'Pending Approval', variant: 'default', icon: AlertCircle },
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  suspended: { label: 'Suspended', variant: 'destructive', icon: AlertCircle },
  withdrawn: { label: 'Withdrawn', variant: 'outline', icon: XCircle },
  expired: { label: 'Expired', variant: 'outline', icon: Clock },
};

export default function Applications() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    business_id: '',
    application_type: 'Full Certification',
    sector: '',
    scope: '',
    status: 'submitted',
    submitted_at: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    const { data } = await supabase
      .from('client_businesses')
      .select('id, entity_name, branch_name, business_type, pacra_number, organization_id')
      .order('entity_name');
    setBusinesses((data || []) as BusinessOption[]);
  }

  function resetCreateForm() {
    setCreateForm({
      business_id: '',
      application_type: 'Full Certification',
      sector: '',
      scope: '',
      status: 'submitted',
      submitted_at: new Date().toISOString().slice(0, 10),
    });
  }

  async function ensureBusinessOrganization(business: BusinessOption) {
    if (business.organization_id) return business.organization_id;
    const name = business.branch_name || business.entity_name;
    const orgId = crypto.randomUUID();
    const { error: orgErr } = await supabase.from('organizations').insert({
      id: orgId,
      name,
      registration_number: business.pacra_number,
      sector: createForm.sector || 'General',
    });
    if (orgErr) throw orgErr;
    const { error: bizErr } = await supabase.from('client_businesses').update({ organization_id: orgId } as any).eq('id', business.id);
    if (bizErr) throw bizErr;
    return orgId;
  }

  async function handleCreateApplication() {
    const business = businesses.find((b) => b.id === createForm.business_id);
    if (!business || !createForm.scope.trim()) {
      toast({ variant: 'destructive', title: 'Missing application details', description: 'Business and certification scope are required.' });
      return;
    }
    setCreating(true);
    try {
      const organizationId = await ensureBusinessOrganization(business);
      const { data: appNumberData } = await supabase.rpc('generate_application_number');
      const appNumber = appNumberData || `APP-${Date.now()}`;
      const submittedAt = createForm.status === 'draft' ? null : new Date(createForm.submitted_at || Date.now()).toISOString();
      const { data, error } = await supabase.from('certification_applications').insert({
        application_number: appNumber,
        organization_id: organizationId,
        business_id: business.id,
        application_type: createForm.application_type,
        sector: createForm.sector || 'General',
        scope: createForm.scope.trim(),
        status: createForm.status,
        submitted_at: submittedAt,
      } as any).select('id, application_number').single();
      if (error) throw error;
      toast({ title: 'Application created', description: `${data.application_number} was created for ${business.branch_name || business.entity_name}.` });
      resetCreateForm();
      setCreateOpen(false);
      await fetchApplications();
      await fetchBusinesses();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Create failed', description: e.message });
    } finally {
      setCreating(false);
    }
  }

  async function fetchApplications() {
    try {
      let query = supabase
        .from('certification_applications')
        .select(`
          *,
          organizations (
            name,
            registration_number
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      app.application_number.toLowerCase().includes(search) ||
      app.organizations?.name.toLowerCase().includes(search) ||
      app.sector.toLowerCase().includes(search)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Applications</h1>
            <p className="text-muted-foreground">
              Manage certification applications
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Application
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by application number, organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="awaiting_inspection">Awaiting Inspection</SelectItem>
                  <SelectItem value="pending_decision">Pending Decision</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredApplications.length} Application{filteredApplications.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading applications...
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No applications found</h3>
                <p className="text-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Applications will appear here once submitted'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => {
                    const status = statusConfig[app.status];
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          {app.application_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{app.organizations?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{app.application_type}</TableCell>
                        <TableCell>{app.sector}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {app.submitted_at 
                            ? format(new Date(app.submitted_at), 'dd MMM yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/admin/applications/${app.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Business *</Label>
              <Select
                value={createForm.business_id}
                onValueChange={(value) => {
                  const business = businesses.find((b) => b.id === value);
                  setCreateForm((p) => ({ ...p, business_id: value, sector: p.sector || business?.sector || '' }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select registered business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.business_type === 'branch' ? business.branch_name || business.entity_name : business.entity_name} - {business.pacra_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Application type</Label>
                <Input value={createForm.application_type} onChange={(e) => setCreateForm((p) => ({ ...p, application_type: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                <Input value={createForm.sector} onChange={(e) => setCreateForm((p) => ({ ...p, sector: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Certification scope *</Label>
              <Textarea value={createForm.scope} onChange={(e) => setCreateForm((p) => ({ ...p, scope: e.target.value }))} rows={3} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={createForm.status} onValueChange={(value) => setCreateForm((p) => ({ ...p, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Submitted date</Label>
                <Input type="date" value={createForm.submitted_at} onChange={(e) => setCreateForm((p) => ({ ...p, submitted_at: e.target.value }))} disabled={createForm.status === 'draft'} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateApplication} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
