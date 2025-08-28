import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, Users, Tag, BookOpen, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  message?: string;
  created_at: string;
  read: boolean;
  related_user_id?: string;
  related_user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return Users;
    case 'tag_suggestion':
    case 'tag_verified':
      return Tag;
    case 'yearbook_upload':
      return BookOpen;
    default:
      return Bell;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'friend_request':
      return 'text-blue-600';
    case 'friend_accepted':
      return 'text-green-600';
    case 'tag_suggestion':
      return 'text-purple-600';
    case 'tag_verified':
      return 'text-emerald-600';
    case 'yearbook_upload':
      return 'text-orange-600';
    default:
      return 'text-gray-600';
  }
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          title,
          message,
          created_at,
          read,
          related_user_id
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch related user data for activities that have related_user_id
      const activitiesWithUsers = await Promise.all(
        (data || []).map(async (activity) => {
          if (activity.related_user_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .eq('id', activity.related_user_id)
              .single();
            
            return {
              ...activity,
              related_user: userProfile
            };
          }
          return activity;
        })
      );

      setActivities(activitiesWithUsers);
      setUnreadCount(activitiesWithUsers.filter(a => !a.read).length);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error",
        description: "Failed to load recent activity",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', activityId);

      if (error) throw error;

      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, read: true }
            : activity
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking activity as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      setActivities(prev => 
        prev.map(activity => ({ ...activity, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time updates for notifications
    const channel = supabase
      .channel('notifications-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          const newActivity = payload.new as ActivityItem;
          
          // Fetch related user data if needed
          if (newActivity.related_user_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .eq('id', newActivity.related_user_id)
              .single();
            
            if (userProfile) {
              newActivity.related_user = userProfile;
            }
          }
          
          setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for important notifications
          if (['friend_request', 'friend_accepted', 'tag_verified'].includes(newActivity.type)) {
            toast({
              title: newActivity.title,
              description: newActivity.message,
              variant: "default",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const updatedActivity = payload.new as ActivityItem;
          setActivities(prev => 
            prev.map(activity => 
              activity.id === updatedActivity.id ? updatedActivity : activity
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Activity
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <CardDescription>
          Your latest connections and activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity yet</p>
            <p className="text-sm">Connect with classmates to see updates here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const iconColor = getActivityColor(activity.type);
              
              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    !activity.read ? 'bg-muted/50 border-primary/20' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => !activity.read && markAsRead(activity.id)}
                >
                  <div className={`rounded-full p-2 bg-background border ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {activity.related_user && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={activity.related_user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {activity.related_user.first_name?.[0]}
                            {activity.related_user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.message && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!activity.read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}