import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Bell, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function InspectorNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("inspection_notifications" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data as any[]) || []);
      setIsLoading(false);
    }
    load();
  }, []);

  async function markAsRead(notifId: string) {
    await supabase
      .from("inspection_notifications" as any)
      .update({ is_read: true } as any)
      .eq("id", notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("inspection_notifications" as any)
      .update({ is_read: true } as any)
      .eq("user_id", session.user.id)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Notifications</h1>
            <p className="text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Read
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No notifications yet</h3>
                <p className="text-sm">You'll receive notifications for inspection assignments and updates.</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-4 py-4 cursor-pointer transition-colors ${!notif.is_read ? "bg-primary/5" : ""}`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notif.is_read ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notif.title}</p>
                      {notif.message && <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{notif.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InspectorLayout>
  );
}
