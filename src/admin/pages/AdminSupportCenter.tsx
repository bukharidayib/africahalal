import React, { useEffect, useState } from 'react';
import { MessageSquare, Video, HelpCircle, Phone, Mail, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface TicketSummary {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
  last_message?: string;
  userRole?: string;
}

export default function AdminSupportCenter() {
  const [ticketStats, setTicketStats] = useState({
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  });
  const [recentTickets, setRecentTickets] = useState<TicketSummary[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Realtime subscriptions
    const chatsChannel = supabase
      .channel('admin-support-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        fetchActiveChats();
      })
      .subscribe();

    const ticketsChannel = supabase
      .channel('admin-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTicketStats();
        fetchRecentTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, []);

  async function fetchData() {
    await Promise.all([
      fetchTicketStats(),
      fetchRecentTickets(),
      fetchActiveChats(),
    ]);
    setIsLoading(false);
  }

  async function fetchTicketStats() {
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      counts[status] = count || 0;
    }

    setTicketStats(counts as typeof ticketStats);
  }

  async function fetchRecentTickets() {
    const { data } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, status, priority, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentTickets(data || []);
  }

  async function fetchActiveChats() {
    const { data: chats } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (chats && chats.length > 0) {
      // Fetch profiles for chat users
      const userIds = chats.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Determine user roles
      const { data: supervisorRecords } = await supabase
        .from('organization_supervisors')
        .select('supervisor_id')
        .in('supervisor_id', userIds);
      const supervisorIds = new Set(supervisorRecords?.map(s => s.supervisor_id) || []);

      const { data: adminRoleRecords } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', userIds);
      const adminIds = new Set(adminRoleRecords?.map(r => r.user_id) || []);

      const getUserRole = (userId: string) => {
        if (adminIds.has(userId)) return 'Admin';
        if (supervisorIds.has(userId)) return 'Supervisor';
        return 'Client';
      };

      // Fetch last message for each chat
      const chatsWithDetails = await Promise.all(
        chats.map(async (chat) => {
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('message')
            .eq('session_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...chat,
            profile: profileMap.get(chat.user_id),
            last_message: messages?.[0]?.message,
            userRole: getUserRole(chat.user_id),
          };
        })
      );

      setActiveChats(chatsWithDetails);
    } else {
      setActiveChats([]);
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-serif">Support Center</h1>
          <p className="text-muted-foreground">
            Manage support tickets and live chat sessions
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600">{ticketStats.open}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{ticketStats.in_progress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{ticketStats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-600">{ticketStats.closed}</p>
                <p className="text-sm text-muted-foreground">Closed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Chats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-green-600" />
                Active Chats
                {activeChats.length > 0 && (
                  <Badge className="bg-green-100 text-green-800">{activeChats.length} online</Badge>
                )}
              </CardTitle>
              <CardDescription>Live chat sessions waiting for response</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : activeChats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active chats</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {chat.profile?.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium">{chat.profile?.full_name || 'Unknown User'}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {chat.userRole}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {chat.last_message || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm">
                        <Link to={`/admin/support/chats/${chat.id}`}>Join Chat</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/admin/support/chats">
                  View All Chats
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-600" />
                Recent Tickets
              </CardTitle>
              <CardDescription>Latest support ticket submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : recentTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tickets yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/admin/support/tickets/${ticket.id}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors block"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {ticket.ticket_number}
                          </span>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/admin/support/tickets">
                  View All Tickets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Support Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Support Email</p>
                  <p className="font-medium">support@africanhalaal.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Support Phone</p>
                  <p className="font-medium">+27 (0)11 123 4567</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
