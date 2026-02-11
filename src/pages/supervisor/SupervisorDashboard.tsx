import { useEffect, useState } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TicketCheck, MessageSquare, Building2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SupervisorDashboard() {
  const [orgName, setOrgName] = useState<string>("");
  const [ticketCount, setTicketCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get supervisor's assigned organization
      const { data: supRecord } = await supabase
        .from("organization_supervisors")
        .select("organization_id, organizations(name)")
        .eq("supervisor_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (supRecord?.organizations) {
        setOrgName((supRecord.organizations as any).name || "");
      }

      // Get ticket count
      const { count } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      setTicketCount(count || 0);
      setIsLoading(false);
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Supervisor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's your overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Organization</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{orgName || "Not assigned"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
              <TicketCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{ticketCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Total tickets created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/supervisor/support/tickets/new">
                  <TicketCheck className="mr-2 h-4 w-4" /> New Ticket
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/supervisor/support/chat">
                  <MessageSquare className="mr-2 h-4 w-4" /> Live Chat
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SupervisorLayout>
  );
}
