import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, FileText, Award, Receipt, MessageSquare, History,
  FolderOpen, DollarSign, Loader2, Eye, Mail, Phone, MapPin, Hash,
  CalendarDays, Pencil,
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
import { IssueCertificateDialog } from '../components/billing/IssueCertificateDialog';
import { EditValidityDialog } from '../components/billing/EditValidityDialog';

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
  const [issueFor, setIssueFor] = useState<{ applicationId: string; scope?: string } | null>(null);
  const [editValidity, setEditValidity] = useState<{ id: string; issue_date: string; expiry_date: string; status: string } | null>(null);

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
      const [appsRes, certsRes, invRes, payRes, msgRes, chatRes, auditRes] = await Promise.all([
        supabase.from('certification_applications')
          .select('id, application_number, status, scope, sector, created_at, submitted_at')
          .eq('business_id', b.id)
          .order('created_at', { ascending: false }),
        orgId ? supabase.from('certificates')
          .select('id, certificate_number, status, issue_date, expiry_date, scope')
          .eq('organization_id', orgId)
          .order('issue_date', { ascending: false }) : Promise.resolve({ data: [] } as any),
        orgId ? supabase.from('invoices')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [] } as any),
        orgId ? supabase.from('payment_transactions')
          .select('*, invoices!inner(invoice_number, organization_id)')
          .eq('invoices.organization_id', orgId)
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [] } as any),
        Promise.resolve({ data: [] } as any), // messages — hydrated below
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

      // Documents + messages — depend on app ids
      const appIds = (appsRes.data || []).map((a: any) => a.id);
      if (appIds.length) {
        const [docsRes, msgsRes] = await Promise.all([
          supabase.from('application_documents').select('*').in('application_id', appIds).order('uploaded_at', { ascending: false }),
          supabase.from('application_messages').select('*').in('application_id', appIds).order('sent_at', { ascending: false }).limit(100),
        ]);
        setDocs(docsRes.data || []);
        setMessages(msgsRes.data || []);
      } else {
        setDocs([]);
        setMessages([]);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }
  if (!biz) return null;

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
  const outstanding = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
  const activeCerts = certs.filter((c) => c.status === 'active').length;

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
              <div className="space-y-4">
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

                {/* Manual Subscription / Validity Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" /> Subscription / Validity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const active = certs.find((c) => c.status === 'active');
                      if (!active) {
                        return <p className="text-sm text-muted-foreground">No active certificate. Issue a certificate from the Applications tab to start a subscription.</p>;
                      }
                      const daysLeft = Math.ceil((new Date(active.expiry_date).getTime() - Date.now()) / 86400000);
                      return (
                        <div className="space-y-3 text-sm">
                          <Field icon={Award} label="Active Certificate" value={<span className="font-mono">{active.certificate_number}</span>} />
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Issued" value={format(new Date(active.issue_date), 'dd MMM yyyy')} />
                            <Field label="Expires" value={
                              <span className={daysLeft < 30 ? 'text-destructive font-semibold' : ''}>
                                {format(new Date(active.expiry_date), 'dd MMM yyyy')} ({daysLeft}d)
                              </span>
                            } />
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => setEditValidity({
                              id: active.id, issue_date: active.issue_date,
                              expiry_date: active.expiry_date, status: active.status,
                            })}
                          >
                            <Pencil className="h-4 w-4 mr-2" /> Set / Extend Validity
                          </Button>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications">
            <Card><CardContent className="pt-6">
              {apps.length === 0 ? <Empty icon={FileText} text="No applications yet." /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>App #</TableHead><TableHead>Sector</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {apps.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono">{a.application_number}</TableCell>
                        <TableCell className="capitalize">{a.sector || '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{a.status?.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell>{a.submitted_at ? format(new Date(a.submitted_at), 'dd MMM yyyy') : '—'}</TableCell>
                        <TableCell className="text-right">
                          {a.status === 'approved' && !certs.some((c) => c.application_id === a.id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => setIssueFor({ applicationId: a.id, scope: a.scope })}
                            >
                              <Award className="h-4 w-4 mr-1" /> Issue Certificate
                            </Button>
                          )}
                          <Button asChild variant="ghost" size="sm"><Link to={`/admin/applications/${a.id}`}><Eye className="h-4 w-4" /></Link></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates">
            <Card><CardContent className="pt-6">
              {certs.length === 0 ? <Empty icon={Award} text="No certificates issued." /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Cert #</TableHead><TableHead>Status</TableHead><TableHead>Issue Date</TableHead><TableHead>Expiry</TableHead><TableHead></TableHead></TableRow></TableHeader>
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
                            <Pencil className="h-4 w-4 mr-1" /> Edit Validity
                          </Button>
                          <Button asChild variant="ghost" size="sm"><Link to={`/admin/certificates/${c.id}`}><Eye className="h-4 w-4" /></Link></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          {/* Invoices & Payments */}
          <TabsContent value="invoices">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Invoices</CardTitle></CardHeader>
                <CardContent>
                  {invoices.length === 0 ? <Empty icon={Receipt} text="No invoices." /> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Type</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {invoices.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell className="font-mono">{i.invoice_number}</TableCell>
                            <TableCell className="capitalize">{i.fee_type?.replace(/_/g, ' ')}</TableCell>
                            <TableCell className="font-semibold">{i.currency} {Number(i.total || i.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell><Badge variant={i.status === 'paid' ? 'default' : i.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">{i.status}</Badge></TableCell>
                            <TableCell>{format(new Date(i.due_date), 'dd MMM yyyy')}</TableCell>
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
                  <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Version</TableHead><TableHead>Uploaded</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {docs.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.file_name}</TableCell>
                        <TableCell className="capitalize">{d.document_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>v{d.version}</TableCell>
                        <TableCell className="text-xs">{format(new Date(d.uploaded_at), 'dd MMM yyyy')}</TableCell>
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

      {issueFor && org?.id && (
        <IssueCertificateDialog
          open={!!issueFor}
          onOpenChange={(o) => !o && setIssueFor(null)}
          applicationId={issueFor.applicationId}
          organizationId={org.id}
          defaultScope={issueFor.scope}
          onIssued={() => { setIssueFor(null); void load(); }}
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
