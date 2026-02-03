import React, { useEffect, useState } from 'react';
import { FileText, Upload, MessageSquare, Video, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface ActivityItem {
  id: string;
  type: 'application' | 'document' | 'ticket' | 'chat';
  title: string;
  description: string;
  timestamp: string;
  link?: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();

    // Set up realtime subscriptions
    const applicationsChannel = supabase
      .channel('admin-applications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'certification_applications' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'application',
          title: 'New Application Submitted',
          description: `Application ${payload.new.application_number}`,
          timestamp: payload.new.created_at,
          link: `/admin/applications/${payload.new.id}`,
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      })
      .subscribe();

    const documentsChannel = supabase
      .channel('admin-documents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'application_documents' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'document',
          title: 'Document Uploaded',
          description: payload.new.document_type,
          timestamp: payload.new.uploaded_at,
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      })
      .subscribe();

    const ticketsChannel = supabase
      .channel('admin-tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'ticket',
          title: 'Support Ticket Created',
          description: payload.new.subject,
          timestamp: payload.new.created_at,
          link: `/admin/support/tickets/${payload.new.id}`,
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      })
      .subscribe();

    const chatsChannel = supabase
      .channel('admin-chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_sessions' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'chat',
          title: 'Chat Session Started',
          description: 'New live chat request',
          timestamp: payload.new.started_at,
          link: `/admin/support/chats/${payload.new.id}`,
        };
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(chatsChannel);
    };
  }, []);

  async function fetchRecentActivities() {
    try {
      const allActivities: ActivityItem[] = [];

      // Fetch recent applications
      const { data: apps } = await supabase
        .from('certification_applications')
        .select('id, application_number, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      (apps || []).forEach(app => {
        allActivities.push({
          id: app.id,
          type: 'application',
          title: 'Application Submitted',
          description: app.application_number,
          timestamp: app.created_at,
          link: `/admin/applications/${app.id}`,
        });
      });

      // Fetch recent documents
      const { data: docs } = await supabase
        .from('application_documents')
        .select('id, document_type, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(5);

      (docs || []).forEach(doc => {
        allActivities.push({
          id: doc.id,
          type: 'document',
          title: 'Document Uploaded',
          description: doc.document_type,
          timestamp: doc.uploaded_at,
        });
      });

      // Fetch recent tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      (tickets || []).forEach(ticket => {
        allActivities.push({
          id: ticket.id,
          type: 'ticket',
          title: 'Support Ticket',
          description: ticket.subject,
          timestamp: ticket.created_at,
          link: `/admin/support/tickets/${ticket.id}`,
        });
      });

      // Fetch recent chat sessions
      const { data: chats } = await supabase
        .from('chat_sessions')
        .select('id, started_at, status')
        .order('started_at', { ascending: false })
        .limit(5);

      (chats || []).forEach(chat => {
        allActivities.push({
          id: chat.id,
          type: 'chat',
          title: 'Chat Session',
          description: chat.status === 'active' ? 'Active' : 'Ended',
          timestamp: chat.started_at,
          link: `/admin/support/chats/${chat.id}`,
        });
      });

      // Sort by timestamp and take top 10
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(allActivities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'application':
        return FileText;
      case 'document':
        return Upload;
      case 'ticket':
        return MessageSquare;
      case 'chat':
        return Video;
      default:
        return FileText;
    }
  };

  const getIconColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'application':
        return 'text-blue-600 bg-blue-100';
      case 'document':
        return 'text-green-600 bg-green-100';
      case 'ticket':
        return 'text-amber-600 bg-amber-100';
      case 'chat':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No recent activity</div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => {
                const Icon = getIcon(activity.type);
                const colorClass = getIconColor(activity.type);
                const content = (
                  <div className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );

                return activity.link ? (
                  <Link key={activity.id} to={activity.link} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={activity.id}>{content}</div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
