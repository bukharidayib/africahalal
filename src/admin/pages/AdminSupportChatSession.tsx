import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, Clock, FileText, Award, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_type: string;
  created_at: string;
}

interface ChatSessionDetail {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface ClientStats {
  applications: number;
  tickets: number;
  certificates: number;
}

export default function AdminSupportChatSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAdminAuthContext();
  const [session, setSession] = useState<ChatSessionDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [clientStats, setClientStats] = useState<ClientStats>({ applications: 0, tickets: 0, certificates: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { peerTyping, notifyTyping } = useTypingIndicator({ sessionId: id || null, userId: user?.id || null, senderType: 'admin' });

  // Mark as read whenever messages change
  useEffect(() => {
    if (id && messages.length) {
      supabase.from('chat_sessions').update({ admin_last_read_at: new Date().toISOString() }).eq('id', id);
    }
  }, [id, messages.length]);

  useEffect(() => {
    if (id) {
      fetchSession();
      fetchMessages();

      // Realtime subscription for messages
      const channel = supabase
        .channel(`chat-session-${id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${id}` },
          (payload) => {
            setMessages(prev => [...prev, payload.new as ChatMessage]);
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_sessions', filter: `id=eq.${id}` },
          (payload) => {
            setSession(prev => prev ? { ...prev, ...payload.new } : null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function fetchSession() {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, organization_id')
        .eq('id', data.user_id)
        .single();

      setSession({ ...data, profile });

      // Fetch client stats
      if (profile?.organization_id) {
        const { count: apps } = await supabase
          .from('certification_applications')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        const { count: certs } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        const { count: tickets } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', data.user_id);

        setClientStats({
          applications: apps || 0,
          certificates: certs || 0,
          tickets: tickets || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  }

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to send messages');
      return;
    }

    setIsSending(true);
    try {
      console.log('Sending chat message with user ID:', user.id);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: id,
          sender_id: user.id,
          sender_type: 'support',
          message: newMessage.trim(),
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  async function handleEndSession() {
    try {
      await supabase
        .from('chat_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', id);

      toast.success('Chat session ended');
      navigate('/admin/support/chats');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    }
  }

  const quickResponses = [
    'Hello! How can I help you today?',
    "I'm looking into this for you.",
    'Please give me a moment to check.',
    'Is there anything else I can help you with?',
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">Loading chat...</div>
      </AdminLayout>
    );
  }

  if (!session) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Chat Session Not Found</h2>
          <Button asChild variant="outline">
            <Link to="/admin/support/chats">Back to Chats</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const isActive = session.status === 'active';

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/admin/support/chats">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                {isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold">{session.profile?.full_name || 'Unknown User'}</h1>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Active' : 'Ended'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{session.profile?.email}</p>
              </div>
            </div>
          </div>
          {isActive && (
            <Button variant="destructive" size="sm" onClick={handleEndSession}>
              <XCircle className="mr-2 h-4 w-4" />
              End Session
            </Button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col h-[calc(100vh-250px)]">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No messages yet
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isSupport = message.sender_type === 'support';
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isSupport
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            <p className={`text-xs mt-1 ${isSupport ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {format(new Date(message.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                {peerTyping && (
                  <div className="flex gap-2 items-center mt-3 text-xs text-muted-foreground">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    Client is typing…
                  </div>
                )}
              </ScrollArea>
              
              {isActive && (
                <div className="border-t p-4 space-y-3">
                  {/* Quick Responses */}
                  <div className="flex flex-wrap gap-2">
                    {quickResponses.map((response, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setNewMessage(response)}
                      >
                        {response.slice(0, 20)}...
                      </Button>
                    ))}
                  </div>
                  
                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => { setNewMessage(e.target.value); notifyTyping(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!newMessage.trim() || isSending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Client Info Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Client Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Started:</span>
                  <span>{formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Client Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Applications
                  </span>
                  <Badge variant="secondary">{clientStats.applications}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    Certificates
                  </span>
                  <Badge variant="secondary">{clientStats.certificates}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    Tickets
                  </span>
                  <Badge variant="secondary">{clientStats.tickets}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
