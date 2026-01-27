import { ClientLayout } from "@/components/layout/ClientLayout";
import {
    BadgeCheck,
    Clock,
    AlertTriangle,
    FileText,
    ArrowRight,
    ChevronRight,
    Calendar,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    History as HistoryIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const alerts = [
    {
        id: 1,
        type: "warning",
        title: "Document Expiry",
        message: "Your 'Supplier Halal Declaration' for Raw Meat is expiring in 15 days.",
        cta: "Renew Now",
        icon: Clock,
    },
    {
        id: 2,
        type: "critical",
        title: "Corrective Action Required",
        message: "Inspection on 20 Jan revealed non-compliance in Sanitation Protocol (NCN-001).",
        cta: "View Issues",
        icon: AlertTriangle,
    },
];

const applications = [
    {
        id: "APP-4492",
        name: "Halal Certification - Main Kitchen",
        status: "In Progress",
        step: "Inspection Scheduled",
        date: "Scheduled for Feb 5, 2026",
        progress: 60,
    },
    {
        id: "APP-4501",
        name: "Product Certification - Sahara Spices",
        status: "Review",
        step: "Shariah Board Review",
        date: "Submitted Jan 22, 2026",
        progress: 85,
    },
];

export default function ClientDashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        active: 0,
        pending: 0,
        action: 0,
        total: 0
    });
    const [apps, setApps] = useState<any[]>([]);
    const [activeCert, setActiveCert] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Apps
            const { data: applications, error: appError } = await supabase
                .from('certification_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (appError) throw appError;
            setApps(applications || []);

            // Fetch Certificates
            const { data: certs, error: certError } = await supabase
                .from('certificates')
                .select('*');

            if (certError) throw certError;

            const active = certs?.find(c => c.status === 'active');
            setActiveCert(active);

            // Fetch CARs for "Action Required"
            const { count: carCount, error: carError } = await supabase
                .from('corrective_actions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            setStats({
                active: certs?.filter(c => c.status === 'active').length || 0,
                pending: applications?.filter(a => a.status === 'submitted').length || 0,
                action: carCount || 0,
                total: certs?.length || 0
            });

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error loading dashboard",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <ClientLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">
                            Marhaban, African Halal
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Here is what's happening with your certification journey today.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button className="bg-primary text-white hover:bg-primary/90 shadow-md transition-all active:scale-95" asChild>
                            <Link to="/client/apply">
                                New Application
                                <FileText className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Urgent Alerts */}
                {alerts.length > 0 && (
                    <div className="grid gap-4">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`flex items-start gap-4 p-4 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${alert.type === 'critical'
                                    ? 'bg-destructive/10 border-destructive'
                                    : 'bg-amber-500/10 border-amber-500'
                                    }`}
                            >
                                <div className={`p-2 rounded-full ${alert.type === 'critical' ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-600'
                                    }`}>
                                    <alert.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-foreground">{alert.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                                </div>
                                <Button variant="outline" size="sm" className="bg-white/50 border-none shadow-sm text-xs font-semibold">
                                    {alert.cta}
                                    <ArrowRight className="ml-2 h-3.3 w-3.3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Certificate Validity */}
                    <Card className="border-none shadow-lg bg-gradient-to-br from-primary to-forest-dark text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ShieldCheck className="h-32 w-32" />
                        </div>
                        {isLoading ? (
                            <div className="p-8 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                            </div>
                        ) : activeCert ? (
                            <>
                                <CardHeader className="relative z-10">
                                    <CardTitle className="text-white/80 text-xs uppercase tracking-widest font-sans font-bold">Active Certificate</CardTitle>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-4xl font-bold">
                                            {Math.max(0, Math.ceil((new Date(activeCert.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                                        </span>
                                        <span className="text-lg text-white/60">Days Left</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10 pt-4">
                                    <p className="text-sm text-white/70">No: <span className="text-white font-mono">{activeCert.certificate_number}</span></p>
                                    <p className="text-xs text-secondary mt-1 font-semibold line-clamp-1">{activeCert.scope}</p>
                                    <Button size="sm" className="w-full mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all font-bold" asChild>
                                        <Link to="/client/certificates">View Certificate</Link>
                                    </Button>
                                </CardContent>
                            </>
                        ) : (
                            <div className="p-8 flex flex-col items-center justify-center text-center">
                                <ShieldCheck className="h-12 w-12 text-white/20 mb-4" />
                                <p className="text-white/60 text-sm">No active certification found.</p>
                                <Button size="sm" className="mt-4 bg-white/20 text-white hover:bg-white/30" asChild>
                                    <Link to="/client/apply">Apply Now</Link>
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Quick Stats */}
                    <Card className="lg:col-span-2 border-none shadow-sm bg-card border">
                        <CardHeader>
                            <CardTitle className="text-lg font-serif">Certification Overview</CardTitle>
                            <CardDescription>System-controlled status summary.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border border-border/50">
                                <BadgeCheck className="h-6 w-6 text-primary mb-2" />
                                <span className="text-2xl font-bold">{isLoading ? "..." : stats.active.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Active</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border border-border/50">
                                <Clock className="h-6 w-6 text-secondary mb-2" />
                                <span className="text-2xl font-bold">{isLoading ? "..." : stats.pending.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Pending</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border border-border/50">
                                <AlertTriangle className="h-6 w-6 text-amber-500 mb-2" />
                                <span className="text-2xl font-bold">{isLoading ? "..." : stats.action.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Action Req.</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 border border-border/50">
                                <HistoryIcon className="h-6 w-6 text-muted-foreground mb-2" />
                                <span className="text-2xl font-bold">{isLoading ? "..." : stats.total.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Issued</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Section: Active Applications & Recent Docs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Ongoing Applications */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold font-serif">Ongoing Applications</h3>
                            <Button variant="link" size="sm" className="text-primary font-bold">View History</Button>
                        </div>
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    <p className="text-xs">Loading applications...</p>
                                </div>
                            ) : apps.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed rounded-xl">
                                    <p className="text-muted-foreground text-sm">No active applications.</p>
                                </div>
                            ) : apps.slice(0, 3).map((app) => (
                                <Card key={app.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all group">
                                    <div className="h-1 bg-muted">
                                        <Progress value={app.status === 'submitted' ? 60 : 100} className="h-full rounded-none" />
                                    </div>
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase font-bold">{app.application_number}</span>
                                                <h4 className="font-bold text-foreground mt-2 group-hover:text-primary transition-colors">{app.application_type}</h4>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(app.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                                    {app.status}
                                                </span>
                                                <div className="flex items-center justify-end mt-4 text-xs font-bold text-muted-foreground">
                                                    Details
                                                    <ChevronRight className="ml-1 h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Quick Documents View */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold font-serif">Compliance Snapshot</h3>
                        <Card className="border-none shadow-md overflow-hidden">
                            <div className="divide-y border-t border-border/50">
                                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-green-500/10 text-green-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium">Process Flow Diagrams</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">VERIFIED</span>
                                </div>
                                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-green-500/10 text-green-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium">Ingredient Manifest</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">VERIFIED</span>
                                </div>
                                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-amber-500/10 text-amber-600">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium">Cleaning Logs - Q1 2026</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">UNDER REVIEW</span>
                                </div>
                                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-destructive/10 text-destructive">
                                            <XCircle className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium">Supplier Audit (External)</span>
                                    </div>
                                    <span className="text-xs text-destructive font-bold font-mono">EXPIRED</span>
                                </div>
                            </div>
                            <div className="p-4 bg-muted/20 text-center">
                                <Button variant="outline" className="w-full text-xs font-bold" asChild>
                                    <Link to="/client/documents">Manage All Documents</Link>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
}
