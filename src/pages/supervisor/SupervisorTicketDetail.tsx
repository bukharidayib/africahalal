import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

export default function SupervisorTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (id) loadTicket();
  }, [id]);

  async function loadTicket() {
    const { data: ticketData } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    setTicket(ticketData);

    const { data: msgs } = await supabase
      .from("ticket_messages")
      .select("id, message, sender_type, created_at")
      .eq("ticket_id", id!)
      .order("created_at", { ascending: true });

    setMessages(msgs || []);
    setIsLoading(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: id!,
      sender_id: session.user.id,
      sender_type: "supervisor",
      message: newMessage.trim(),
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setNewMessage("");
      loadTicket();
    }
    setIsSending(false);
  }

  if (isLoading) {
    return (
      <SupervisorLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/supervisor/support/tickets"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-serif">{ticket?.ticket_number}</h1>
              <Badge variant="secondary">{ticket?.status || "open"}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{ticket?.subject}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === "supervisor" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.sender_type === "supervisor"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.sender_type === "supervisor" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {format(new Date(msg.created_at), "dd MMM, HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Textarea
                placeholder="Type your reply..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button type="submit" disabled={isSending || !newMessage.trim()} size="icon" className="self-end">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
