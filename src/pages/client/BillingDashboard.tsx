import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Clock, AlertTriangle, CheckCircle2, FileText,
  ArrowRight, Loader2, Receipt, Smartphone
} from "lucide-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { MoMoPaymentDialog } from "@/components/billing/MoMoPaymentDialog";

interface BillingStats {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  invoiceCount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  fee_type: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  created_at: string;
}

export default function BillingDashboard() {
  const [stats, setStats] = useState<BillingStats>({ totalPaid: 0, totalPending: 0, totalOverdue: 0, invoiceCount: 0 });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const all = invoices || [];
      setStats({
        totalPaid: all.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0),
        totalPending: all.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0),
        totalOverdue: all.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0),
        invoiceCount: all.length,
      });
      setRecentInvoices(all.slice(0, 5));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error loading billing data", description: error.message });
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
    return <Badge variant={c.variant}>{c.label}</Badge>;
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

  return (
    <ClientLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">
              Billing & Payments
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              View your invoices, track payments, and manage billing history.
            </p>
          </div>
          <Button asChild>
            <Link to="/client/billing/invoices">
              View All Invoices
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : `ZMW ${stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div>
              <p className="text-xs text-muted-foreground">All time payments received</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : `ZMW ${stats.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : `ZMW ${stats.totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</div>
              <p className="text-xs text-muted-foreground">Past due date</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Receipt className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.invoiceCount}</div>
              <p className="text-xs text-muted-foreground">All time invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Recent Invoices</CardTitle>
            <CardDescription>Your latest billing activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No invoices yet</p>
                <p className="text-xs mt-1">Invoices are generated when you submit a certification application.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{feeTypeLabel(inv.fee_type)}</TableCell>
                      <TableCell className="font-semibold">ZMW {Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{format(new Date(inv.due_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {(inv.status === 'pending' || inv.status === 'overdue') && (
                          <Button variant="default" size="sm" onClick={() => setPayingInvoice(inv)}>
                            <Smartphone className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/client/billing/invoices/${inv.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Governance Statement */}
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          <p>
            The Client Portal provides financial and process transparency without compromising institutional control.
            All certification authority, decision-making, approval, and enforcement powers remain exclusively within AHI's internal systems.
          </p>
        </div>

        {payingInvoice && (
          <MoMoPaymentDialog
            open={!!payingInvoice}
            onOpenChange={(open) => !open && setPayingInvoice(null)}
            invoiceId={payingInvoice.id}
            invoiceNumber={payingInvoice.invoice_number}
            amount={payingInvoice.amount}
            currency={payingInvoice.currency}
            onPaymentComplete={() => {
              setPayingInvoice(null);
              fetchBillingData();
            }}
          />
        )}
      </div>
    </ClientLayout>
  );
}
