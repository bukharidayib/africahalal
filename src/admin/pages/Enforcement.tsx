import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Search, 
  ChevronRight,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileWarning,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type NCNSeverity = 'minor' | 'major' | 'critical';
type CorrectiveActionStatus = 'pending' | 'under_review' | 'accepted' | 'rejected';

interface NCN {
  id: string;
  ncn_number: string;
  application_id: string;
  category: string;
  description: string;
  severity: NCNSeverity;
  status: string;
  due_date: string;
  issued_at: string;
  certification_applications?: {
    application_number: string;
    organizations?: {
      name: string;
    };
  };
}

interface CorrectiveAction {
  id: string;
  ncn_id: string;
  response: string;
  status: CorrectiveActionStatus;
  submitted_at: string;
  non_conformance_notices?: {
    ncn_number: string;
    category: string;
    severity: NCNSeverity;
  };
}

interface Application {
  id: string;
  application_number: string;
  organizations?: {
    name: string;
  };
}

const severityConfig: Record<NCNSeverity, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  minor: { label: 'Minor', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },
  major: { label: 'Major', variant: 'secondary', className: 'border-orange-300 text-orange-700 bg-orange-50' },
  critical: { label: 'Critical', variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' },
};

const caStatusConfig: Record<CorrectiveActionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<any> }> = {
  pending: { label: 'Pending Review', variant: 'outline', icon: Clock },
  under_review: { label: 'Under Review', variant: 'secondary', icon: Search },
  accepted: { label: 'Accepted', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
};

const ncnCategories = [
  'Documentation Deficiency',
  'Process Non-Compliance',
  'Ingredient Verification',
  'Facility Standards',
  'Record Keeping',
  'Supplier Compliance',
  'Other',
];

export default function Enforcement() {
  const { user } = useAdminAuthContext();
  const [ncns, setNCNs] = useState<NCN[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('ncns');
  
  // Review dialog state
  const [selectedCA, setSelectedCA] = useState<CorrectiveAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Issue NCN dialog state
  const [isNCNDialogOpen, setIsNCNDialogOpen] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [ncnForm, setNCNForm] = useState({
    application_id: '',
    category: '',
    severity: 'minor' as NCNSeverity,
    description: '',
    due_date: undefined as Date | undefined,
  });

  useEffect(() => {
    fetchData();
  }, [severityFilter]);

  async function fetchData() {
    try {
      // Fetch NCNs
      let ncnQuery = supabase
        .from('non_conformance_notices')
        .select(`
          *,
          certification_applications (
            application_number,
            organizations (
              name
            )
          )
        `)
        .order('issued_at', { ascending: false });

      if (severityFilter && severityFilter !== 'all') {
        ncnQuery = ncnQuery.eq('severity', severityFilter as NCNSeverity);
      }

      const { data: ncnData, error: ncnError } = await ncnQuery;
      if (ncnError) throw ncnError;
      setNCNs(ncnData || []);

      // Fetch Corrective Actions
      const { data: caData, error: caError } = await supabase
        .from('corrective_actions')
        .select(`
          *,
          non_conformance_notices (
            ncn_number,
            category,
            severity
          )
        `)
        .order('submitted_at', { ascending: false });

      if (caError) throw caError;
      setCorrectiveActions(caData || []);
    } catch (error) {
      console.error('Error fetching enforcement data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from('certification_applications')
        .select(`
          id,
          application_number,
          organizations (
            name
          )
        `)
        .in('status', ['submitted', 'under_review', 'awaiting_inspection', 'inspection_complete', 'pending_decision'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  }

  function handleOpenNCNDialog() {
    setNCNForm({
      application_id: '',
      category: '',
      severity: 'minor',
      description: '',
      due_date: addDays(new Date(), 14), // Default 14 days
    });
    fetchApplications();
    setIsNCNDialogOpen(true);
  }

  async function handleIssueNCN() {
    if (!ncnForm.application_id || !ncnForm.category || !ncnForm.description || !ncnForm.due_date || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate NCN number using RPC
      const { data: ncnNumber, error: genError } = await supabase.rpc('generate_ncn_number');
      if (genError) throw genError;

      const { error } = await supabase
        .from('non_conformance_notices')
        .insert({
          ncn_number: ncnNumber,
          application_id: ncnForm.application_id,
          category: ncnForm.category,
          severity: ncnForm.severity,
          description: ncnForm.description,
          due_date: format(ncnForm.due_date, 'yyyy-MM-dd'),
          issued_by: user.id,
          status: 'open',
        });

      if (error) throw error;

      // Log audit
      await supabase.rpc('log_audit', {
        _action: 'ncn_issued',
        _resource_type: 'non_conformance_notices',
        _resource_id: ncnForm.application_id,
        _metadata: {
          ncn_number: ncnNumber,
          severity: ncnForm.severity,
          category: ncnForm.category,
        },
      });

      toast.success(`NCN ${ncnNumber} issued successfully`);
      setIsNCNDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error issuing NCN:', error);
      toast.error('Failed to issue NCN');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredNCNs = ncns.filter(ncn => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      ncn.ncn_number.toLowerCase().includes(search) ||
      ncn.certification_applications?.organizations?.name.toLowerCase().includes(search) ||
      ncn.category.toLowerCase().includes(search)
    );
  });

  const filteredCAs = correctiveActions.filter(ca => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      ca.non_conformance_notices?.ncn_number.toLowerCase().includes(search) ||
      ca.response.toLowerCase().includes(search)
    );
  });

  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { text: `${Math.abs(days)} days overdue`, className: 'text-destructive font-medium' };
    if (days === 0) return { text: 'Due today', className: 'text-amber-600 font-medium' };
    if (days <= 7) return { text: `${days} days left`, className: 'text-amber-500' };
    return { text: `${days} days left`, className: 'text-muted-foreground' };
  };

  async function handleReviewCA(action: 'accepted' | 'rejected') {
    if (!selectedCA) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('corrective_actions')
        .update({
          status: action,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedCA.id);

      if (error) throw error;

      // Update NCN status if accepted
      if (action === 'accepted') {
        await supabase
          .from('non_conformance_notices')
          .update({ status: 'closed' })
          .eq('id', selectedCA.ncn_id);
      }

      // Log the action
      await supabase.rpc('log_audit', {
        _action: action === 'accepted' ? 'corrective_action_accepted' : 'corrective_action_rejected',
        _resource_type: 'corrective_actions',
        _resource_id: selectedCA.id,
        _reason_code: action,
        _metadata: { review_notes: reviewNotes },
      });

      toast.success(action === 'accepted' ? 'Corrective action accepted' : 'Corrective action rejected');
      setSelectedCA(null);
      setReviewNotes('');
      fetchData();
    } catch (error) {
      console.error('Error reviewing corrective action:', error);
      toast.error('Failed to process review');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Enforcement</h1>
            <p className="text-muted-foreground">
              Manage non-conformance notices and corrective actions
            </p>
          </div>
          <Button onClick={handleOpenNCNDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Issue NCN
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {ncns.filter(n => n.status === 'open').length}
              </div>
              <p className="text-sm text-muted-foreground">Open NCNs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {ncns.filter(n => {
                  const days = differenceInDays(new Date(n.due_date), new Date());
                  return n.status === 'open' && days < 0;
                }).length}
              </div>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {correctiveActions.filter(ca => ca.status === 'pending' || ca.status === 'under_review').length}
              </div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {ncns.filter(n => n.status === 'closed').length}
              </div>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ncns" className="gap-2">
              <FileWarning className="h-4 w-4" />
              Non-Conformance Notices
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Corrective Actions
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {activeTab === 'ncns' && (
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NCNs Tab */}
          <TabsContent value="ncns">
            <Card>
              <CardHeader>
                <CardTitle>
                  {filteredNCNs.length} NCN{filteredNCNs.length !== 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : filteredNCNs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-1">No NCNs found</h3>
                    <p className="text-sm">Non-conformance notices will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NCN #</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNCNs.map((ncn) => {
                        const severity = severityConfig[ncn.severity];
                        const dueInfo = getDaysRemaining(ncn.due_date);
                        
                        return (
                          <TableRow key={ncn.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                {ncn.ncn_number}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span>{ncn.certification_applications?.organizations?.name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{ncn.category}</TableCell>
                            <TableCell>
                              <Badge className={severity.className}>
                                {severity.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={ncn.status === 'open' ? 'destructive' : 'secondary'}>
                                {ncn.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className={dueInfo.className}>
                                  {format(new Date(ncn.due_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                              <p className={`text-xs ${dueInfo.className}`}>{dueInfo.text}</p>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon">
                                <ChevronRight className="h-4 w-4" />
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
          </TabsContent>

          {/* Corrective Actions Tab */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>
                  {filteredCAs.length} Corrective Action{filteredCAs.length !== 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : filteredCAs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-1">No corrective actions found</h3>
                    <p className="text-sm">Submitted corrective actions will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NCN #</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Response Summary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCAs.map((ca) => {
                        const status = caStatusConfig[ca.status];
                        const StatusIcon = status.icon;
                        const severity = ca.non_conformance_notices?.severity 
                          ? severityConfig[ca.non_conformance_notices.severity]
                          : null;
                        
                        return (
                          <TableRow key={ca.id}>
                            <TableCell className="font-medium">
                              {ca.non_conformance_notices?.ncn_number || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {ca.non_conformance_notices?.category || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {severity && (
                                <Badge className={severity.className}>
                                  {severity.label}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {ca.response}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(ca.submitted_at), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>
                              {(ca.status === 'pending' || ca.status === 'under_review') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedCA(ca)}
                                >
                                  Review
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedCA} onOpenChange={() => setSelectedCA(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Corrective Action</DialogTitle>
            <DialogDescription>
              Review the submitted corrective action for {selectedCA?.non_conformance_notices?.ncn_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Submitted Response</Label>
              <p className="mt-1 p-3 bg-muted rounded-lg text-sm">
                {selectedCA?.response}
              </p>
            </div>

            <div>
              <Label htmlFor="review-notes">Review Notes</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add your review notes..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedCA(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReviewCA('rejected')}
              disabled={isSubmitting}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => handleReviewCA('accepted')}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue NCN Dialog */}
      <Dialog open={isNCNDialogOpen} onOpenChange={setIsNCNDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Non-Conformance Notice</DialogTitle>
            <DialogDescription>
              Create a new NCN for an application that requires corrective action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Application</Label>
              <Select 
                value={ncnForm.application_id} 
                onValueChange={(value) => setNCNForm({ ...ncnForm, application_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.length === 0 ? (
                    <SelectItem value="none" disabled>No applications available</SelectItem>
                  ) : (
                    applications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.application_number} - {app.organizations?.name || 'Unknown'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={ncnForm.category} 
                onValueChange={(value) => setNCNForm({ ...ncnForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ncnCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <div className="flex gap-2">
                {(['minor', 'major', 'critical'] as NCNSeverity[]).map((sev) => (
                  <Button
                    key={sev}
                    type="button"
                    variant={ncnForm.severity === sev ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      ncnForm.severity === sev && severityConfig[sev].className
                    )}
                    onClick={() => setNCNForm({ ...ncnForm, severity: sev })}
                  >
                    {severityConfig[sev].label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={ncnForm.description}
                onChange={(e) => setNCNForm({ ...ncnForm, description: e.target.value })}
                placeholder="Describe the non-conformance issue..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !ncnForm.due_date && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {ncnForm.due_date 
                      ? format(ncnForm.due_date, 'PPP')
                      : 'Pick a due date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={ncnForm.due_date}
                    onSelect={(date) => setNCNForm({ ...ncnForm, due_date: date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNCNDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssueNCN} disabled={isSubmitting}>
              {isSubmitting ? 'Issuing...' : 'Issue NCN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
