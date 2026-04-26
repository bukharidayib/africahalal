import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  sessionId: string | null;
  userId: string | null;
  senderType: "client" | "admin";
}

/**
 * Tracks typing indicators for a chat session.
 * Returns:
 *  - peerTyping: true when the other side is currently typing
 *  - notifyTyping(): debounced helper to mark current user as typing
 */
export function useTypingIndicator({ sessionId, userId, senderType }: Options) {
  const [peerTyping, setPeerTyping] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to peer typing events
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;

    const channel = supabase
      .channel(`typing-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_typing_indicators", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!alive) return;
          const row: any = payload.new || payload.old;
          if (!row) return;
          if (row.sender_type === senderType) return; // ignore own
          const isFresh = row.is_typing && new Date().getTime() - new Date(row.updated_at).getTime() < 4000;
          setPeerTyping(isFresh);
          if (isFresh) {
            if (clearRef.current) clearTimeout(clearRef.current);
            clearRef.current = setTimeout(() => setPeerTyping(false), 3500);
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
      if (clearRef.current) clearTimeout(clearRef.current);
    };
  }, [sessionId, senderType]);

  const notifyTyping = () => {
    if (!sessionId || !userId) return;
    if (debounceRef.current) return; // throttle to one upsert per ~1.5s
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, 1500);
    void supabase
      .from("chat_typing_indicators" as any)
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          sender_type: senderType,
          is_typing: true,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "session_id,user_id" } as any,
      );
  };

  return { peerTyping, notifyTyping };
}
