import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, User, Clock, Tag, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TicketMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_type: string;
  created_at: string;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export default function AdminSupportTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAdminAuthContext();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchMessages();

      // Realtime subscription for messages
      const channel = supabase
        .channel(`ticket-${id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${id}` },
          (payload) => {
            setMessages(prev => [...prev, payload.new as TicketMessage]);
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

  async function fetchTicket() {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.user_id)
        .single();

      setTicket({ ...data, profile });
    } catch (error) {
      console.error('Error fetching ticket:', error);
    }
  }

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
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
      console.log('Sending message with user ID:', user.id);
      
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id,
          sender_id: user.id,
          sender_type: 'support',
          message: newMessage.trim(),
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      // Update ticket status if it was open
      if (ticket?.status === 'open') {
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', id);
        
        if (updateError) {
          console.error('Update ticket error:', updateError);
        } else {
          setTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
        }
      }

      setNewMessage('');
      toast.success('Reply sent');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error?.message || 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const updateData: Record<string, any> = { 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      };
      
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', id);

      setTicket(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Ticket marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-amber-100 text-amber-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">Loading ticket...</div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Ticket Not Found</h2>
          <Button asChild variant="outline">
            <Link to="/admin/support/tickets">Back to Tickets</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/admin/support/tickets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-serif">{ticket.ticket_number}</h1>
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
            </div>
            <p className="text-muted-foreground">{ticket.subject}</p>
          </div>
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Messages */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="flex flex-col h-[600px]">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Conversation</CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isSupport = message.sender_type === 'support';
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isSupport
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <p className={`text-xs mt-1 ${isSupport ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {format(new Date(message.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
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
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Ticket Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{ticket.profile?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{ticket.profile?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <span className="capitalize">{ticket.category}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('resolved')}
                  disabled={ticket.status === 'resolved' || ticket.status === 'closed'}
                >
                  Mark as Resolved
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('closed')}
                  disabled={ticket.status === 'closed'}
                >
                  Close Ticket
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
