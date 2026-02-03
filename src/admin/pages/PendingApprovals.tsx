import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  FileText,
  Building2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ApprovalRequest {
  id: string;
  application_id: string;
  recommender_id: string;
  status: 'pending' | 'approved' | 'rejected';
  recommendation_notes: string | null;
  created_at: string;
  certification_applications?: {
    application_number: string;
    scope: string;
    sector: string;
    organizations?: {
      name: string;
    };
  };
  recommender?: {
    full_name: string;
    email: string;
  };
}

export default function PendingApprovals() {
  const { user } = useAdminAuthContext();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function fetchApprovals() {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          certification_applications (
            application_number,
            scope,
            sector,
            organizations (
              name
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction() {
    if (!selectedApproval || !actionType || !user) return;

    // Validate dual-control: approver cannot be the recommender
    if (selectedApproval.recommender_id === user.id) {
      toast.error('Dual-Control Violation', {
        description: 'You cannot approve your own recommendation.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: actionType === 'approve' ? 'approved' : 'rejected',
          approver_id: user.id,
          approval_notes: notes,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', selectedApproval.id);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_audit', {
        _action: actionType === 'approve' ? 'approval_granted' : 'approval_rejected',
        _resource_type: 'approval_request',
        _resource_id: selectedApproval.id,
        _reason_code: actionType,
        _metadata: { notes, application_id: selectedApproval.application_id },
      });

      toast.success(actionType === 'approve' ? 'Approved Successfully' : 'Rejected', {
        description: actionType === 'approve' 
          ? 'The certificate can now be issued.' 
          : 'The approval request has been rejected.',
      });

      setSelectedApproval(null);
      setActionType(null);
      setNotes('');
      fetchApprovals();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Action Failed', {
        description: 'Unable to process your action. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canApprove = (approval: ApprovalRequest) => {
    return approval.recommender_id !== user?.id;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-serif">Pending Approvals</h1>
          <p className="text-muted-foreground">
            Dual-control approval queue for certificate issuance
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Dual-Control Requirement</p>
                <p className="text-sm text-amber-700">
                  You can only approve requests that were recommended by a different officer.
                  This ensures proper segregation of duties.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approvals List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading approval requests...
          </div>
        ) : approvals.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No pending approvals</h3>
                <p className="text-sm">
                  All approval requests have been processed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {approvals.map((approval) => (
              <Card key={approval.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {approval.certification_applications?.application_number}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {approval.certification_applications?.organizations?.name}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scope</p>
                      <p>{approval.certification_applications?.scope}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sector</p>
                      <p>{approval.certification_applications?.sector}</p>
                    </div>
                  </div>

                  {approval.recommendation_notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recommendation Notes</p>
                      <p className="text-sm mt-1">{approval.recommendation_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Recommended {format(new Date(approval.created_at), 'dd MMM yyyy HH:mm')}
                      </span>
                    </div>

                    {canApprove(approval) ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setActionType('reject');
                          }}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedApproval(approval);
                            setActionType('approve');
                          }}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">
                        Your recommendation - cannot self-approve
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => {
        setSelectedApproval(null);
        setActionType(null);
        setNotes('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Certificate Issuance' : 'Reject Approval Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Confirm approval for this certificate. This action will be logged.'
                : 'Reject this approval request with a reason.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {actionType === 'approve' ? 'Approval Notes (optional)' : 'Rejection Reason (required)'}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === 'approve' 
                  ? 'Add any notes...'
                  : 'Explain the reason for rejection...'}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedApproval(null);
              setActionType(null);
              setNotes('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting || (actionType === 'reject' && !notes.trim())}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {isSubmitting ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
