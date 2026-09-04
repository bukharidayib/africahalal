import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Award, Building2, Calendar, CheckCircle2, XCircle, AlertTriangle, Clock,
  QrCode, FileText, ShieldAlert, RefreshCw, Loader2, History, User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminLayout } from '../components/layout/AdminLayout';
import { CertificateDownloader } from '@/components/certificate/CertificateDownloader';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { downloadBrandedQrPng } from '@/components/certificate/BrandedQRCode';

type CertStatus = 'active' | 'suspended' | 'revoked' | 'expired';

const statusMap: Record<CertStatus, { label: string; variant: any; icon: any; tone: string }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2, tone: 'text-green-600' },
  suspended: { label: 'Suspended', variant: 'secondary', icon: Clock, tone: 'text-amber-600' },
  revoked: { label: 'Revoked', variant: 'destructive', icon: XCircle, tone: 'text-red-600' },
  expired: { label: 'Expired', variant: 'outline', icon: AlertTriangle, tone: 'text-muted-foreground' },
};

export default function CertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'suspend' | 'revoke' | 'reinstate' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailForm, setDetailForm] = useState({
    certificate_number: '',
    certificate_business_name: '',
    scope: '',
    certificate_location: '',
    issue_date: '',
    expiry_date: '',
    status: 'active' as CertStatus,
    directory_visible: true,
    notes: '',
  });

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const { data: c, error } = await supabase
        .from('certificates')
        .select(`*, organizations (id, name, registration_number, address, city),
                 certification_applications (id, application_number, sector)`)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!c) { toast.error('Certificate not found'); navigate('/admin/certificates'); return; }
      setCert(c);
      setDetailForm({
        certificate_number: c.certificate_number,
        certificate_business_name: c.certificate_business_name || c.organizations?.name || '',
        scope: c.scope,
        certificate_location: c.certificate_location || c.organizations?.address || c.organizations?.city || '',
        issue_date: c.issue_date,
        expiry_date: c.expiry_date,
        status: c.status as CertStatus,
        directory_visible: (c as any).directory_visible ?? true,
        notes: '',
      });

      const [{ data: hist }, issuer, approver] = await Promise.all([
        supabase.from('certificate_history' as any).select('*').eq('certificate_id', id!).order('created_at', { ascending: false }),
        c.issued_by ? supabase.from('profiles').select('full_name, email').eq('id', c.issued_by).maybeSingle() : Promise.resolve({ data: null } as any),
        c.approved_by ? supabase.from('profiles').select('full_name, email').eq('id', c.approved_by).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);

      // Resolve actor names for history
      const actorIds = Array.from(new Set((hist || []).map((h: any) => h.performed_by).filter(Boolean)));
      let actorMap = new Map<string, any>();
      if (actorIds.length) {
        const { data: actors } = await supabase.from('profiles').select('id, full_name, email').in('id', actorIds);
        actorMap = new Map((actors || []).map((a: any) => [a.id, a]));
      }
      setHistory((hist || []).map((h: any) => ({ ...h, actor: actorMap.get(h.performed_by) })));
      setCert((prev: any) => ({ ...prev, _issuer: issuer.data, _approver: approver.data }));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  }

  async function performAction() {
    if (!cert || !action) return;
    if (action !== 'reinstate' && !reason.trim()) {
      toast.error('Reason is required'); return;
    }
    setSubmitting(true);
    try {
      const newStatus: CertStatus = action === 'suspend' ? 'suspended' : action === 'revoke' ? 'revoked' : 'active';
      const { error: upErr } = await supabase.from('certificates').update({ status: newStatus }).eq('id', cert.id);
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('certificate_history' as any).insert({
        certificate_id: cert.id,
        action,
        reason: reason.trim() || null,
        performed_by: user?.id,
      });

      toast.success(`Certificate ${newStatus}`);
      setAction(null);
      setReason('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update certificate');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDetails() {
    if (!cert) return;
    if (!detailForm.certificate_number.trim() || !detailForm.scope.trim()) {
      toast.error('Certificate number and scope are required');
      return;
    }
    if (new Date(detailForm.expiry_date) <= new Date(detailForm.issue_date)) {
      toast.error('Expiry must be after issue date');
      return;
    }
    setSavingDetails(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('certificates').update({
        certificate_number: detailForm.certificate_number.trim(),
        certificate_business_name: detailForm.certificate_business_name.trim() || null,
        scope: detailForm.scope.trim(),
        certificate_location: detailForm.certificate_location.trim() || null,
        issue_date: detailForm.issue_date,
        expiry_date: detailForm.expiry_date,
        status: detailForm.status,
        directory_visible: detailForm.directory_visible,
      } as any).eq('id', cert.id);
      if (error) throw error;

      await supabase.from('certificate_history' as any).insert({
        certificate_id: cert.id,
        action: 'updated',
        performed_by: user?.id,
        reason: detailForm.notes.trim() || 'Certificate details updated',
      });

      toast.success('Certificate updated');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update certificate');
    } finally {
      setSavingDetails(false);
    }
  }

  const directoryUrl = cert ? `${window.location.origin}/directory?certificate=${encodeURIComponent(cert.certificate_number)}` : '';

  async function downloadQr() {
    if (!cert) return;
    try {
      await downloadBrandedQrPng(directoryUrl, `QR-${cert.certificate_number}.png`);
    } catch (error: any) {
      toast.error(error.message || 'QR code could not be generated');
    }
  }

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }
  if (!cert) return null;

  const status = statusMap[cert.status as CertStatus];
  const StatusIcon = status.icon;
  const daysLeft = differenceInDays(new Date(cert.expiry_date), new Date());
  const isActive = cert.status === 'active';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/certificates')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              {cert.certificate_number}
            </h1>
            <p className="text-muted-foreground text-sm">Certificate details and history</p>
          </div>
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" /> {status.label}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Certificate Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Organization" value={
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{cert.organizations?.name || '—'}</span></div>
                  } />
                  <Field label="Registration #" value={cert.organizations?.registration_number || '—'} />
                  <Field label="Issue Date" value={format(new Date(cert.issue_date), 'dd MMM yyyy')} />
                  <Field label="Expiry Date" value={
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(cert.expiry_date), 'dd MMM yyyy')}</span>
                      {isActive && (
                        <Badge variant={daysLeft < 30 ? 'destructive' : daysLeft < 90 ? 'secondary' : 'outline'} className="text-xs">
                          {daysLeft < 0 ? 'Expired' : `${daysLeft} days left`}
                        </Badge>
                      )}
                    </div>
                  } />
                  <Field label="Sector" value={cert.certification_applications?.sector || '—'} />
                  <Field label="Application" value={
                    cert.application_id ? (
                      <Link to={`/admin/applications/${cert.application_id}`} className="text-primary hover:underline">
                        {cert.certification_applications?.application_number || 'View application'}
                      </Link>
                    ) : '—'
                  } />
                </div>
                <Separator />
                <Field label="Scope of Certification" value={<p className="whitespace-pre-wrap">{cert.scope}</p>} />
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Issued By" value={
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />
                      <span>{cert._issuer?.full_name || cert._issuer?.email || '—'}</span></div>
                  } />
                  <Field label="Approved By" value={
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />
                      <span>{cert._approver?.full_name || cert._approver?.email || '—'}</span></div>
                  } />
                </div>
                <Field label="QR Hash" value={
                  <div className="flex items-center gap-2 text-xs font-mono bg-muted p-2 rounded break-all">
                    <QrCode className="h-4 w-4 flex-shrink-0" /> {cert.qr_hash}
                  </div>
                } />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> History</CardTitle>
                <CardDescription>All actions performed on this certificate</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No history yet.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((h: any) => (
                      <div key={h.id} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <History className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">{h.action.replace(/_/g, ' ')}</p>
                          {h.reason && <p className="text-sm text-muted-foreground mt-0.5">{h.reason}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {h.actor?.full_name || h.actor?.email || 'System'} · {format(new Date(h.created_at), 'dd MMM yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Update Certificate</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Certificate number</Label>
                  <Input value={detailForm.certificate_number} onChange={(e) => setDetailForm((p) => ({ ...p, certificate_number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Business name on certificate</Label>
                  <Input value={detailForm.certificate_business_name} onChange={(e) => setDetailForm((p) => ({ ...p, certificate_business_name: e.target.value }))} placeholder="Name to display on this certificate" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={detailForm.status} onValueChange={(value) => setDetailForm((p) => ({ ...p, status: value as CertStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Issue</Label>
                    <Input type="date" value={detailForm.issue_date} onChange={(e) => setDetailForm((p) => ({ ...p, issue_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry</Label>
                    <Input type="date" value={detailForm.expiry_date} onChange={(e) => setDetailForm((p) => ({ ...p, expiry_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Textarea value={detailForm.scope} onChange={(e) => setDetailForm((p) => ({ ...p, scope: e.target.value }))} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location on certificate</Label>
                    <Textarea value={detailForm.certificate_location} onChange={(e) => setDetailForm((p) => ({ ...p, certificate_location: e.target.value }))} rows={3} placeholder="e.g. East Park Mall" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={detailForm.directory_visible}
                    onChange={(e) => setDetailForm((p) => ({ ...p, directory_visible: e.target.checked }))}
                  />
                  Visible in public directory
                </label>
                <div className="space-y-2">
                  <Label>Update notes</Label>
                  <Textarea value={detailForm.notes} onChange={(e) => setDetailForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
                <Button className="w-full" onClick={saveDetails} disabled={savingDetails}>
                  {savingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <CertificateDownloader
                  certificateId={cert.id}
                  certificateNumber={cert.certificate_number}
                  institutionName={cert.certificate_business_name || cert.organizations?.name || 'Unknown'}
                  scope={cert.scope}
                  location={cert.certificate_location || cert.organizations?.address || cert.organizations?.city || 'Location not specified'}
                  issueDate={format(new Date(cert.issue_date), 'dd MMM yyyy')}
                  expiryDate={format(new Date(cert.expiry_date), 'dd MMM yyyy')}
                  variant="default"
                  className="w-full"
                />
                <Button variant="outline" className="w-full" onClick={downloadQr}>
                  <QrCode className="mr-2 h-4 w-4" /> Download QR
                </Button>
                {cert.status === 'active' && (
                  <>
                    <Button variant="outline" className="w-full" onClick={() => setAction('suspend')}>
                      <Clock className="mr-2 h-4 w-4" /> Suspend
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={() => setAction('revoke')}>
                      <ShieldAlert className="mr-2 h-4 w-4" /> Revoke
                    </Button>
                  </>
                )}
                {cert.status === 'suspended' && (
                  <>
                    <Button className="w-full" onClick={() => setAction('reinstate')}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Reinstate
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={() => setAction('revoke')}>
                      <ShieldAlert className="mr-2 h-4 w-4" /> Revoke
                    </Button>
                  </>
                )}
                {cert.status === 'revoked' && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    This certificate has been revoked and cannot be reinstated.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Verification URL</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground break-all">
                  {directoryUrl}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={!!action} onOpenChange={(o) => { if (!o) { setAction(null); setReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">{action} certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'suspend' && 'This will mark the certificate as suspended. The organization will lose active status until reinstated.'}
              {action === 'revoke' && 'This will permanently revoke the certificate. This action cannot be undone.'}
              {action === 'reinstate' && 'This will restore the certificate to active status.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {action !== 'reinstate' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason for this action..." rows={3} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performAction}
              disabled={submitting}
              className={action === 'revoke' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}
