import { useEffect, useRef, useState } from "react";
import { Send, User, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  id: string;
  application_id: string;
  sent_by: string;
  sender_role: string;
  message_type: string;
  message: string;
  sent_at: string;
}

interface Props {
  applicationId: string;
  /** 'admin' or 'client' — current viewer */
  viewerRole: "admin" | "client";
}

export function ApplicationChat({ applicationId, viewerRole }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("application_messages")
        .select("*")
        .eq("application_id", applicationId)
        .order("sent_at", { ascending: true });
      if (!cancelled) {
        if (error) console.error(error);
        setMessages((data as any) || []);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`app-chat-${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "application_messages",
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [applicationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase.from("application_messages") as any).insert({
        application_id: applicationId,
        sent_by: user.id,
        sender_role: viewerRole,
        message_type: "chat",
        message: content,
      });
      if (error) throw error;
      setText("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to send", description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[560px]">
      <CardHeader className="border-b py-3 flex-shrink-0">
        <CardTitle className="text-base">Application Chat</CardTitle>
        <p className="text-xs text-muted-foreground">
          Direct conversation between client and certification team
        </p>
      </CardHeader>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              No messages yet. Start the conversation below.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => {
                const isOwn = m.sender_role === viewerRole;
                const isAdmin = m.sender_role === "admin";
                return (
                  <div key={m.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {isAdmin ? "Admin" : "Client"}
                        </Badge>
                        <span>{format(new Date(m.sent_at), "dd MMM yyyy HH:mm")}</span>
                      </div>
                      <div
                        className={`rounded-lg p-3 inline-block text-left ${
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      )}

      <div className="p-4 border-t flex-shrink-0">
        <div className="flex gap-3">
          <Textarea
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            size="icon"
            className="self-end"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
