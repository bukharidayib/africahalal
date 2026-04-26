import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, FileText, Award, Receipt, MessageSquare, History,
  FolderOpen, DollarSign, Loader2, Eye, Mail, Phone, MapPin, Hash,
  CalendarDays, Pencil, Plus, Download, Send, CheckCircle2, ChevronDown,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IssueCertificateDialog, EligibleApp } from '../components/billing/IssueCertificateDialog';
import { EditValidityDialog } from '../components/billing/EditValidityDialog';
import { CertificateActionsMenu } from '../components/billing/CertificateActionsMenu';
import { InvoiceFormDialog } from '../components/billing/InvoiceFormDialog';

export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [biz, setBiz] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);

  const [apps, setApps] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  // Dialogs
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueFixedApp, setIssueFixedApp] = useState<{ applicationId: string; scope?: string } | null>(null);
  const [editValidity, setEditValidity] = useState<{ id: string; issue_date: string; expiry_date: string; status: string } | null>(null);
  const [invoiceDialog, setInvoiceDialog] = useState<{ open: boolean; invoiceId?: string | null }>({ open: false });
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  useEffect(() => { if (id) void load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: b, error } = await supabase.from('client_businesses').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      if (!b) { toast({ variant: 'destructive', title: 'Not found' }); navigate('/admin/businesses'); return; }
      setBiz(b);

      const [{ data: orgData }, { data: ownerData }] = await Promise.all([
        b.organization_id ? supabase.from('organizations').select('*').eq('id', b.organization_id).maybeSingle() : Promise.resolve({ data: null } as any),
        b.user_id ? supabase.from('profiles').select('*').eq('id', b.user_id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      setOrg(orgData);
      setOwner(ownerData);

      const orgId = b.organization_id;
      const [appsRes, certsRes, invRes, payRes, chatRes, auditRes] = await Promise.all([
        supabase.from('certification_applications')
          .select('id, application_number, status, scope, sector, created_at, submitted_at')
          .eq('business_id', b.id)
          .order('created_at', { ascending: false }),
        orgId ? supabase.from('certificates')
          .select('id, certificate_number, status, issue_date, expiry_date, scope, application_id, created_at')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [] } as any),
        orgId ? supabase.from('invoices')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [] } as any),
        orgId ? supabase.from('payment_transactions')
          .select('*, invoices!inner(invoice_number, organization_id, application_id)')
          .eq('invoices.organization_id', orgId)
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [] } as any),
        b.user_id ? supabase.from('chat_sessions').select('*').eq('user_id', b.user_id).order('started_at', { ascending: false }) : Promise.resolve({ data: [] } as any),
        orgId ? supabase.from('audit_logs')
          .select('*')
          .or(`resource_id.eq.${b.id},resource_id.eq.${orgId}`)
          .order('created_at', { ascending: false })
          .limit(100) : Promise.resolve({ data: [] } as any),
      ]);

      setApps(appsRes.data || []);
      setCerts(certsRes.data || []);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setChats(chatRes.data || []);
      setAudits(auditRes.data || []);

      const appIds = (appsRes.data || []).map((a: any) => a.id);
      if (appIds.length) {
        const [docsRes, msgsRes, histRes] = await Promise.all([
          supabase.from('application_documents').select('*').in('application_id', appIds).order('uploaded_at', { ascending: false }),
          supabase.from('application_messages').select('*').in('application_id', appIds).order('sent_at', { ascending: false }).limit(100),
          supabase.from('application_status_history').select('*').in('application_id', appIds).order('created_at', { ascending: false }),
        ]);
        setDocs(docsRes.data || []);
        setMessages(msgsRes.data || []);
        setStatusHistory(histRes.data || []);
      } else {
        setDocs([]); setMessages([]); setStatusHistory([]);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Derived values
  const eligibleApps: EligibleApp[] = useMemo(() => {
    const certedAppIds = new Set(certs.map((c) => c.application_id).filter(Boolean));
    return apps
      .filter((a) => a.status === 'approved' && !certedAppIds.has(a.id))
      .map((a) => ({ id: a.id, application_number: a.application_number, scope: a.scope }));
  }, [apps, certs]);

  const activeCert = useMemo(() => certs.find((c) => c.status === 'active'), [certs]);
  const subscriptionHistory = useMemo(
    () => [...certs].sort((a, b) => +new Date(b.issue_date) - +new Date(a.issue_date)),
    [certs],
  );

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
  const outstanding = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
  const activeCerts = certs.filter((c) => c.status === 'active').length;

  // Invoice actions
  const downloadInvoicePdf = async (inv: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', { body: { invoice_id: inv.id } });
      if (error) throw error;
      if (data?.pdf_url) window.open(data.pdf_url, '_blank');
      else if (data?.pdf_base64) {
        const blob = await (await fetch(`data:application/pdf;base64,${data.pdf_base64}`)).blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'PDF failed', description: e.message });
    }
  };

  const sendInvoiceEmail = async (inv: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: inv.id, recipient_emails: inv.recipient_emails || [] },
      });
      if (error) throw error;
      toast({ title: 'Invoice sent', description: `Emailed to ${(data?.recipients || []).join(', ') || 'client'}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Send failed', description: e.message });
    }
  };

  const markInvoicePaid = async (inv: any) => {
    try {
      const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', inv.id);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('invoice_activity_log').insert({
        invoice_id: inv.id, action: 'marked_paid_manual', performed_by: user?.id,
      });
      toast({ title: 'Invoice marked paid' });
      void load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e.message });
    }
  };

  const downloadDocument = async (d: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(d.file_path, 600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: e.message });
    }
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }
  if (!biz) return null;

  const orgsForInvoice = org ? [{ id: org.id, name: org.name }] : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/businesses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> {biz.entity_name}
            </h1>
            <p className="text-muted-foreground text-sm">PACRA: <span className="font-mono">{biz.pacra_number}</span></p>
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-2xl font-bold">ZMW {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Outstanding</p><p className={`text-2xl font-bold ${outstanding ? 'text-destructive' : ''}`}>ZMW {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Active Certificates</p><p className="text-2xl font-bold">{activeCerts}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Applications</p><p className="text-2xl font-bold">{apps.length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-2"><Building2 className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2"><CalendarDays className="h-4 w-4" /> Subscription</TabsTrigger>
            <TabsTrigger value="applications" className="gap-2"><FileText className="h-4 w-4" /> Applications</TabsTrigger>
            <TabsTrigger value="certificates" className="gap-2"><Award className="h-4 w-4" /> Certificates</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2"><Receipt className="h-4 w-4" /> Invoices & Payments</TabsTrigger>
            <TabsTrigger value="documents" className="gap-2"><FolderOpen className="h-4 w-4" /> Documents</TabsTrigger>
            <TabsTrigger value="chats" className="gap-2"><MessageSquare className="h-4 w-4" /> Chats</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Field icon={Building2} label="Entity Name" value={biz.entity_name} />
                  <Field icon={Hash} label="PACRA Number" value={biz.pacra_number} />
                  {org && (
                    <>
                      <Separator />
                      <Field icon={Building2} label="Organization" value={org.name} />
                      {org.sector && <Field label="Sector" value={org.sector} />}
                      {org.address && <Field icon={MapPin} label="Address" value={`${org.address}${org.city ? `, ${org.city}` : ''}${org.country ? `, ${org.country}` : ''}`} />}
                      {org.contact_email && <Field icon={Mail} label="Email" value={org.contact_email} />}
                      {org.contact_phone && <Field icon={Phone} label="Phone" value={org.contact_phone} />}
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {owner ? (
                    <>
                      <Field label="Full Name" value={owner.full_name || '—'} />
                      <Field icon={Mail} label="Email" value={owner.email} />
                      <Field label="Account Created" value={format(new Date(biz.created_at), 'dd MMM yyyy')} />
                    </>
                  ) : (
                    <p className="text-muted-foreground">No owner record found.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subscription */}
          <TabsContent value="subscription">
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" /> Current Subscription
                  </CardTitle>
                  {!activeCert && (
                    <Button
                      size="sm"
                      onClick={() => { setIssueFixedApp(null); setIssueOpen(true); }}
                      disabled={eligibleApps.length === 0}
                      title={eligibleApps.length === 0 ? 'Needs an approved application without a certificate' : ''}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Start Subscription
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {!activeCert ? (
                    <p className="text-sm text-muted-foreground">
                      No active subscription. {eligibleApps.length === 0
                        ? 'Approve an application first to issue a certificate.'
                        : 'Click "Start Subscription" to issue a certificate for an approved application.'}
                    </p>
                  ) : (
                    (() => {
                      const daysLeft = Math.ceil((new Date(activeCert.expiry_date).getTime() - Date.now()) / 86400000);
                      const expiringSoon = daysLeft < 30 && daysLeft >= 0;
                      const expired = daysLeft < 0;
                      return (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <Field icon={Award} label="Certificate" value={<span className="font-mono">{activeCert.certificate_number}</span>} />
                            <Field icon={CalendarDays} label="Issued" value={format(new Date(activeCert.issue_date), 'dd MMM yyyy')} />
                            <Field
                              icon={CalendarDays}
                              label="Expires"
                              value={
                                <span className={expired ? 'text-destructive font-semibold' : expiringSoon ? 'text-amber-600 font-semibold' : ''}>
                                  {format(new Date(activeCert.expiry_date), 'dd MMM yyyy')}
                                  {' · '}
                                  {expired ? 'Expired' : `${daysLeft}d left`}
                                </span>
                              }
                            />
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => setEditValidity({
                                id: activeCert.id, issue_date: activeCert.issue_date,
                                expiry_date: activeCert.expiry_date, status: activeCert.status,
                              })}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> Renew / Extend / Manage
                            </Button>
                            <CertificateActionsMenu cert={activeCert} onChanged={load} />
                          </div>
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Subscription History</CardTitle></CardHeader>
                <CardContent>
                  {subscriptionHistory.length === 0 ? <Empty icon={History} text="No subscription history." /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Certificate #</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptionHistory.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono text-xs">{c.certificate_number}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(c.issue_date), 'dd MMM yyyy')} → {format(new Date(c.expiry_date), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={c.status === 'active' ? 'default' : 'outline'} className="capitalize">{c.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <CertificateActionsMenu cert={c} onChanged={load} />
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

          {/* Applications */}
          <TabsContent value="applications">
            <Card><CardContent className="pt-6">
              {apps.length === 0 ? <Empty icon={FileText} text="No applications yet." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>App #</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {apps.map((a) => {
                      const isOpen = expandedApp === a.id;
                      const appDocs = docs.filter((d) => d.application_id === a.id);
                      const appInvoices = invoices.filter((i) => i.application_id === a.id);
                      const appHistory = statusHistory.filter((h) => h.application_id === a.id);
                      const hasCert = certs.some((c) => c.application_id === a.id);
                      return (
                        <>
                          <TableRow key={a.id}>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedApp(isOpen ? null : a.id)}>
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono">{a.application_number}</TableCell>
                            <TableCell className="capitalize">{a.sector || '—'}</TableCell>
                            <TableCell><Badge variant="secondary" className="capitalize">{a.status?.replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell>{a.submitted_at ? format(new Date(a.submitted_at), 'dd MMM yyyy') : '—'}</TableCell>
                            <TableCell className="text-right">
                              {a.status === 'approved' && !hasCert && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-2"
                                  onClick={() => { setIssueFixedApp({ applicationId: a.id, scope: a.scope }); setIssueOpen(true); }}
                                >
                                  <Award className="h-4 w-4 mr-1" /> Issue Certificate
                                </Button>
                              )}
                              <Button asChild variant="ghost" size="sm"><Link to={`/admin/applications/${a.id}`}><Eye className="h-4 w-4" /></Link></Button>
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow key={`${a.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={6} className="p-4">
                                <div className="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Documents ({appDocs.length})</h4>
                                    {appDocs.length === 0 ? <p className="text-xs text-muted-foreground">None uploaded.</p> : (
                                      <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                                        {appDocs.map((d) => (
                                          <li key={d.id} className="flex items-center justify-between gap-2">
                                            <span className="truncate" title={d.file_name}>{d.file_name}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadDocument(d)}>
                                              <Download className="h-3.5 w-3.5" />
                                            </Button>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Invoices ({appInvoices.length})</h4>
                                    {appInvoices.length === 0 ? <p className="text-xs text-muted-foreground">No invoices.</p> : (
                                      <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                                        {appInvoices.map((i) => (
                                          <li key={i.id} className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs">{i.invoice_number}</span>
                                            <Badge variant={i.status === 'paid' ? 'default' : 'secondary'} className="capitalize text-xs">{i.status}</Badge>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Status Timeline</h4>
                                    {appHistory.length === 0 ? <p className="text-xs text-muted-foreground">No transitions.</p> : (
                                      <ul className="space-y-1 text-xs max-h-40 overflow-y-auto">
                                        {appHistory.map((h) => (
                                          <li key={h.id}>
                                            <span className="text-muted-foreground">{format(new Date(h.created_at), 'dd MMM HH:mm')}</span>{' '}
                                            <span className="capitalize">{h.from_status?.replace(/_/g, ' ') || '—'} → <strong>{h.to_status?.replace(/_/g, ' ')}</strong></span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Certificates</CardTitle>
                <Button
                  size="sm"
                  onClick={() => { setIssueFixedApp(null); setIssueOpen(true); }}
                  disabled={eligibleApps.length === 0}
                  title={eligibleApps.length === 0 ? 'Needs an approved application without a certificate' : ''}
                >
                  <Plus className="h-4 w-4 mr-2" /> Issue Certificate
                </Button>
              </CardHeader>
              <CardContent>
                {certs.length === 0 ? <Empty icon={Award} text="No certificates issued." /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Cert #</TableHead><TableHead>Status</TableHead><TableHead>Issue Date</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {certs.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.certificate_number}</TableCell>
                          <TableCell><Badge variant={c.status === 'active' ? 'default' : 'outline'} className="capitalize">{c.status}</Badge></TableCell>
                          <TableCell>{format(new Date(c.issue_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{format(new Date(c.expiry_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditValidity({
                                id: c.id, issue_date: c.issue_date, expiry_date: c.expiry_date, status: c.status,
                              })}
                            >
                              <Pencil className="h-4 w-4 mr-1" /> Validity
                            </Button>
                            <Button asChild variant="ghost" size="sm"><Link to={`/admin/certificates/${c.id}`}><Eye className="h-4 w-4" /></Link></Button>
                            <CertificateActionsMenu cert={c} onChanged={load} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices & Payments */}
          <TabsContent value="invoices">
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Invoices</CardTitle>
                  <Button size="sm" onClick={() => setInvoiceDialog({ open: true, invoiceId: null })} disabled={!org}>
                    <Plus className="h-4 w-4 mr-2" /> New Invoice
                  </Button>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? <Empty icon={Receipt} text="No invoices." /> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Type</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {invoices.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell className="font-mono">{i.invoice_number}</TableCell>
                            <TableCell className="capitalize">{i.fee_type?.replace(/_/g, ' ')}</TableCell>
                            <TableCell className="font-semibold">{i.currency} {Number(i.total || i.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell><Badge variant={i.status === 'paid' ? 'default' : i.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">{i.status}</Badge></TableCell>
                            <TableCell>{i.due_date ? format(new Date(i.due_date), 'dd MMM yyyy') : '—'}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" title="Edit" onClick={() => setInvoiceDialog({ open: true, invoiceId: i.id })}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" title="Download PDF" onClick={() => downloadInvoicePdf(i)}><Download className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" title="Send Email" onClick={() => sendInvoiceEmail(i)}><Send className="h-4 w-4" /></Button>
                              {i.status !== 'paid' && i.status !== 'cancelled' && (
                                <Button variant="ghost" size="icon" title="Mark Paid" onClick={() => markInvoicePaid(i)}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Payment Transactions</CardTitle></CardHeader>
                <CardContent>
                  {payments.length === 0 ? <Empty icon={DollarSign} text="No payments recorded." /> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">{p.transaction_reference || p.zynlepay_reference || '—'}</TableCell>
                            <TableCell className="font-mono">{p.invoices?.invoice_number || '—'}</TableCell>
                            <TableCell className="font-semibold">{p.currency} {Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="capitalize">{p.payment_method?.replace(/_/g, ' ') || '—'}</TableCell>
                            <TableCell><Badge variant={p.status === 'completed' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'}>{p.status}</Badge></TableCell>
                            <TableCell className="text-xs">{format(new Date(p.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            <Card><CardContent className="pt-6">
              {docs.length === 0 ? <Empty icon={FolderOpen} text="No documents uploaded." /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Version</TableHead><TableHead>Uploaded</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {docs.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.file_name}</TableCell>
                        <TableCell className="capitalize">{d.document_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>v{d.version}</TableCell>
                        <TableCell className="text-xs">{format(new Date(d.uploaded_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => downloadDocument(d)}><Download className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          {/* Chats */}
          <TabsContent value="chats">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Application Messages</CardTitle></CardHeader>
                <CardContent>
                  {messages.length === 0 ? <Empty icon={MessageSquare} text="No messages." /> : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {messages.map((m) => (
                        <div key={m.id} className="border-l-2 border-primary/30 pl-3 py-1">
                          <p className="text-xs text-muted-foreground"><span className="capitalize">{m.sender_role}</span> · {format(new Date(m.sent_at), 'dd MMM yyyy HH:mm')}</p>
                          <p className="text-sm">{m.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Live Chat Sessions</CardTitle></CardHeader>
                <CardContent>
                  {chats.length === 0 ? <Empty icon={MessageSquare} text="No chat sessions." /> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Started</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                      <TableBody>
                        {chats.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{format(new Date(c.started_at), 'dd MMM yyyy HH:mm')}</TableCell>
                            <TableCell><Badge variant={c.status === 'active' ? 'default' : 'outline'}>{c.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="ghost" size="sm"><Link to={`/admin/support/chats/${c.id}`}><Eye className="h-4 w-4" /></Link></Button>
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

          {/* History */}
          <TabsContent value="history">
            <Card><CardContent className="pt-6">
              {audits.length === 0 ? <Empty icon={History} text="No audit history." /> : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {audits.map((a) => (
                    <div key={a.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{a.action?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{a.user_email} · {a.user_role} · <span className="capitalize">{a.resource_type?.replace(/_/g, ' ')}</span></p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Issue Certificate Dialog */}
      {issueOpen && org?.id && (
        <IssueCertificateDialog
          open={issueOpen}
          onOpenChange={(o) => { if (!o) { setIssueOpen(false); setIssueFixedApp(null); } }}
          applicationId={issueFixedApp?.applicationId}
          eligibleApps={issueFixedApp ? undefined : eligibleApps}
          organizationId={org.id}
          defaultScope={issueFixedApp?.scope}
          onIssued={() => { setIssueOpen(false); setIssueFixedApp(null); void load(); }}
        />
      )}

      {/* Edit Validity */}
      {editValidity && (
        <EditValidityDialog
          open={!!editValidity}
          onOpenChange={(o) => !o && setEditValidity(null)}
          certificateId={editValidity.id}
          initial={{
            issue_date: editValidity.issue_date,
            expiry_date: editValidity.expiry_date,
            status: editValidity.status,
          }}
          onSaved={() => { setEditValidity(null); void load(); }}
        />
      )}

      {/* Invoice form */}
      {invoiceDialog.open && org && (
        <InvoiceFormDialog
          open={invoiceDialog.open}
          onOpenChange={(o) => !o && setInvoiceDialog({ open: false })}
          orgs={orgsForInvoice}
          invoiceId={invoiceDialog.invoiceId}
          defaultOrgId={org.id}
          onSaved={() => { setInvoiceDialog({ open: false }); void load(); }}
        />
      )}
    </AdminLayout>
  );
}

function Field({ icon: Icon, label, value }: { icon?: any; label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
