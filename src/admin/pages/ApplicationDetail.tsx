import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Calendar, FileText, Clock, CheckCircle2,
  XCircle, AlertCircle, User, MapPin, Loader2, Save, History,
  Lock, ExternalLink,
  Send, MessageSquare, Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ApplicationChat } from '@/components/application/ApplicationChat';
import { ApplicationTimeline } from '@/components/application/ApplicationTimeline';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ApplicationStatus = Database['public']['Enums']['application_status'];

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
  updated_at: string;
  assigned_officer_id: string | null;
  validity_period: string | null;
  application_fee: number | null;
  organizations?: {
    name: string;
    registration_number: string;
    address: string | null;
    city: string | null;
    country: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  };
}

interface StatusHistory {
  id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_by: string;
  reason: string | null;
  created_at: string;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
  file_size: number | null;
  file_path: string;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'awaiting_inspection', label: 'Inspection Scheduled' },
  { value: 'inspection_complete', label: 'Inspection Completed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

const statusConfig: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  submitted: { label: 'Submitted', variant: 'default' },
  under_review: { label: 'Under Review', variant: 'secondary' },
  awaiting_inspection: { label: 'Inspection Scheduled', variant: 'secondary' },
  inspection_complete: { label: 'Inspection Completed', variant: 'secondary' },
  pending_decision: { label: 'Pending Decision', variant: 'default' },
  pending_approval: { label: 'Pending Approval', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  withdrawn: { label: 'Withdrawn', variant: 'outline' },
  expired: { label: 'Expired', variant: 'outline' },
};

// Maps each application status to its corresponding workflow stage system_code
const STATUS_TO_STAGE: Record<ApplicationStatus, string> = {
  draft: 'SUBMITTED',
  submitted: 'SUBMITTED',
  under_review: 'UNDER_REVIEW',
  awaiting_inspection: 'INSPECTION_SCHEDULED',
  inspection_complete: 'INSPECTION_COMPLETED',
  pending_decision: 'INSPECTION_COMPLETED',
  pending_approval: 'INSPECTION_COMPLETED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
  withdrawn: 'REJECTED',
  expired: 'APPROVED',
};

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [application, setApplication] = useState<Application | null>(null);
  const [clientProfile, setClientProfile] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');

  // Send Message state
  const [messageType, setMessageType] = useState('missing_documents');
  const [messageBody, setMessageBody] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);


  // Workflow permission: track which target statuses the current user can set
  const [allowedStatuses, setAllowedStatuses] = useState<Set<ApplicationStatus>>(new Set());
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  useEffect(() => {
    if (id) {
      fetchApplicationDetails();
    }
  }, [id]);

  async function checkWorkflowPermissions() {
    setIsCheckingPermissions(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const allowed = new Set<ApplicationStatus>();

      // Check permission for each target status by calling the DB function
      await Promise.all(
        STATUS_OPTIONS.map(async (opt) => {
          const stageCode = STATUS_TO_STAGE[opt.value];
          const { data } = await supabase.rpc('can_perform_workflow_action', {
            _user_id: user.id,
            _stage_code: stageCode,
            _permission_code: 'applications.update',
          });
          if (data) allowed.add(opt.value);
        })
      );

      // super_admin also gets approve/reject via applications.manage
      await Promise.all(
        STATUS_OPTIONS.map(async (opt) => {
          if (allowed.has(opt.value)) return; // already allowed
          const stageCode = STATUS_TO_STAGE[opt.value];
          const { data } = await supabase.rpc('can_perform_workflow_action', {
            _user_id: user.id,
            _stage_code: stageCode,
            _permission_code: 'applications.manage',
          });
          if (data) allowed.add(opt.value);
        })
      );

      setAllowedStatuses(allowed);
    } catch (e) {
      console.error('Permission check error:', e);
    } finally {
      setIsCheckingPermissions(false);
    }
  }

  async function fetchApplicationDetails() {
    setIsLoading(true);
    try {
      // Fetch application with organization
      const { data: appData, error: appError } = await supabase
        .from('certification_applications')
        .select(`
          *,
          organizations (
            name,
            registration_number,
            address,
            city,
            country,
            contact_name,
            contact_email,
            contact_phone
          )
        `)
        .eq('id', id)
        .single();

      if (appError) throw appError;
      setApplication(appData);
      setNewStatus(appData.status);

      // Fetch client profile email as fallback when organizations.contact_email is NULL
      if (appData.organization_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('organization_id', appData.organization_id)
          .limit(1)
          .single();
        if (profileData) setClientProfile(profileData);
      }

      // Check workflow permissions for this user
      checkWorkflowPermissions();

      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from('application_status_history')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });

      if (!historyError) {
        setStatusHistory(historyData || []);
      }

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('application_documents')
        .select('id, file_name, document_type, uploaded_at, file_size, file_path')
        .eq('application_id', id)
        .order('uploaded_at', { ascending: false });

      if (!docsError) {
        setDocuments((docsData || []) as Document[]);
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading application',
        description: error.message,
      });
      navigate('/admin/applications');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusUpdate() {
    if (!application || !newStatus || newStatus === application.status) return;

    setIsSaving(true);
    let generatedCertNumber: string | undefined;
    try {
      const { error } = await supabase
        .from('certification_applications')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      // Log audit
      await supabase.rpc('log_audit', {
        _action: 'update_status',
        _resource_type: 'certification_applications',
        _resource_id: application.id,
        _reason_code: statusReason || null,
        _metadata: {
          from_status: application.status,
          to_status: newStatus
        }
      });

      if (newStatus === 'approved') {
        const currentUser = (await supabase.auth.getUser()).data.user;
        const currentUserId = currentUser?.id || '';

        // Dual-control: validate via approval_requests table
        // The recommender (issuer) must be a different person from the approver
        const { data: approvalData } = await supabase
          .from('approval_requests')
          .select('recommender_id')
          .eq('application_id', application.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        let issuerId: string | null = null;

        if (approvalData && approvalData.length > 0) {
          const recommenderId = approvalData[0].recommender_id;
          if (recommenderId && recommenderId !== currentUserId) {
            issuerId = recommenderId;
          }
        }

        // Fallback: use assigned officer if different from current user
        if (!issuerId && application.assigned_officer_id && application.assigned_officer_id !== currentUserId) {
          issuerId = application.assigned_officer_id;
        }

        // Fallback: find another admin who acted on this application
        if (!issuerId) {
          const { data: history } = await supabase
            .from('application_status_history')
            .select('changed_by')
            .eq('application_id', application.id)
            .neq('changed_by', currentUserId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (history && history.length > 0) {
            issuerId = history[0].changed_by;
          }
        }

        if (!issuerId || issuerId === currentUserId) {
          toast({
            variant: 'destructive',
            title: 'Dual-Control Required',
            description: 'Certificate issuance requires a different officer to have recommended this application. Please ensure another officer reviews the application first.',
          });
          setIsSaving(false);
          return;
        }

        // Validate dual approval via server-side function
        const { data: dualValid } = await supabase.rpc('validate_dual_approval', {
          _application_id: application.id,
          _approver_id: currentUserId,
        });

        // Update the approval request status
        if (approvalData && approvalData.length > 0) {
          await supabase
            .from('approval_requests')
            .update({
              approver_id: currentUserId,
              status: 'approved',
              resolved_at: new Date().toISOString(),
            })
            .eq('application_id', application.id)
            .eq('status', 'pending');
        }

        const issueDate = new Date();
        const expiryDate = new Date();
        const validityPeriod = application.validity_period;
        if (validityPeriod === '6_months') {
          expiryDate.setMonth(issueDate.getMonth() + 6);
        } else {
          expiryDate.setFullYear(issueDate.getFullYear() + 1);
        }

        const certNumber = `AHI-ZAM-${issueDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        generatedCertNumber = certNumber;
        const qrHash = crypto.randomUUID();

        const { error: certError } = await supabase.from('certificates').insert({
          application_id: application.id,
          organization_id: application.organization_id,
          certificate_number: certNumber,
          scope: application.scope,
          issue_date: issueDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
          status: 'active',
          approved_by: currentUserId,
          issued_by: issuerId,
          qr_hash: qrHash
        });

        if (certError) throw certError;

        toast({
          title: 'Certificate Generated',
          description: `A new certificate ${certNumber} has been issued.`,
        });
      }

      // Send status notification email
      // Priority 1: organization contact_email, Priority 2: profile email (login email)
      try {
        const contactEmail = application.organizations?.contact_email || clientProfile?.email;
        if (contactEmail) {
          await supabase.functions.invoke('send-status-notification', {
            body: {
              application_id: application.id,
              new_status: newStatus,
              application_number: application.application_number,
              organization_name: application.organizations?.name || 'Unknown',
              contact_email: contactEmail,
              reason: statusReason || undefined,
              ...(newStatus === 'approved' && generatedCertNumber ? { certificate_number: generatedCertNumber } : {}),
            },
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Email not sent',
            description: 'No contact email found for this organization. The client was not notified.',
          });
        }
      } catch (emailError) {
        console.error('Failed to send status notification email:', emailError);
      }

      toast({
        title: 'Status Updated',
        description: `Application status changed to ${newStatus.replace(/_/g, ' ')}.`,
      });

      setStatusReason('');
      fetchApplicationDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating status',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendMessage() {
    if (!application || !messageBody.trim()) return;
    setIsSendingMessage(true);
    try {
      const contactEmail = application.organizations?.contact_email || clientProfile?.email;
      if (!contactEmail) {
        toast({ variant: 'destructive', title: 'No Email Found', description: 'No contact email found for this organization.' });
        return;
      }
      const { error } = await supabase.functions.invoke('send-application-message', {
        body: {
          application_id: application.id,
          application_number: application.application_number,
          organization_name: application.organizations?.name || 'Applicant',
          contact_email: contactEmail,
          message_type: messageType,
          message: messageBody,
        },
      });
      if (error) throw error;
      toast({ title: 'Message Sent', description: 'The applicant has been notified by email.' });
      setMessageBody('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to Send', description: e.message });
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleOpenDocument(doc: Document & { file_path?: string }) {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl((doc as any).file_path || doc.id, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Cannot Open File', description: e.message });
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!application) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Application not found.</p>
          <Button variant="link" asChild className="mt-4">
            <Link to="/admin/applications">Back to Applications</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const status = statusConfig[application.status];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/admin/applications')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-serif">{application.application_number}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {application.organizations?.name || 'Unknown Organization'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="status">Status Update</TabsTrigger>
            <TabsTrigger value="send-message" className="gap-1"><MessageSquare className="h-4 w-4" />Send Message</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1"><MessageSquare className="h-4 w-4" />Chat</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1"><Clock className="h-4 w-4" />Timeline</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <ApplicationChat
              applicationId={application!.id}
              viewerRole="admin"
              participants={[
                {
                  name: clientProfile?.full_name || application?.organizations?.contact_name || application?.organizations?.name || 'Client',
                  role: 'client',
                  subtitle: clientProfile?.email || application?.organizations?.contact_email || undefined,
                },
                {
                  name: 'Certification Team',
                  role: 'admin',
                  subtitle: 'AHIS Officers',
                },
              ]}
            />
          </TabsContent>
          <TabsContent value="timeline" className="space-y-4">
            <ApplicationTimeline applicationId={application!.id} createdAt={application!.created_at} />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Application Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Application Type</Label>
                      <p className="font-medium">{application.application_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Sector</Label>
                      <p className="font-medium">{application.sector}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground text-xs">Scope</Label>
                      <p className="font-medium">{application.scope}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Created</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(application.created_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Submitted</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {application.submitted_at
                          ? format(new Date(application.submitted_at), 'dd MMM yyyy')
                          : 'Not submitted'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organization Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{application.organizations?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Reg: {application.organizations?.registration_number}
                      </p>
                    </div>
                  </div>
                  {application.organizations?.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm">{application.organizations.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {[application.organizations.city, application.organizations.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {application.organizations?.contact_name && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{application.organizations.contact_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {application.organizations.contact_email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {application.organizations.contact_phone}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Status Update Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Application Status</CardTitle>
                <CardDescription>
                  Change the status of this application. Your role determines which transitions are permitted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Current Status</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <Badge variant={status.variant} className="text-sm">
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-status">
                      New Status
                      {isCheckingPermissions && (
                        <span className="ml-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Checking permissions...
                        </span>
                      )}
                    </Label>
                    <TooltipProvider>
                      <Select
                        value={newStatus}
                        onValueChange={(val) => {
                          if (allowedStatuses.has(val as ApplicationStatus) || allowedStatuses.size === 0) {
                            setNewStatus(val as ApplicationStatus);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => {
                            const isAllowed = allowedStatuses.size === 0 || allowedStatuses.has(opt.value);
                            return (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                disabled={!isAllowed}
                                className={!isAllowed ? 'opacity-40 cursor-not-allowed' : ''}
                              >
                                <span className="flex items-center gap-2">
                                  {!isAllowed && <Lock className="h-3 w-3 text-muted-foreground" />}
                                  {opt.label}
                                  {!isAllowed && (
                                    <span className="text-xs text-muted-foreground ml-1">(no permission)</span>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </TooltipProvider>
                    {allowedStatuses.size > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Your role can set {allowedStatuses.size} of {STATUS_OPTIONS.length} statuses. 
                        Locked options require additional permissions.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason / Notes (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide a reason for this status change..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleStatusUpdate}
                  disabled={
                    isSaving ||
                    !newStatus ||
                    newStatus === application.status ||
                    (allowedStatuses.size > 0 && !allowedStatuses.has(newStatus as ApplicationStatus))
                  }
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Update Status
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Send Message Tab */}
          <TabsContent value="send-message">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Message to Applicant
                </CardTitle>
                <CardDescription>
                  Send a direct email to the application owner. The email will be CC'd to admin and operations teams.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-3 rounded-lg border bg-muted/30 text-sm">
                  <p className="text-muted-foreground">
                    <strong>Recipient:</strong>{' '}
                    {application.organizations?.contact_email || clientProfile?.email || (
                      <span className="text-destructive">No email on file</span>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-type">Message Type</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger id="msg-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="missing_documents">Missing Documents</SelectItem>
                      <SelectItem value="additional_info">Additional Information Required</SelectItem>
                      <SelectItem value="ingredient_issue">Ingredient Clarification Needed</SelectItem>
                      <SelectItem value="general">General Update</SelectItem>
                      <SelectItem value="custom">Custom Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-body">Message</Label>
                  <Textarea
                    id="msg-body"
                    rows={6}
                    placeholder="Write your message to the applicant here..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !messageBody.trim()}
                  className="gap-2"
                >
                  {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSendingMessage ? 'Sending...' : 'Send to Applicant'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No status changes recorded yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {statusHistory.map((entry, idx) => (
                      <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="p-2 rounded-full bg-muted">
                          {entry.to_status === 'approved' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : entry.to_status === 'rejected' ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {entry.from_status && (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  {entry.from_status.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {entry.to_status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {entry.reason && (
                            <p className="text-sm text-muted-foreground mt-1">{entry.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Application Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No documents uploaded for this application.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-xs text-muted-foreground">
                            <p>{format(new Date(doc.uploaded_at), 'dd MMM yyyy')}</p>
                            {doc.file_size && (
                              <p>{(doc.file_size / 1024).toFixed(1)} KB</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            onClick={() => handleOpenDocument(doc)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
