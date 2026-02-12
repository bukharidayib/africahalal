import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Receipt, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  fee_type: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  organizations?: { name: string; contact_email: string | null; address: string | null; city: string | null; country: string | null } | null;
  certification_applications?: { application_number: string } | null;
  certificates?: { certificate_number: string } | null;
}

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
}

export default function BillingInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const [invRes, actRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, organizations(name, contact_email, address, city, country), certification_applications(application_number), certificates(certificate_number)')
          .eq('id', id!)
          .single(),
        supabase
          .from('invoice_activity_log')
          .select('*')
          .eq('invoice_id', id!)
          .order('created_at', { ascending: true }),
      ]);

      if (invRes.error) throw invRes.error;
      setInvoice(invRes.data as any);
      setActivity(actRes.data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
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

  const feeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      certification: "Certification Fee",
      renewal: "Renewal Fee",
      inspection: "Inspection Fee",
      other: "Service Charge",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
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

  return (
    <ClientLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/client/billing/invoices"><ArrowLeft className="h-4 w-4 mr-1" /> Invoices</Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">
              Invoice {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Created on {format(new Date(invoice.created_at), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge(invoice.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Billed To */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Billed To</p>
                <p className="font-semibold">{invoice.organizations?.name || "—"}</p>
                {invoice.organizations?.address && <p className="text-sm text-muted-foreground">{invoice.organizations.address}</p>}
                {(invoice.organizations?.city || invoice.organizations?.country) && (
                  <p className="text-sm text-muted-foreground">
                    {[invoice.organizations?.city, invoice.organizations?.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {invoice.organizations?.contact_email && (
                  <p className="text-sm text-muted-foreground">{invoice.organizations.contact_email}</p>
                )}
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-3">Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-muted/30">
                    <div>
                      <p className="font-semibold">{feeTypeLabel(invoice.fee_type)}</p>
                      {invoice.description && <p className="text-sm text-muted-foreground">{invoice.description}</p>}
                      {invoice.certification_applications?.application_number && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Application: {invoice.certification_applications.application_number}
                        </p>
                      )}
                      {invoice.certificates?.certificate_number && (
                        <p className="text-xs text-muted-foreground">
                          Certificate: {invoice.certificates.certificate_number}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-bold">
                      ${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {invoice.currency}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Payment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">{format(new Date(invoice.due_date), 'dd MMM yyyy')}</span>
                </div>
                {invoice.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid On</span>
                    <span className="font-medium">{format(new Date(invoice.paid_at), 'dd MMM yyyy')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{invoice.currency}</span>
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {activity.map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className="mt-1 p-1 rounded-full bg-muted">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(a.created_at), 'dd MMM yyyy, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Governance Statement */}
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          <p>
            Payment confirmation does not constitute certification approval, issuance, or workflow activation.
            All certification decisions remain exclusively within AHI's internal systems.
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}
