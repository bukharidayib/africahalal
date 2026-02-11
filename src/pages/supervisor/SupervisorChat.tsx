import { useEffect, useState, useRef } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  message: string;
  sender_type: string;
  sender_id: string;
  created_at: string;
}

export default function SupervisorChat() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  async function initChat() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);

    // Find existing active chat session or create one
    const { data: existingSession } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      setSessionId(existingSession.id);
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", existingSession.id)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
    } else {
      const { data: newSession } = await supabase
        .from("chat_sessions")
        .insert({ user_id: session.user.id, status: "active" })
        .select()
        .single();

      if (newSession) setSessionId(newSession.id);
    }
    setIsLoading(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;

    setIsSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      sender_id: userId,
      sender_type: "supervisor",
      message: newMessage.trim(),
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setNewMessage("");
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
      <div className="space-y-6 max-w-3xl mx-auto h-full flex flex-col">
        <div>
          <h1 className="text-2xl font-bold font-serif">Live Chat</h1>
          <p className="text-muted-foreground mt-1">Chat with AHIS support team in real-time</p>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Support Chat
              <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[50vh]">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Start a conversation with our support team</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    msg.sender_id === userId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={2}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
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
