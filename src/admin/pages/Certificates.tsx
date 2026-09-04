import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  ChevronRight,
  Building2,
  Calendar,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Plus,
  Loader2,
  Pencil,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AdminLayout } from '../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { CertificateDownloader } from '@/components/certificate/CertificateDownloader';
import { downloadBrandedQrPng } from '@/components/certificate/BrandedQRCode';

type CertificateStatus = 'active' | 'suspended' | 'revoked' | 'expired';

interface Certificate {
  id: string;
  certificate_number: string;
  certificate_business_name: string | null;
  certificate_location: string | null;
  application_id: string;
  scope: string;
  issue_date: string;
  expiry_date: string;
  status: CertificateStatus;
  directory_visible?: boolean;
  created_at: string;
  organizations?: {
    name: string;
    registration_number: string;
    address: string | null;
    city: string | null;
  };
}

interface ApplicationOption {
  id: string;
  application_number: string;
  organization_id: string;
  scope: string;
  organizations?: {
    name: string;
    registration_number: string;
    address: string | null;
    city: string | null;
  };
}

const statusConfig: Record<CertificateStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<any> }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  suspended: { label: 'Suspended', variant: 'secondary', icon: Clock },
  revoked: { label: 'Revoked', variant: 'destructive', icon: XCircle },
  expired: { label: 'Expired', variant: 'outline', icon: AlertTriangle },
};

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<Certificate | null>(null);
  const [updating, setUpdating] = useState(false);
  const [eligibleApplications, setEligibleApplications] = useState<ApplicationOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [certForm, setCertForm] = useState({
    application_id: '',
    certificate_number: '',
    scope: '',
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: (() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().slice(0, 10);
    })(),
    directory_visible: true,
    notes: '',
  });
  const [editForm, setEditForm] = useState({
    certificate_number: '',
    certificate_business_name: '',
    scope: '',
    certificate_location: '',
    issue_date: '',
    expiry_date: '',
    status: 'active' as CertificateStatus,
    directory_visible: true,
    notes: '',
  });

  useEffect(() => {
    fetchCertificates();
  }, [statusFilter]);

  useEffect(() => {
    fetchEligibleApplications();
  }, [certificates]);

  async function fetchEligibleApplications() {
    const { data } = await supabase
      .from('certification_applications')
      .select(`
        id,
        application_number,
        organization_id,
        scope,
        organizations (
          name,
          registration_number
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    const activeAppIds = new Set(certificates.filter((c: any) => c.status === 'active').map((c: any) => c.application_id).filter(Boolean));
    setEligibleApplications(((data || []) as any[]).filter((app) => !activeAppIds.has(app.id)) as ApplicationOption[]);
  }

  async function preloadCertificateNumber() {
    const { data } = await supabase.rpc('generate_certificate_number');
    setCertForm((p) => ({ ...p, certificate_number: data ? String(data) : p.certificate_number }));
  }

  function resetCertForm() {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    setCertForm({
      application_id: '',
      certificate_number: '',
      scope: '',
      issue_date: new Date().toISOString().slice(0, 10),
      expiry_date: expiry.toISOString().slice(0, 10),
      directory_visible: true,
      notes: '',
    });
  }

  async function handleCreateCertificate() {
    const app = eligibleApplications.find((item) => item.id === certForm.application_id);
    if (!app || !certForm.certificate_number.trim() || !certForm.scope.trim()) {
      toast.error('Application, certificate number and scope are required');
      return;
    }
    if (new Date(certForm.expiry_date) <= new Date(certForm.issue_date)) {
      toast.error('Expiry must be after issue date');
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: cert, error } = await supabase.from('certificates').insert({
        certificate_number: certForm.certificate_number.trim(),
        application_id: app.id,
        organization_id: app.organization_id,
        scope: certForm.scope.trim(),
        issue_date: certForm.issue_date,
        expiry_date: certForm.expiry_date,
        status: 'active',
        issued_by: user?.id,
        approved_by: user?.id,
        qr_hash: crypto.randomUUID().replace(/-/g, ''),
        manually_issued: true,
        issued_notes: certForm.notes.trim() || null,
        directory_visible: certForm.directory_visible,
      } as any).select('id').single();
      if (error) throw error;

      await supabase.from('certificate_history').insert({
        certificate_id: cert.id,
        action: 'manually_issued',
        performed_by: user?.id,
        reason: certForm.notes.trim() || 'Manual issuance by admin portal',
      } as any);

      toast.success('Certificate issued');
      setCreateOpen(false);
      resetCertForm();
      await fetchCertificates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue certificate');
    } finally {
      setCreating(false);
    }
  }

  function openEditCertificate(cert: Certificate) {
    setEditTarget(cert);
    setEditForm({
      certificate_number: cert.certificate_number,
      certificate_business_name: cert.certificate_business_name || cert.organizations?.name || '',
      scope: cert.scope,
      certificate_location: cert.certificate_location || cert.organizations?.address || cert.organizations?.city || '',
      issue_date: cert.issue_date,
      expiry_date: cert.expiry_date,
      status: cert.status,
      directory_visible: cert.directory_visible ?? true,
      notes: '',
    });
  }

  async function handleUpdateCertificate() {
    if (!editTarget) return;
    if (!editForm.certificate_number.trim() || !editForm.scope.trim()) {
      toast.error('Certificate number and scope are required');
      return;
    }
    if (new Date(editForm.expiry_date) <= new Date(editForm.issue_date)) {
      toast.error('Expiry must be after issue date');
      return;
    }
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('certificates').update({
        certificate_number: editForm.certificate_number.trim(),
        certificate_business_name: editForm.certificate_business_name.trim() || null,
        scope: editForm.scope.trim(),
        certificate_location: editForm.certificate_location.trim() || null,
        issue_date: editForm.issue_date,
        expiry_date: editForm.expiry_date,
        status: editForm.status,
        directory_visible: editForm.directory_visible,
      } as any).eq('id', editTarget.id);
      if (error) throw error;

      await supabase.from('certificate_history').insert({
        certificate_id: editTarget.id,
        action: 'updated',
        performed_by: user?.id,
        reason: editForm.notes.trim() || 'Certificate updated in admin portal',
      } as any);

      toast.success('Certificate updated');
      setEditTarget(null);
      await fetchCertificates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update certificate');
    } finally {
      setUpdating(false);
    }
  }

  async function fetchCertificates() {
    try {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          organizations (
            name,
            registration_number,
            address,
            city
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('invoices').update({ certificate_id: null } as any).eq('certificate_id', deleteTarget.id);
      await supabase.from('certificate_history').delete().eq('certificate_id', deleteTarget.id);
      const { error } = await supabase.from('certificates').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Certificate deleted');
      setDeleteTarget(null);
      await fetchCertificates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const directoryUrl = (cert: Certificate) => `${window.location.origin}/directory?certificate=${encodeURIComponent(cert.certificate_number)}`;

  async function downloadQr(cert: Certificate) {
    try {
      await downloadBrandedQrPng(directoryUrl(cert), `QR-${cert.certificate_number}.png`);
    } catch (error: any) {
      toast.error(error.message || 'QR code could not be generated');
    }
  }

  const filteredCertificates = certificates.filter(cert => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      cert.certificate_number.toLowerCase().includes(search) ||
      cert.organizations?.name.toLowerCase().includes(search) ||
      cert.scope.toLowerCase().includes(search)
    );
  });

  const getExpiryInfo = (expiryDate: string) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { text: 'Expired', className: 'text-destructive' };
    if (days < 30) return { text: `${days} days`, className: 'text-amber-600' };
    if (days < 90) return { text: `${days} days`, className: 'text-amber-500' };
    return { text: `${days} days`, className: 'text-muted-foreground' };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Certificates</h1>
            <p className="text-muted-foreground">
              Manage issued certificates
            </p>
          </div>
          <Button onClick={() => { setCreateOpen(true); void preloadCertificateNumber(); }}>
            <Plus className="h-4 w-4 mr-2" /> Issue Certificate
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {certificates.filter(c => c.status === 'active').length}
              </div>
              <p className="text-sm text-muted-foreground">Active Certificates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {certificates.filter(c => {
                  const days = differenceInDays(new Date(c.expiry_date), new Date());
                  return days >= 0 && days < 90;
                }).length}
              </div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {certificates.filter(c => c.status === 'suspended').length}
              </div>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {certificates.filter(c => c.status === 'revoked').length}
              </div>
              <p className="text-sm text-muted-foreground">Revoked</p>
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
                  placeholder="Search by certificate number, organization..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredCertificates.length} Certificate{filteredCertificates.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading certificates...
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No certificates found</h3>
                <p className="text-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Certificates will appear here once issued'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Directory</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => {
                    const status = statusConfig[cert.status];
                    const StatusIcon = status.icon;
                    const expiryInfo = getExpiryInfo(cert.expiry_date);

                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-muted-foreground" />
                            {cert.certificate_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{cert.organizations?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {cert.scope}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(cert.issue_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className={expiryInfo.className}>
                              {format(new Date(cert.expiry_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cert.directory_visible ?? true ? 'default' : 'outline'} className="gap-1">
                            {cert.directory_visible ?? true ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {cert.directory_visible ?? true ? 'Visible' : 'Hidden'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditCertificate(cert)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Download QR" onClick={() => downloadQr(cert)}>
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete" onClick={() => setDeleteTarget(cert)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <CertificateDownloader
                              certificateId={cert.id}
                              certificateNumber={cert.certificate_number}
                              institutionName={cert.certificate_business_name || cert.organizations?.name || 'Unknown'}
                              scope={cert.scope}
                              location={cert.certificate_location || cert.organizations?.address || cert.organizations?.city || 'Location not specified'}
                              issueDate={format(new Date(cert.issue_date), 'dd MMM yyyy')}
                              expiryDate={format(new Date(cert.expiry_date), 'dd MMM yyyy')}
                              variant="ghost"
                              showIcon={true}
                              label=""
                              className="h-8 w-8 p-0"
                            />
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                              <Link to={`/admin/certificates/${cert.id}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete certificate {deleteTarget?.certificate_number} for{' '}
              {deleteTarget?.organizations?.name || 'this organization'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); void confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open && !updating) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Certificate number *</Label>
                <Input value={editForm.certificate_number} onChange={(e) => setEditForm((p) => ({ ...p, certificate_number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm((p) => ({ ...p, status: value as CertificateStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business name on certificate</Label>
              <Input value={editForm.certificate_business_name} onChange={(e) => setEditForm((p) => ({ ...p, certificate_business_name: e.target.value }))} placeholder="Name to display on this certificate" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Scope *</Label>
                <Textarea value={editForm.scope} onChange={(e) => setEditForm((p) => ({ ...p, scope: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Location on certificate</Label>
                <Textarea value={editForm.certificate_location} onChange={(e) => setEditForm((p) => ({ ...p, certificate_location: e.target.value }))} rows={3} placeholder="e.g. East Park Mall" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Issue date *</Label>
                <Input type="date" value={editForm.issue_date} onChange={(e) => setEditForm((p) => ({ ...p, issue_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Expiry date *</Label>
                <Input type="date" value={editForm.expiry_date} onChange={(e) => setEditForm((p) => ({ ...p, expiry_date: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.directory_visible}
                onChange={(e) => setEditForm((p) => ({ ...p, directory_visible: e.target.checked }))}
              />
              Visible in public directory
            </label>
            <div className="space-y-2">
              <Label>Update notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Reason for update..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={updating}>Cancel</Button>
            <Button onClick={handleUpdateCertificate} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCertForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Approved application *</Label>
              <Select
                value={certForm.application_id}
                onValueChange={(value) => {
                  const app = eligibleApplications.find((item) => item.id === value);
                  setCertForm((p) => ({ ...p, application_id: value, scope: app?.scope || p.scope }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select approved application" /></SelectTrigger>
                <SelectContent>
                  {eligibleApplications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.application_number} - {app.organizations?.name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligibleApplications.length === 0 && <p className="text-xs text-muted-foreground">No approved applications without an active certificate are available.</p>}
            </div>
            <div className="space-y-2">
              <Label>Certificate number *</Label>
              <Input value={certForm.certificate_number} onChange={(e) => setCertForm((p) => ({ ...p, certificate_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Scope *</Label>
              <Textarea value={certForm.scope} onChange={(e) => setCertForm((p) => ({ ...p, scope: e.target.value }))} rows={3} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Issue date *</Label>
                <Input type="date" value={certForm.issue_date} onChange={(e) => setCertForm((p) => ({ ...p, issue_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Expiry date *</Label>
                <Input type="date" value={certForm.expiry_date} onChange={(e) => setCertForm((p) => ({ ...p, expiry_date: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={certForm.directory_visible}
                onChange={(e) => setCertForm((p) => ({ ...p, directory_visible: e.target.checked }))}
              />
              Visible in public directory
            </label>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={certForm.notes} onChange={(e) => setCertForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateCertificate} disabled={creating || eligibleApplications.length === 0}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Issue Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
