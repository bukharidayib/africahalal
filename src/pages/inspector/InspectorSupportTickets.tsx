import { useState, useEffect } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Link } from "react-router-dom";
import { Ticket, Plus, Search, Clock, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TicketItem {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: AlertCircle },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: CheckCircle },
};

const priorityConfig: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function InspectorSupportTickets() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === "all" || ticket.status === filter;
    const matchesSearch = searchQuery === "" ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <InspectorLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight text-foreground">Support Tickets</h1>
            <p className="text-muted-foreground mt-1">Manage and track your support requests</p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/inspector/support/tickets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tickets..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in_progress">Active</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-60" /></div><Skeleton className="h-6 w-24" /></div></CardContent></Card>
            ))
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Ticket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Tickets Found</h3>
                <p className="text-muted-foreground mb-4">
                  {filter !== "all" ? "No tickets match your filter criteria." : "You haven't created any support tickets yet."}
                </p>
                <Button asChild><Link to="/inspector/support/tickets/new">Create New Ticket</Link></Button>
              </CardContent>
            </Card>
          ) : (
            filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.open;
              const StatusIcon = status.icon;
              return (
                <Link key={ticket.id} to={`/inspector/support/tickets/${ticket.id}`}>
                  <Card className="hover:border-primary/50 transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{ticket.ticket_number}</h3>
                            <Badge className={status.color}><StatusIcon className="h-3 w-3 mr-1" />{status.label}</Badge>
                            <Badge className={priorityConfig[ticket.priority] || priorityConfig.normal}>
                              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                            </Badge>
                          </div>
                          <p className="font-medium text-foreground truncate">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">{ticket.category} • {format(new Date(ticket.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </InspectorLayout>
  );
}
