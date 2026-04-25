import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Receipt, Clock, Smartphone, Download } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { MoMoPaymentDialog } from "@/components/billing/MoMoPaymentDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number | null;
  sort_order: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  fee_type: string;
  description: string | null;
  amount: number;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  discount: number | null;
  total: number | null;
  notes: string | null;
  recipient_emails: string[] | null;
  issue_date: string | null;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  organizations?: { name: string; contact_email: string | null; address: string | null; city: string | null; country: string | null } | null;
  certification_applications?: { application_number: string } | null;
  certificates?: { certificate_number: string } | null;
}

interface ActivityLog { id: string; action: string; created_at: string; metadata: any; }
interface PaymentAttempt {
  id: string; created_at: string; zynlepay_reference: string | null;
  transaction_reference: string | null; payment_method: string | null;
  amount: number; currency: string; status: string; gateway_response: any;
}

const FEE_LABEL: Record<string, string> = {
  application_fee: 'Application Fee', certification: 'Certification Fee',
  subscription: 'Subscription Fee', renewal: 'Renewal Fee',
  inspection: 'Inspection Fee', other: 'Service Charge',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BillingInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (id) fetchInvoice(); }, [id]);

  const fetchInvoice = async () => {
    try {
      const [invRes, itemsRes, actRes, txRes] = await Promise.all([
        supabase.from('invoices')
          .select('*, organizations(name, contact_email, address, city, country), certification_applications(application_number), certificates(certificate_number)')
          .eq('id', id!).single(),
        supabase.from('invoice_items').select('*').eq('invoice_id', id!).order('sort_order'),
        supabase.from('invoice_activity_log').select('*').eq('invoice_id', id!).order('created_at', { ascending: true }),
        supabase.from('payment_transactions')
          .select('id, created_at, zynlepay_reference, transaction_reference, payment_method, amount, currency, status, gateway_response')
          .eq('invoice_id', id!).order('created_at', { ascending: false }),
      ]);

      if (invRes.error) throw invRes.error;
      setInvoice(invRes.data as any);
      setItems((itemsRes.data as any) || []);
      setActivity(actRes.data || []);
      setAttempts((txRes.data as any) || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoice.id },
      });
      if (error) throw error;
      const b64 = (data as any)?.pdf_base64;
      if (!b64) throw new Error('No PDF returned');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice-${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: e.message });
    } finally {
      setDownloading(false);
    }
  };

  const attemptStatusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      pending: { variant: "secondary", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const c = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const methodLabel = (m: string | null) => {
    if (!m) return "—";
    const map: Record<string, string> = { mtn_momo: "MTN MoMo", airtel_money: "Airtel Money", zamtel_kwacha: "Zamtel Kwacha" };
    return map[m] || m;
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      paid: { variant: "default", label: "Paid" },
      pending: { variant: "secondary", label: "Pending" },
      overdue: { variant: "destructive", label: "Overdue" },
      cancelled: { variant: "outline", label: "Cancelled" },
    };
    const c = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={c.variant} className="text-sm">{c.label}</Badge>;
  };

  if (isLoading) {
    return <ClientLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></ClientLayout>;
  }

  if (!invoice) {
    return (
      <ClientLayout>
        <div className="text-center py-20 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p>Invoice not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/client/billing/invoices">Back to Invoices</Link>
          </Button>
        </div>
      </ClientLayout>
    );
  }

  // Compute display totals (fall back to single-row legacy invoices)
  const lineItems: InvoiceItem[] = items.length > 0
    ? items
    : [{
        id: 'legacy', sort_order: 0, quantity: 1,
        description: invoice.description || FEE_LABEL[invoice.fee_type] || invoice.fee_type,
        unit_price: Number(invoice.amount), line_total: Number(invoice.amount),
      }];
  const subtotal = Number(invoice.subtotal ?? lineItems.reduce((s, it) => s + Number(it.line_total ?? it.quantity * it.unit_price), 0));
  const taxRate = Number(invoice.tax_rate ?? 0);
  const taxAmount = Number(invoice.tax_amount ?? (subtotal * taxRate / 100));
  const discount = Number(invoice.discount ?? 0);
  const grand = Number(invoice.total ?? invoice.amount ?? (subtotal + taxAmount - discount));

  return (
    <ClientLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/client/billing/invoices"><ArrowLeft className="h-4 w-4 mr-1" /> Invoices</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPdf} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </div>

        {/* Main invoice card — modern document look */}
        <Card className="overflow-hidden border-2">
          {/* Top accent bar */}
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />

          <CardContent className="p-8 md:p-12 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1">African Halal Institute</p>
                <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight">INVOICE</h1>
                <p className="text-sm text-muted-foreground mt-2">Plot 123, Cairo Road · Lusaka, Zambia</p>
                <p className="text-sm text-muted-foreground">accounts@africanhalaal.com</p>
              </div>
              <div className="text-left md:text-right space-y-1 min-w-[220px]">
                <div>{statusBadge(invoice.status)}</div>
                <p className="text-2xl font-bold font-mono mt-2">{invoice.invoice_number}</p>
                <p className="text-xs text-muted-foreground">
                  Issued: <span className="font-medium text-foreground">{format(new Date(invoice.issue_date || invoice.created_at), 'dd MMM yyyy')}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Due: <span className="font-medium text-foreground">{format(new Date(invoice.due_date), 'dd MMM yyyy')}</span>
                </p>
              </div>
            </div>

            {/* From / Bill-To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">From</p>
                <p className="font-semibold text-foreground">African Halal Institute</p>
                <p className="text-sm text-muted-foreground">Plot 123, Cairo Road</p>
                <p className="text-sm text-muted-foreground">Lusaka, Zambia</p>
                <p className="text-sm text-muted-foreground">accounts@africanhalaal.com</p>
              </div>
              <div className="md:text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Bill To</p>
                <p className="font-semibold text-foreground">{invoice.organizations?.name || "—"}</p>
                {invoice.organizations?.address && <p className="text-sm text-muted-foreground">{invoice.organizations.address}</p>}
                {(invoice.organizations?.city || invoice.organizations?.country) && (
                  <p className="text-sm text-muted-foreground">
                    {[invoice.organizations?.city, invoice.organizations?.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {invoice.organizations?.contact_email && (
                  <p className="text-sm text-muted-foreground">{invoice.organizations.contact_email}</p>
                )}
                {invoice.certification_applications?.application_number && (
                  <p className="text-xs text-muted-foreground mt-2">Application: <span className="font-mono">{invoice.certification_applications.application_number}</span></p>
                )}
                {invoice.certificates?.certificate_number && (
                  <p className="text-xs text-muted-foreground">Certificate: <span className="font-mono">{invoice.certificates.certificate_number}</span></p>
                )}
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground font-semibold w-[8%]">#</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Description</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center w-[10%]">Qty</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-right w-[18%]">Unit Price</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-right w-[18%]">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((it, idx) => (
                    <TableRow key={it.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{it.description}</TableCell>
                      <TableCell className="text-center">{it.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{invoice.currency} {fmt(it.unit_price)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{invoice.currency} {fmt(Number(it.line_total ?? it.quantity * it.unit_price))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals + Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                {invoice.notes && (
                  <>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                  </>
                )}
              </div>
              <div className="md:justify-self-end w-full md:w-80 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{invoice.currency} {fmt(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                    <span className="font-mono">{invoice.currency} {fmt(taxAmount)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-destructive">−{invoice.currency} {fmt(discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total Due</span>
                  <span className="font-mono text-primary">{invoice.currency} {fmt(grand)}</span>
                </div>
                {invoice.paid_at && (
                  <p className="text-xs text-emerald-600 text-right pt-1">Paid on {format(new Date(invoice.paid_at), 'dd MMM yyyy')}</p>
                )}
              </div>
            </div>

            {(invoice.status === 'pending' || invoice.status === 'overdue') && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">Pay with Mobile Money</p>
                  <p className="text-sm text-muted-foreground">MTN MoMo · Airtel Money · Zamtel Kwacha — instant confirmation.</p>
                </div>
                <Button onClick={() => setPaymentOpen(true)} size="lg">
                  <Smartphone className="h-4 w-4 mr-2" /> Pay {invoice.currency} {fmt(grand)}
                </Button>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-6 text-xs text-muted-foreground text-center space-y-1">
              <p>Thank you for choosing African Halal Institute.</p>
              <p>This is a computer-generated invoice. Reference {invoice.invoice_number} on all payments.</p>
            </div>
          </CardContent>
        </Card>

        {/* Activity + Payment attempts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Payment Attempts</CardTitle>
              <CardDescription>History of mobile money transactions for this invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              {attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No payment attempts yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((a) => {
                      const ref = a.zynlepay_reference || a.transaction_reference || "—";
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                          <TableCell className="text-xs font-mono break-all max-w-[160px]">{ref}</TableCell>
                          <TableCell className="text-sm">{methodLabel(a.payment_method)}</TableCell>
                          <TableCell className="text-sm font-medium whitespace-nowrap">{a.currency} {fmt(a.amount)}</TableCell>
                          <TableCell>{attemptStatusBadge(a.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="mt-1 p-1 rounded-full bg-muted"><Clock className="h-3 w-3 text-muted-foreground" /></div>
                      <div>
                        <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'dd MMM yyyy, HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          <p>Payment confirmation does not constitute certification approval, issuance, or workflow activation. All certification decisions remain exclusively within AHI's internal systems.</p>
        </div>

        {invoice && (
          <MoMoPaymentDialog
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            amount={grand}
            currency={invoice.currency}
            onPaymentComplete={() => fetchInvoice()}
          />
        )}
      </div>
    </ClientLayout>
  );
}
