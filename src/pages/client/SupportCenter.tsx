import { useState, useEffect } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Link } from "react-router-dom";
import { 
    Ticket, 
    HelpCircle, 
    MessageCircle, 
    Phone, 
    Mail,
    ChevronRight,
    Clock,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Ticket {
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    category: string;
    created_at: string;
}

const supportCards = [
    {
        title: "Support Tickets",
        description: "Submit and track your support requests",
        icon: Ticket,
        href: "/client/support/tickets",
        color: "bg-blue-500"
    },
    {
        title: "FAQ",
        description: "Find quick answers to common questions",
        icon: HelpCircle,
        href: "/client/support/faq",
        color: "bg-green-500"
    },
    {
        title: "Live Chat",
        description: "Chat with our experts in real-time",
        icon: MessageCircle,
        href: "/client/support/chat",
        color: "bg-purple-500"
    }
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    open: { label: "Open", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
    in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: AlertCircle },
    resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
    closed: { label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: CheckCircle },
};

export default function SupportCenter() {
    const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentTickets();
    }, []);

    const fetchRecentTickets = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('support_tickets')
                .select('id, ticket_number, subject, status, category, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            setRecentTickets(data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ClientLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">Support Center</h1>
                    <p className="text-muted-foreground mt-2">How can we help you today?</p>
                </div>

                {/* Support Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    {supportCards.map((card) => (
                        <Link key={card.title} to={card.href}>
                            <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
                                <CardContent className="p-6 text-center">
                                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${card.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <card.icon className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{card.title}</h3>
                                    <p className="text-sm text-muted-foreground">{card.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Recent Tickets */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            Recent Tickets
                        </CardTitle>
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/client/support/tickets">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-5 w-20" />
                                    </div>
                                ))}
                            </div>
                        ) : recentTickets.length === 0 ? (
                            <div className="text-center py-8">
                                <Ticket className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">No support tickets yet</p>
                                <Button asChild className="mt-4">
                                    <Link to="/client/support/tickets/new">Create Your First Ticket</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {recentTickets.map((ticket) => {
                                    const status = statusConfig[ticket.status] || statusConfig.open;
                                    const StatusIcon = status.icon;
                                    return (
                                        <Link 
                                            key={ticket.id} 
                                            to={`/client/support/tickets/${ticket.id}`}
                                            className="flex items-center justify-between py-4 hover:bg-muted/50 -mx-6 px-6 transition-colors group"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                        {ticket.ticket_number}
                                                    </span>
                                                    <Badge className={status.color}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')}
                                                </p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Email Support</p>
                                    <a href="mailto:support@africanhalaal.com" className="font-medium text-foreground hover:text-primary transition-colors">
                                        support@africanhalaal.com
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Phone Support</p>
                                    <a href="tel:+260979098880" className="font-medium text-foreground hover:text-primary transition-colors">
                                        +260 97 9098880
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                <strong>Business Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM (CAT)
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ClientLayout>
    );
}
