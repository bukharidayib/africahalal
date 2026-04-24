import { useEffect, useRef, useState, useCallback } from "react";
import { Send, User, Shield, Loader2, Paperclip, FileText, Image as ImageIcon, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}

interface Participant {
  name: string;
  role: "admin" | "client";
  subtitle?: string;
}

interface Props {
  applicationId: string;
  /** 'admin' or 'client' — current viewer */
  viewerRole: "admin" | "client";
  /** Optional list of participants to show in the header */
  participants?: Participant[];
}

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ApplicationChat({ applicationId, viewerRole, participants = [] }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNearBottomRef = useRef(true);
  const notifPermRef = useRef<NotificationPermission | "default">("default");

  // Track if user is near bottom of chat
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottomRef.current && unreadCount > 0) {
      setUnreadCount(0);
      void markAsRead();
    }
  }, [unreadCount]);

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (force || isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const markAsRead = useCallback(async () => {
    if (!userId) return;
    await (supabase.from("application_message_reads") as any).upsert(
      {
        application_id: applicationId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "application_id,user_id" },
    );
  }, [applicationId, userId]);

  // Request notification permission once
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    notifPermRef.current = Notification.permission;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        notifPermRef.current = p;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (!cancelled) setUserId(user.id);

      const [{ data: msgs }, { data: readRow }] = await Promise.all([
        supabase
          .from("application_messages")
          .select("*")
          .eq("application_id", applicationId)
          .order("sent_at", { ascending: true }),
        (supabase
          .from("application_message_reads") as any)
          .select("last_read_at")
          .eq("application_id", applicationId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      const list = (msgs as Message[]) || [];
      setMessages(list);

      const lastRead = readRow?.last_read_at ? new Date(readRow.last_read_at).getTime() : 0;
      const unread = list.filter(
        (m) => m.sender_role !== viewerRole && new Date(m.sent_at).getTime() > lastRead,
      ).length;
      setUnreadCount(unread);
      setLoading(false);

      // Force scroll on initial load
      setTimeout(() => scrollToBottom(true), 50);

      // If we are mounted and visible, mark as read
      if (unread === 0) await markAsRead();
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

          const isFromOther = m.sender_role !== viewerRole;
          if (isFromOther) {
            // Browser notification
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              notifPermRef.current === "granted" &&
              document.visibilityState !== "visible"
            ) {
              try {
                new Notification(
                  m.sender_role === "admin" ? "New message from Admin" : "New message from Client",
                  {
                    body: m.message?.slice(0, 140) || (m.attachment_name ? `📎 ${m.attachment_name}` : "New attachment"),
                    tag: `app-chat-${applicationId}`,
                  },
                );
              } catch {/* ignore */}
            }

            // Unread / scroll
            setTimeout(() => {
              if (isNearBottomRef.current && document.visibilityState === "visible") {
                scrollToBottom();
                void markAsRead();
              } else {
                setUnreadCount((c) => c + 1);
              }
            }, 50);
          } else {
            // Own message — always scroll
            setTimeout(() => scrollToBottom(true), 50);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, viewerRole]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum size is 10MB." });
      return;
    }
    setPendingFile(f);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && !pendingFile) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      let attachment_type: string | null = null;
      let attachment_size: number | null = null;

      if (pendingFile) {
        const safeName = pendingFile.name.replace(/[^\w.\-]+/g, "_");
        const path = `${applicationId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("application-chat-attachments")
          .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
        if (upErr) throw upErr;
        attachment_url = path;
        attachment_name = pendingFile.name;
        attachment_type = pendingFile.type;
        attachment_size = pendingFile.size;
      }

      const { error } = await (supabase.from("application_messages") as any).insert({
        application_id: applicationId,
        sent_by: user.id,
        sender_role: viewerRole,
        message_type: pendingFile ? "attachment" : "chat",
        message: content || (pendingFile ? `Shared an attachment: ${pendingFile.name}` : ""),
        attachment_url,
        attachment_name,
        attachment_type,
        attachment_size,
      });
      if (error) throw error;
      setText("");
      setPendingFile(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to send", description: e.message });
    } finally {
      setSending(false);
    }
  };

  const downloadAttachment = async (m: Message) => {
    if (!m.attachment_url) return;
    try {
      const { data, error } = await supabase.storage
        .from("application-chat-attachments")
        .createSignedUrl(m.attachment_url, 60 * 10);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Download failed", description: e.message });
    }
  };

  const [signedThumbs, setSignedThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    const imgs = messages.filter((m) => m.attachment_url && m.attachment_type?.startsWith("image/") && !signedThumbs[m.id]);
    if (imgs.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const m of imgs) {
        const { data } = await supabase.storage
          .from("application-chat-attachments")
          .createSignedUrl(m.attachment_url!, 60 * 30);
        if (data?.signedUrl) updates[m.id] = data.signedUrl;
      }
      if (Object.keys(updates).length) setSignedThumbs((s) => ({ ...s, ...updates }));
    })();
  }, [messages]);

  return (
    <Card className="flex flex-col h-[620px]">
      <CardHeader className="border-b py-3 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Application Chat
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
        </div>

        {participants.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {participants.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-full border bg-muted/40 pl-1 pr-3 py-1"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback
                    className={
                      p.role === "admin"
                        ? "bg-primary text-primary-foreground text-[10px]"
                        : "bg-secondary text-secondary-foreground text-[10px]"
                    }
                  >
                    {p.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="text-xs font-medium">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.role === "admin" ? "Certification Team" : "Client"}
                    {p.subtitle ? ` · ${p.subtitle}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4"
        >
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              No messages yet. Start the conversation below.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => {
                const isOwn = m.sender_role === viewerRole;
                const isAdmin = m.sender_role === "admin";
                const isImage = m.attachment_type?.startsWith("image/");
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
                        {m.message && (
                          <p className="text-sm whitespace-pre-wrap mb-2 last:mb-0">{m.message}</p>
                        )}
                        {m.attachment_url && (
                          <div className="mt-1">
                            {isImage && signedThumbs[m.id] ? (
                              <button
                                type="button"
                                onClick={() => downloadAttachment(m)}
                                className="block rounded overflow-hidden border bg-background"
                              >
                                <img
                                  src={signedThumbs[m.id]}
                                  alt={m.attachment_name || "attachment"}
                                  className="max-h-48 max-w-full object-contain"
                                />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => downloadAttachment(m)}
                                className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs ${
                                  isOwn ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-background"
                                }`}
                              >
                                {isImage ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                <span className="truncate max-w-[180px]">{m.attachment_name}</span>
                                <span className="opacity-70">{formatBytes(m.attachment_size)}</span>
                                <Download className="h-3 w-3 ml-1" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {unreadCount > 0 && (
        <button
          type="button"
          onClick={() => {
            scrollToBottom(true);
            setUnreadCount(0);
            void markAsRead();
          }}
          className="mx-4 mb-2 text-xs rounded-full bg-primary text-primary-foreground px-3 py-1 self-center hover:opacity-90"
        >
          ↓ {unreadCount} new message{unreadCount > 1 ? "s" : ""} — jump to latest
        </button>
      )}

      <div className="p-4 border-t flex-shrink-0 space-y-2">
        {pendingFile && (
          <div className="flex items-center gap-2 rounded border bg-muted/40 px-2 py-1.5 text-xs">
            {pendingFile.type.startsWith("image/") ? (
              <ImageIcon className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="truncate flex-1">{pendingFile.name}</span>
            <span className="text-muted-foreground">{formatBytes(pendingFile.size)}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setPendingFile(null)}
              disabled={sending}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handlePickFile}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="self-end"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="Attach file (PDF or image, max 10MB)"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
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
            disabled={sending || (!text.trim() && !pendingFile)}
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
