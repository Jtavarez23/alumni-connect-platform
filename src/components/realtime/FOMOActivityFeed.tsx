import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  Users, 
  Heart,
  MessageCircle,
  BookOpen,
  UserPlus,
  Zap,
  Eye,
  Star,
  Timer,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";

interface LiveActivity {
  id: string;
  user_name: string;
  user_avatar?: string;
  activity_type: 'online' | 'viewing_yearbook' | 'reacting' | 'messaging' | 'searching' | 'joined';
  entity_name?: string;
  last_activity: string;
  is_mutual_friend?: boolean;
}

interface UrgencyEvent {
  id: string;
  type: 'limited_time' | 'ending_soon' | 'trending' | 'milestone';
  title: string;
  description: string;
  deadline?: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  action_text: string;
  action_url?: string;
  participants?: number;
}

interface FOMOActivityFeedProps {
  className?: string;
  variant?: 'full' | 'compact' | 'sidebar';
  showUrgencyEvents?: boolean;
}

export function FOMOActivityFeed({ 
  className = "", 
  variant = 'full', 
  showUrgencyEvents = true 
}: FOMOActivityFeedProps) {
  const { user } = useAuth();
  const { schoolHistory, getPrimarySchool } = useSchoolHistory();
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [urgencyEvents, setUrgencyEvents] = useState<UrgencyEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && schoolHistory.length > 0) {
      fetchLiveData();
      
      // Set up real-time subscriptions
      const activitySubscription = supabase
        .channel('live_activity_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'live_activity' },
          () => fetchLiveData()
        )
        .subscribe();

      // Refresh data every 30 seconds for real-time feeling
      const interval = setInterval(fetchLiveData, 30000);

      return () => {
        activitySubscription.unsubscribe();
        clearInterval(interval);
      };
    }
  }, [user, schoolHistory]);

  const fetchLiveData = async () => {
    if (!user) return;
    
    const primarySchool = getPrimarySchool();
    if (!primarySchool?.schools?.id) return;

    try {
      // Fetch recent live activities
      const { data: activities, error: activitiesError } = await supabase
        .from('live_activity')
        .select(`
          id,
          user_id,
          activity_type,
          entity_id,
          entity_type,
          last_activity,
          profiles!inner(first_name, last_name, avatar_url)
        `)
        .eq('school_id', primarySchool.schools.id)
        .neq('user_id', user.id) // Don't show user's own activities
        .gte('last_activity', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .order('last_activity', { ascending: false })
        .limit(10);

      // Count online users
      const { data: onlineUsers, error: onlineError } = await supabase
        .from('live_activity')
        .select('user_id')
        .eq('school_id', primarySchool.schools.id)
        .eq('is_active', true)
        .gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (!activitiesError && activities) {
        const processedActivities: LiveActivity[] = activities.map(activity => ({
          id: activity.id,
          user_name: activity.profiles ? `${activity.profiles.first_name || ''} ${activity.profiles.last_name || ''}`.trim() || 'Unknown User' : 'Unknown User',
          user_avatar: activity.profiles?.avatar_url,
          activity_type: activity.activity_type,
          last_activity: activity.last_activity,
          is_mutual_friend: Math.random() > 0.5 // TODO: Calculate actual mutual friends
        }));

        setLiveActivities(processedActivities);
      }

      if (!onlineError) {
        setOnlineCount(onlineUsers?.length || 0);
      }

      // Generate urgency events
      generateUrgencyEvents(primarySchool.schools.id);

    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUrgencyEvents = async (schoolId: string) => {
    // This would typically come from a database, but generating for demo
    const events: UrgencyEvent[] = [
      {
        id: '1',
        type: 'trending',
        title: 'Memory Going Viral! 🔥',
        description: 'Sarah\'s prom photo just hit 50 reactions in 1 hour',
        urgency_level: 'high',
        action_text: 'See what\'s trending',
        participants: 23
      },
      {
        id: '2', 
        type: 'limited_time',
        title: '24h Challenge: Share Your Most Embarrassing Photo',
        description: 'Only 6 hours left! 15 classmates already participated',
        deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        urgency_level: 'medium',
        action_text: 'Join challenge',
        participants: 15
      },
      {
        id: '3',
        type: 'milestone',
        title: '🎉 Class Reunion: 75% Attendance Reached!',
        description: 'We\'re so close to 100%! Don\'t be the one who misses out',
        urgency_level: 'high',
        action_text: 'RSVP now',
        participants: 67
      }
    ];

    setUrgencyEvents(events);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'viewing_yearbook': return <BookOpen className="w-4 h-4" />;
      case 'reacting': return <Heart className="w-4 h-4" />;
      case 'messaging': return <MessageCircle className="w-4 h-4" />;
      case 'searching': return <Eye className="w-4 h-4" />;
      case 'joined': return <UserPlus className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityText = (activity: LiveActivity) => {
    const timeAgo = formatTimeAgo(activity.last_activity);
    
    switch (activity.activity_type) {
      case 'viewing_yearbook':
        return `is browsing the yearbook • ${timeAgo}`;
      case 'reacting':
        return `reacted to a memory • ${timeAgo}`;
      case 'messaging':
        return `is chatting with classmates • ${timeAgo}`;
      case 'searching':
        return `is looking for classmates • ${timeAgo}`;
      case 'joined':
        return `just joined Alumni Connect! • ${timeAgo}`;
      default:
        return `is active • ${timeAgo}`;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-500 dark:bg-red-950';
      case 'high': return 'bg-orange-100 border-orange-500 dark:bg-orange-950';
      case 'medium': return 'bg-yellow-100 border-yellow-500 dark:bg-yellow-950';
      default: return 'bg-blue-100 border-blue-500 dark:bg-blue-950';
    }
  };

  const getUrgencyIcon = (type: string) => {
    switch (type) {
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'limited_time': return <Timer className="w-4 h-4" />;
      case 'milestone': return <Star className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-4 h-4 text-green-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <span className="text-sm font-medium">{onlineCount} classmates online</span>
        </div>
        {liveActivities.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {liveActivities[0].user_name.split(' ')[0]} {getActivityText(liveActivities[0]).split(' •')[0]}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Live Activity Header */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <div className="relative">
              <Activity className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-green-500 text-green-700">
                <Users className="w-3 h-3 mr-1" />
                {onlineCount} online now
              </Badge>
              <Badge variant="secondary">
                <TrendingUp className="w-3 h-3 mr-1" />
                {liveActivities.length} recent activity
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Updates every 30s
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgency Events */}
      {showUrgencyEvents && urgencyEvents.length > 0 && (
        <div className="space-y-3">
          {urgencyEvents.map((event) => (
            <Card 
              key={event.id}
              className={`border-2 ${getUrgencyColor(event.urgency_level)} shadow-lg`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getUrgencyIcon(event.type)}
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                      <Badge size="sm" variant="secondary">
                        {event.urgency_level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-4">
                      {event.participants && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {event.participants} participating
                        </div>
                      )}
                      {event.deadline && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <Clock className="w-3 h-3" />
                          Ends {formatTimeAgo(event.deadline)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button size="sm" className="ml-4">
                    {event.action_text}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              What's Happening Now
            </span>
            <Badge variant="outline" className="text-xs">
              Last 10 minutes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {liveActivities.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Be the first to start browsing!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activity.user_avatar} />
                    <AvatarFallback className="text-xs">
                      {activity.user_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {activity.user_name}
                      </p>
                      {activity.is_mutual_friend && (
                        <Badge size="sm" variant="outline" className="text-xs">
                          mutual friend
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getActivityIcon(activity.activity_type)}
                      <span>{getActivityText(activity)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FOMO Call-to-Action */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-purple-800 dark:text-purple-300">
              Don't Miss Out!
            </span>
          </div>
          <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
            Your classmates are actively reconnecting. Join the conversation before it's too late!
          </p>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            Start Browsing Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}