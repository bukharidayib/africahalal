import { useState, useEffect, useRef } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Link } from "react-router-dom";
import { 
    ArrowLeft, 
    Send, 
    User, 
    Headphones,
    Loader2,
    MessageCircle,
    Phone,
    Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface ChatMessage {
    id: string;
    sender_id: string;
    sender_type: string;
    message: string;
    created_at: string;
}

export default function SupportChat() {
    const { toast } = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const { peerTyping, notifyTyping } = useTypingIndicator({ sessionId, userId, senderType: "client" });

    useEffect(() => {
        initializeChat();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        if (sessionId && messages.length) {
            supabase.from('chat_sessions').update({ client_last_read_at: new Date().toISOString() }).eq('id', sessionId);
        }
    }, [messages, sessionId]);

    // Set up realtime subscription
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase
            .channel(`chat-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `session_id=eq.${sessionId}`
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    // Only add if not already in messages (avoid duplicates from own sends)
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    const initializeChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    variant: "destructive",
                    title: "Authentication Required",
                    description: "Please sign in to use live chat."
                });
                return;
            }
            setUserId(user.id);

            // Check for existing active session
            const { data: existingSession } = await supabase
                .from('chat_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

            if (existingSession) {
                setSessionId(existingSession.id);
                // Fetch existing messages
                const { data: msgs } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('session_id', existingSession.id)
                    .order('created_at', { ascending: true });
                setMessages(msgs || []);
            } else {
                // Create new session
                const { data: newSession, error } = await supabase
                    .from('chat_sessions')
                    .insert({
                        user_id: user.id,
                        status: 'active'
                    })
                    .select('id')
                    .single();

                if (error) throw error;
                setSessionId(newSession.id);

                // Add welcome message
                const welcomeMsg: ChatMessage = {
                    id: 'welcome',
                    sender_id: 'system',
                    sender_type: 'support',
                    message: "Welcome to African Halal Institute live chat! Our support team is here to help. How can we assist you today?",
                    created_at: new Date().toISOString()
                };
                setMessages([welcomeMsg]);
            }
        } catch (error) {
            console.error('Error initializing chat:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to initialize chat session."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !userId || !sessionId) return;

        setSending(true);
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .insert({
                    session_id: sessionId,
                    sender_id: userId,
                    sender_type: 'client',
                    message: newMessage.trim()
                })
                .select()
                .single();

            if (error) throw error;

            // Optimistically add to messages
            setMessages(prev => [...prev, data]);
            setNewMessage("");
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to send message."
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <ClientLayout>
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div>
                    <Link to="/client/support" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Support Center
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">Live Chat</h1>
                            <p className="text-muted-foreground mt-1">Chat with our support experts in real-time</p>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                            Online
                        </Badge>
                    </div>
                </div>

                {/* Chat Window */}
                <Card className="flex flex-col h-[500px]">
                    <CardHeader className="border-b flex-shrink-0 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                <Headphones className="h-5 w-5 text-secondary-foreground" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Support Team</CardTitle>
                                <p className="text-xs text-muted-foreground">Typically replies within minutes</p>
                            </div>
                        </div>
                    </CardHeader>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                <div className="space-y-4">
                                    {messages.map((msg) => {
                                        const isOwnMessage = msg.sender_type === 'client';
                                        return (
                                            <div 
                                                key={msg.id} 
                                                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                                                }`}>
                                                    {isOwnMessage ? (
                                                        <User className="h-4 w-4" />
                                                    ) : (
                                                        <Headphones className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
                                                    <div className={`rounded-lg p-3 ${
                                                        isOwnMessage 
                                                            ? 'bg-primary text-primary-foreground' 
                                                            : 'bg-muted'
                                                    }`}>
                                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {peerTyping && (
                                    <div className="flex gap-2 items-center mt-3 text-xs text-muted-foreground">
                                        <span className="flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                        Support is typing…
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Input */}
                            <div className="p-4 border-t flex-shrink-0">
                                <div className="flex gap-3">
                                    <Textarea
                                        placeholder="Type your message..."
                                        className="min-h-[60px] max-h-[120px] resize-none"
                                        value={newMessage}
                                        onChange={(e) => { setNewMessage(e.target.value); notifyTyping(); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        disabled={sending}
                                    />
                                    <Button 
                                        onClick={handleSendMessage} 
                                        disabled={sending || !newMessage.trim()}
                                        size="icon"
                                        className="self-end"
                                    >
                                        {sending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Card>

                {/* Alternative Contact */}
                <Card className="bg-muted/50">
                    <CardContent className="p-4">
                        <p className="text-sm text-center text-muted-foreground">
                            Prefer other contact methods?{" "}
                            <a href="mailto:support@africanhalaal.com" className="text-primary hover:underline">
                                <Mail className="h-3 w-3 inline mr-1" />
                                Email us
                            </a>
                            {" or "}
                            <a href="tel:+260211123456" className="text-primary hover:underline">
                                <Phone className="h-3 w-3 inline mr-1" />
                                Call us
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </ClientLayout>
    );
}
