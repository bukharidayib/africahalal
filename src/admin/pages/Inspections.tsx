import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Search, 
  ChevronRight,
  Building2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface Inspection {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: InspectionStatus;
  created_at: string;
  certification_applications?: {
    application_number: string;
    organizations?: {
      name: string;
    };
  };
  inspectors?: {
    inspector_number: string;
    profiles?: {
      full_name: string;
    };
  };
}

interface Application {
  id: string;
  application_number: string;
  organizations?: {
    name: string;
  };
}

interface Inspector {
  id: string;
  inspector_number: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

const statusConfig: Record<InspectionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<any> }> = {
  scheduled: { label: 'Scheduled', variant: 'outline', icon: Calendar },
  in_progress: { label: 'In Progress', variant: 'default', icon: Play },
  completed: { label: 'Completed', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

export default function Inspections() {
  const { user } = useAdminAuthContext();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Schedule dialog state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [availableApplications, setAvailableApplications] = useState<Application[]>([]);
  const [activeInspectors, setActiveInspectors] = useState<Inspector[]>([]);
  const [scheduleForm, setScheduleForm] = useState({
    application_id: '',
    inspector_id: '',
    scheduled_date: undefined as Date | undefined,
    scheduled_time: '09:00',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, [statusFilter]);

  async function fetchInspections() {
    try {
      let query = supabase
        .from('inspections')
        .select(`
          *,
          certification_applications (
            application_number,
            organizations (
              name
            )
          ),
          inspectors (
            inspector_number
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDialogData() {
    try {
      // Fetch applications awaiting inspection or submitted
      const { data: apps, error: appsError } = await supabase
        .from('certification_applications')
        .select(`
          id,
          application_number,
          organizations (
            name
          )
        `)
        .in('status', ['submitted', 'under_review', 'awaiting_inspection'])
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;
      setAvailableApplications(apps || []);

      // Fetch active inspectors
      const { data: inspData, error: inspError } = await supabase
        .from('inspectors')
        .select('id, inspector_number, user_id')
        .eq('is_active', true);

      if (inspError) throw inspError;

      // Fetch profiles for inspectors
      if (inspData && inspData.length > 0) {
        const userIds = inspData.map(i => i.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const inspectorsWithProfiles = inspData.map(i => ({
          ...i,
          profiles: profileMap.get(i.user_id),
        }));
        setActiveInspectors(inspectorsWithProfiles);
      } else {
        setActiveInspectors([]);
      }
    } catch (error) {
      console.error('Error fetching dialog data:', error);
      toast.error('Failed to load data');
    }
  }

  function handleOpenScheduleDialog() {
    setScheduleForm({
      application_id: '',
      inspector_id: '',
      scheduled_date: undefined,
      scheduled_time: '09:00',
    });
    fetchDialogData();
    setIsScheduleOpen(true);
  }

  async function handleScheduleInspection() {
    if (!scheduleForm.application_id || !scheduleForm.inspector_id || !scheduleForm.scheduled_date || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .insert({
          application_id: scheduleForm.application_id,
          inspector_id: scheduleForm.inspector_id,
          scheduled_date: format(scheduleForm.scheduled_date, 'yyyy-MM-dd'),
          scheduled_time: scheduleForm.scheduled_time,
          status: 'scheduled',
          assigned_by: user.id,
        });

      if (error) throw error;

      // Update application status
      await supabase
        .from('certification_applications')
        .update({ status: 'awaiting_inspection' })
        .eq('id', scheduleForm.application_id);

      // Log audit
      await supabase.rpc('log_audit', {
        _action: 'inspection_scheduled',
        _resource_type: 'inspections',
        _resource_id: scheduleForm.application_id,
        _metadata: { 
          inspector_id: scheduleForm.inspector_id,
          scheduled_date: format(scheduleForm.scheduled_date, 'yyyy-MM-dd'),
        },
      });

      toast.success('Inspection scheduled successfully');
      setIsScheduleOpen(false);
      fetchInspections();
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      toast.error('Failed to schedule inspection');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredInspections = inspections.filter(insp => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      insp.certification_applications?.application_number.toLowerCase().includes(search) ||
      insp.certification_applications?.organizations?.name.toLowerCase().includes(search) ||
      insp.inspectors?.inspector_number.toLowerCase().includes(search)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Inspections</h1>
            <p className="text-muted-foreground">
              Manage site inspections and audits
            </p>
          </div>
          <Button onClick={handleOpenScheduleDialog}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Schedule Inspection
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {inspections.filter(i => i.status === 'scheduled').length}
              </div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {inspections.filter(i => i.status === 'in_progress').length}
              </div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {inspections.filter(i => i.status === 'completed').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {inspections.filter(i => i.status === 'cancelled').length}
              </div>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by application, organization, inspector..."
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
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inspections Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredInspections.length} Inspection{filteredInspections.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading inspections...
              </div>
            ) : filteredInspections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No inspections found</h3>
                <p className="text-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Inspections will appear here once scheduled'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.map((insp) => {
                    const status = statusConfig[insp.status];
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={insp.id}>
                        <TableCell className="font-medium">
                          {insp.certification_applications?.application_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{insp.certification_applications?.organizations?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{insp.inspectors?.inspector_number || 'Unassigned'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(insp.scheduled_date), 'dd MMM yyyy')}
                            {insp.scheduled_time && (
                              <span className="text-muted-foreground">
                                @ {insp.scheduled_time}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/admin/inspections/${insp.id}`}>
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

      {/* Schedule Inspection Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Inspection</DialogTitle>
            <DialogDescription>
              Assign an inspector to conduct a site audit for an application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Application</Label>
              <Select 
                value={scheduleForm.application_id} 
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, application_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an application" />
                </SelectTrigger>
                <SelectContent>
                  {availableApplications.length === 0 ? (
                    <SelectItem value="none" disabled>No applications available</SelectItem>
                  ) : (
                    availableApplications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.application_number} - {app.organizations?.name || 'Unknown'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Inspector</Label>
              <Select 
                value={scheduleForm.inspector_id} 
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, inspector_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an inspector" />
                </SelectTrigger>
                <SelectContent>
                  {activeInspectors.length === 0 ? (
                    <SelectItem value="none" disabled>No active inspectors</SelectItem>
                  ) : (
                    activeInspectors.map((insp) => (
                      <SelectItem key={insp.id} value={insp.id}>
                        {insp.inspector_number} - {insp.profiles?.full_name || 'Unknown'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleForm.scheduled_date && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {scheduleForm.scheduled_date 
                      ? format(scheduleForm.scheduled_date, 'PPP')
                      : 'Pick a date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={scheduleForm.scheduled_date}
                    onSelect={(date) => setScheduleForm({ ...scheduleForm, scheduled_date: date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduleForm.scheduled_time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleInspection} disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Inspection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
