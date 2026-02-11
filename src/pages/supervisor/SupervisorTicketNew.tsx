import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const CATEGORIES = [
  "Inspection Issue",
  "Documentation",
  "Technical Support",
  "Compliance Question",
  "Other",
];

export default function SupervisorTicketNew() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !category || !message) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Generate ticket number
      const { data: ticketNumber } = await supabase.rpc("generate_ticket_number");

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: session.user.id,
          ticket_number: ticketNumber || `TKT-${Date.now()}`,
          subject,
          category,
          status: "open",
          priority: "medium",
        })
        .select()
        .single();

      if (error) throw error;

      // Add the initial message
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: session.user.id,
        sender_type: "supervisor",
        message,
      });

      toast({ title: "Ticket Created", description: `Ticket ${ticket.ticket_number} has been created.` });
      navigate("/supervisor/support/tickets");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/supervisor/support/tickets"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-serif">New Support Ticket</h1>
            <p className="text-muted-foreground mt-1">Describe your issue and we'll get back to you</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Brief description of the issue" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Describe your issue in detail..." value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Ticket
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
