import React, { useEffect, useState } from 'react';
import { MessageSquare, Video, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface SupportStats {
  openTickets: number;
  activeChats: number;
  unreadMessages: number;
}

export function SupportQueue() {
  const [stats, setStats] = useState<SupportStats>({
    openTickets: 0,
    activeChats: 0,
    unreadMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSupportStats();

    // Set up realtime subscription for tickets
    const ticketsChannel = supabase
      .channel('support-queue-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchSupportStats();
      })
      .subscribe();

    const chatsChannel = supabase
      .channel('support-queue-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        fetchSupportStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(chatsChannel);
    };
  }, []);

  async function fetchSupportStats() {
    try {
      // Count open tickets
      const { count: openTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      // Count active chat sessions
      const { count: activeChats } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Count tickets with no response yet (proxy for unread)
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('status', 'open');

      let unreadCount = 0;
      if (tickets && tickets.length > 0) {
        for (const ticket of tickets) {
          const { count } = await supabase
            .from('ticket_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id)
            .eq('sender_type', 'support');
          
          if (!count || count === 0) {
            unreadCount++;
          }
        }
      }

      setStats({
        openTickets: openTickets || 0,
        activeChats: activeChats || 0,
        unreadMessages: unreadCount,
      });
    } catch (error) {
      console.error('Error fetching support stats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const totalPending = stats.openTickets + stats.activeChats;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Support Queue
          {totalPending > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {totalPending} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <MessageSquare className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                <p className="text-2xl font-bold text-amber-700">{stats.openTickets}</p>
                <p className="text-xs text-amber-600">Open Tickets</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Video className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-2xl font-bold text-green-700">{stats.activeChats}</p>
                <p className="text-xs text-green-600">Active Chats</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                <p className="text-2xl font-bold text-red-700">{stats.unreadMessages}</p>
                <p className="text-xs text-red-600">Needs Response</p>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/support">
                View Support Center
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
