import { useEffect, useState } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, Loader2, TicketCheck } from "lucide-react";
import { format } from "date-fns";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  status: string | null;
  priority: string | null;
  created_at: string;
}

export default function SupervisorTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, category, status, priority, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setTickets(data || []);
      setIsLoading(false);
    }
    loadTickets();
  }, []);

  const statusVariant = (s: string | null) => {
    if (s === "resolved") return "default" as const;
    if (s === "open") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Support Tickets</h1>
            <p className="text-muted-foreground mt-1">View and create support tickets</p>
          </div>
          <Button asChild>
            <Link to="/supervisor/support/tickets/new">
              <Plus className="mr-2 h-4 w-4" /> New Ticket
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TicketCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No tickets yet.</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/supervisor/support/tickets/new">Create your first ticket</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link key={ticket.id} to={`/supervisor/support/tickets/${ticket.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {ticket.ticket_number}
                        </span>
                        <Badge variant={statusVariant(ticket.status)}>{ticket.status || "open"}</Badge>
                      </div>
                      <p className="font-medium text-sm">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ticket.category}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "dd MMM yyyy")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SupervisorLayout>
  );
}
