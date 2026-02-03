import React, { useEffect, useState } from 'react';
import { Video, User, Clock, ArrowRight, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ChatSession {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  profile?: {
    full_name: string;
    email: string;
  };
  message_count?: number;
  last_message?: string;
}

export default function AdminSupportChats() {
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [endedChats, setEndedChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChats();

    // Realtime subscription
    const channel = supabase
      .channel('admin-chats-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchChats() {
    try {
      const { data: chats, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;

      if (chats && chats.length > 0) {
        // Fetch profiles
        const userIds = [...new Set(chats.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Fetch message counts and last message for each chat
        const chatsWithDetails = await Promise.all(
          chats.map(async (chat) => {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', chat.id);

            const { data: lastMsg } = await supabase
              .from('chat_messages')
              .select('message')
              .eq('session_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1);

            return {
              ...chat,
              profile: profileMap.get(chat.user_id),
              message_count: count || 0,
              last_message: lastMsg?.[0]?.message,
            };
          })
        );

        setActiveChats(chatsWithDetails.filter(c => c.status === 'active'));
        setEndedChats(chatsWithDetails.filter(c => c.status !== 'active'));
      } else {
        setActiveChats([]);
        setEndedChats([]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const ChatCard = ({ chat, isActive }: { chat: ChatSession; isActive: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{chat.profile?.full_name || 'Unknown User'}</p>
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? 'Active' : 'Ended'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{chat.profile?.email}</p>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {chat.last_message || 'No messages yet'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(chat.started_at), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {chat.message_count} messages
                </span>
              </div>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to={`/admin/support/chats/${chat.id}`}>
              {isActive ? 'Join Chat' : 'View'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-serif">Live Chat Sessions</h1>
          <p className="text-muted-foreground">
            Manage real-time chat conversations with clients
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Active ({activeChats.length})
            </TabsTrigger>
            <TabsTrigger value="ended">
              Ended ({endedChats.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : activeChats.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-1">No Active Chats</h3>
                  <p className="text-sm text-muted-foreground">
                    Active chat sessions will appear here when clients start chatting
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeChats.map((chat) => (
                  <ChatCard key={chat.id} chat={chat} isActive={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ended" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : endedChats.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-1">No Chat History</h3>
                  <p className="text-sm text-muted-foreground">
                    Ended chat sessions will be archived here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {endedChats.map((chat) => (
                  <ChatCard key={chat.id} chat={chat} isActive={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
