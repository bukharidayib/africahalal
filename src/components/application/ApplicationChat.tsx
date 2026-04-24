import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Send, User, Shield, Loader2, Paperclip, FileText, Image as ImageIcon, X, Download, Reply, CornerUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  reply_to_id?: string | null;
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
const TYPING_TIMEOUT = 3500;

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function previewText(m?: Message | null) {
  if (!m) return "";
  if (m.message) return m.message.length > 120 ? m.message.slice(0, 120) + "…" : m.message;
  if (m.attachment_name) return `📎 ${m.attachment_name}`;
  return "(message)";
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingRoles, setTypingRoles] = useState<Record<string, number>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const notifPermRef = useRef<NotificationPermission | "default">("default");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesById = useMemo(() => {
    const map: Record<string, Message> = {};
    for (const m of messages) map[m.id] = m;
    return map;
  }, [messages]);

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

  const scrollToMessage = useCallback((id: string) => {
    const el = document.getElementById(`appmsg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
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

  // Prune stale typing entries
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setTypingRoles((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (now - v < TYPING_TIMEOUT) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
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
      .channel(`app-chat-${applicationId}`, { config: { broadcast: { self: false } } })
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
            // Clear typing indicator for that role on real message
            setTypingRoles((prev) => {
              if (!(m.sender_role in prev)) return prev;
              const { [m.sender_role]: _, ...rest } = prev;
              return rest;
            });

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
      .on("broadcast", { event: "typing" }, (payload) => {
        const role = (payload.payload as any)?.role as string | undefined;
        if (!role || role === viewerRole) return;
        setTypingRoles((prev) => ({ ...prev, [role]: Date.now() }));
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        const role = (payload.payload as any)?.role as string | undefined;
        if (!role) return;
        setTypingRoles((prev) => {
          if (!(role in prev)) return prev;
          const { [role]: _, ...rest } = prev;
          return rest;
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, viewerRole]);

  const broadcastTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      ch.send({ type: "broadcast", event: "typing", payload: { role: viewerRole } });
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      ch.send({ type: "broadcast", event: "stop_typing", payload: { role: viewerRole } });
      lastTypingSentRef.current = 0;
    }, 2500);
  }, [viewerRole]);

  const stopTyping = useCallback(() => {
    const ch = channelRef.current;
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (ch && lastTypingSentRef.current) {
      ch.send({ type: "broadcast", event: "stop_typing", payload: { role: viewerRole } });
    }
    lastTypingSentRef.current = 0;
  }, [viewerRole]);

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

  const startReply = (m: Message) => {
    setReplyTo(m);
    setTimeout(() => textareaRef.current?.focus(), 0);
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
        reply_to_id: replyTo?.id ?? null,
      });
      if (error) throw error;
      setText("");
      setPendingFile(null);
      setReplyTo(null);
      stopTyping();
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

  const typingLabels = Object.keys(typingRoles).filter((r) => r !== viewerRole);

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
                const parent = m.reply_to_id ? messagesById[m.reply_to_id] : null;
                return (
                  <div
                    key={m.id}
                    id={`appmsg-${m.id}`}
                    className={`group flex gap-3 rounded transition-all ${isOwn ? "flex-row-reverse" : ""}`}
                  >
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
                      <div className={`flex items-center gap-2 mb-1 text-xs text-muted-foreground ${isOwn ? "justify-end" : ""}`}>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {isAdmin ? "Admin" : "Client"}
                        </Badge>
                        <span>{format(new Date(m.sent_at), "dd MMM yyyy HH:mm")}</span>
                        <button
                          type="button"
                          onClick={() => startReply(m)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 hover:text-foreground"
                          title="Reply to this message"
                        >
                          <Reply className="h-3 w-3" />
                          Reply
                        </button>
                      </div>
                      <div
                        className={`rounded-lg p-3 inline-block text-left ${
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {parent && (
                          <button
                            type="button"
                            onClick={() => scrollToMessage(parent.id)}
                            className={`mb-2 flex items-start gap-2 w-full text-left rounded border-l-2 px-2 py-1 text-xs ${
                              isOwn
                                ? "border-primary-foreground/60 bg-primary-foreground/10"
                                : "border-primary/60 bg-background/60"
                            }`}
                          >
                            <CornerUpLeft className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-70" />
                            <div className="min-w-0">
                              <div className="font-medium opacity-80 capitalize">
                                {parent.sender_role}
                              </div>
                              <div className="truncate opacity-80">{previewText(parent)}</div>
                            </div>
                          </button>
                        )}
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

              {typingLabels.length > 0 && (
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
                    {typingLabels[0] === "admin" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2 inline-flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground capitalize mr-1">
                      {typingLabels.join(" & ")} typing
                    </span>
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
                    </span>
                  </div>
                </div>
              )}
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
        {replyTo && (
          <div className="flex items-start gap-2 rounded border-l-2 border-primary bg-muted/50 px-2 py-1.5 text-xs">
            <CornerUpLeft className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="font-medium capitalize">Replying to {replyTo.sender_role}</div>
              <div className="truncate text-muted-foreground">{previewText(replyTo)}</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setReplyTo(null)}
              disabled={sending}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
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
            ref={textareaRef}
            placeholder={replyTo ? `Reply to ${replyTo.sender_role}...` : "Type your message..."}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) broadcastTyping();
              else stopTyping();
            }}
            onBlur={stopTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              } else if (e.key === "Escape" && replyTo) {
                setReplyTo(null);
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
