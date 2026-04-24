import { useState, useEffect } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Link } from "react-router-dom";
import { 
    FileText, 
    Clock, 
    CheckCircle, 
    XCircle, 
    AlertCircle,
    Search,
    ChevronRight,
    Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'awaiting_inspection' | 'inspection_complete' | 'pending_decision' | 'approved' | 'rejected' | 'suspended' | 'withdrawn' | 'expired';

const ARCHIVED_STATUSES: ApplicationStatus[] = ['expired', 'rejected', 'withdrawn'];

interface Application {
    id: string;
    application_number: string;
    application_type: string;
    status: ApplicationStatus;
    scope: string;
    sector: string;
    submitted_at: string | null;
    created_at: string;
    organization: {
        name: string;
    } | null;
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string; icon: React.ElementType }> = {
    draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
    submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
    under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Search },
    awaiting_inspection: { label: "Awaiting Inspection", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: Clock },
    inspection_complete: { label: "Inspection Complete", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: CheckCircle },
    pending_decision: { label: "Pending Decision", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: AlertCircle },
    approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
    suspended: { label: "Suspended", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: AlertCircle },
    withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: XCircle },
    expired: { label: "Expired", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: Clock },
};

export default function MyApplications() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const { data, error } = await supabase
                .from('certification_applications')
                .select(`
                    id,
                    application_number,
                    application_type,
                    status,
                    scope,
                    sector,
                    submitted_at,
                    created_at,
                    organization:organizations(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error) {
            console.error('Error fetching applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredApplications = applications.filter(app => {
        const matchesFilter = filter === "all" || 
            (filter === "in_progress" && ['submitted', 'under_review', 'awaiting_inspection', 'inspection_complete', 'pending_decision'].includes(app.status)) ||
            (filter === "completed" && ['approved', 'rejected'].includes(app.status)) ||
            app.status === filter;
        
        const matchesSearch = searchQuery === "" || 
            app.application_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.organization?.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesFilter && matchesSearch;
    });

    return (
        <ClientLayout>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">My Applications</h1>
                        <p className="text-muted-foreground mt-1">Track and manage your certification applications</p>
                    </div>
                    <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link to="/client/apply">
                            <FileText className="mr-2 h-4 w-4" />
                            New Application
                        </Link>
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search applications..." 
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
                        <TabsList className="grid grid-cols-4 sm:grid-cols-4 w-full sm:w-auto">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="draft">Draft</TabsTrigger>
                            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {(() => {
                    const renderCard = (app: Application) => {
                        const status = statusConfig[app.status];
                        const StatusIcon = status.icon;
                        return (
                            <Link key={app.id} to={`/client/applications/${app.id}`}>
                                <Card className="hover:border-primary/50 transition-all duration-200 cursor-pointer group">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                                                        {app.application_number}
                                                    </h3>
                                                    <Badge className={status.color}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-muted-foreground">
                                                    {app.application_type} • {app.sector}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {app.submitted_at
                                                        ? `Submitted: ${format(new Date(app.submitted_at), 'dd MMM yyyy')}`
                                                        : `Created: ${format(new Date(app.created_at), 'dd MMM yyyy')}`}
                                                </p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    };

                    if (loading) {
                        return (
                            <div className="space-y-4">
                                {Array(3).fill(0).map((_, i) => (
                                    <Card key={i}>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-2">
                                                    <Skeleton className="h-5 w-40" />
                                                    <Skeleton className="h-4 w-60" />
                                                </div>
                                                <Skeleton className="h-6 w-24" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        );
                    }

                    const current = filteredApplications.filter(a => !ARCHIVED_STATUSES.includes(a.status));
                    const previous = filteredApplications.filter(a => ARCHIVED_STATUSES.includes(a.status));

                    if (filteredApplications.length === 0) {
                        return (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                    <h3 className="font-semibold text-lg mb-2">No Applications Found</h3>
                                    <p className="text-muted-foreground mb-4">
                                        {filter !== "all" ? "No applications match your filter criteria." : "You haven't submitted any applications yet."}
                                    </p>
                                    <Button asChild>
                                        <Link to="/client/apply">Start New Application</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    }

                    return (
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Current Application {current.length > 0 && `(${current.length})`}
                                </h2>
                                {current.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-6 text-sm text-muted-foreground">
                                            No active application. You can start a new one.
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">{current.map(renderCard)}</div>
                                )}
                            </div>

                            {previous.length > 0 && (
                                <div className="space-y-3">
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        Previous Applications ({previous.length})
                                    </h2>
                                    <div className="space-y-3">{previous.map(renderCard)}</div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </ClientLayout>
    );
}
