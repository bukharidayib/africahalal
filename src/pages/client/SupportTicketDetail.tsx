import { useState, useEffect, useRef } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { useParams, Link } from "react-router-dom";
import { 
    ArrowLeft, 
    Send, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    User,
    Headphones,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TicketMessage {
    id: string;
    sender_id: string;
    sender_type: string;
    message: string;
    created_at: string;
}

interface TicketData {
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    category: string;
    priority: string;
    created_at: string;
    updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    open: { label: "Open", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
    in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: AlertCircle },
    resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
    closed: { label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: CheckCircle },
};

export default function SupportTicketDetail() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchTicketDetails();
            getCurrentUser();
        }
    }, [id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || null);
    };

    const fetchTicketDetails = async () => {
        try {
            // Fetch ticket
            const { data: ticketData, error: ticketError } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('id', id)
                .single();

            if (ticketError) throw ticketError;
            setTicket(ticketData);

            // Fetch messages
            const { data: messagesData, error: messagesError } = await supabase
                .from('ticket_messages')
                .select('*')
                .eq('ticket_id', id)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;
            setMessages(messagesData || []);
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !userId || !id) return;

        setSending(true);
        try {
            const { data, error } = await supabase
                .from('ticket_messages')
                .insert({
                    ticket_id: id,
                    sender_id: userId,
                    sender_type: 'client',
                    message: newMessage.trim()
                })
                .select()
                .single();

            if (error) throw error;

            setMessages(prev => [...prev, data]);
            setNewMessage("");

            // Update ticket updated_at
            await supabase
                .from('support_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', id);

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

    if (loading) {
        return (
            <ClientLayout>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </ClientLayout>
        );
    }

    if (!ticket) {
        return (
            <ClientLayout>
                <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
                    <p className="text-muted-foreground mb-4">The ticket you're looking for doesn't exist.</p>
                    <Button asChild>
                        <Link to="/client/support/tickets">Back to Tickets</Link>
                    </Button>
                </div>
            </ClientLayout>
        );
    }

    const status = statusConfig[ticket.status] || statusConfig.open;
    const StatusIcon = status.icon;
    const isTicketClosed = ticket.status === 'closed' || ticket.status === 'resolved';

    return (
        <ClientLayout>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div>
                    <Link to="/client/support/tickets" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Tickets
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold font-serif tracking-tight text-foreground">
                                    {ticket.ticket_number}
                                </h1>
                                <Badge className={status.color}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {status.label}
                                </Badge>
                            </div>
                            <p className="text-lg text-foreground mt-1">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">
                                {ticket.category} • Created {format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <Card className="flex flex-col h-[500px]">
                    <CardHeader className="border-b flex-shrink-0">
                        <CardTitle className="text-lg">Conversation</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-6" ref={scrollRef}>
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
                                                {format(new Date(msg.created_at), 'dd MMM, HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                    
                    {/* Reply Input */}
                    {!isTicketClosed && (
                        <div className="p-4 border-t flex-shrink-0">
                            <div className="flex gap-3">
                                <Textarea
                                    placeholder="Type your message..."
                                    className="min-h-[80px] resize-none"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
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
                                    className="self-end"
                                >
                                    {sending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Press Enter to send, Shift+Enter for new line
                            </p>
                        </div>
                    )}

                    {isTicketClosed && (
                        <div className="p-4 border-t bg-muted/50 text-center">
                            <p className="text-sm text-muted-foreground">
                                This ticket is {ticket.status}. Create a new ticket if you need further assistance.
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </ClientLayout>
    );
}
