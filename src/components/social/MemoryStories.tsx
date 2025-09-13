import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Users, BookOpen, Tag, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemoryStory {
  id: string;
  type: "new_join" | "yearbook_upload" | "tag_activity" | "connection";
  title: string;
  description: string;
  created_at: string;
  school_name: string;
  school_year?: number;
  user_count?: number;
  user?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  preview_users?: Array<{
    first_name: string;
    last_name: string;
    avatar_url?: string;
  }>;
}

const STORY_TYPES = {
  new_join: {
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  yearbook_upload: {
    icon: BookOpen,
    color: "text-green-600", 
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  tag_activity: {
    icon: Tag,
    color: "text-purple-600",
    bgColor: "bg-purple-50", 
    borderColor: "border-purple-200"
  },
  connection: {
    icon: Heart,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200"
  }
};

export function MemoryStories() {
  const [stories, setStories] = useState<MemoryStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemoryStories();
  }, []);

  const fetchMemoryStories = async () => {
    try {
      // Fetch recent activities that can be turned into stories
      const { data: recentActivity, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          title,
          message,
          created_at,
          related_user_id
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch related user profiles separately
      const userIds = (recentActivity || [])
        .map(activity => activity.related_user_id)
        .filter(Boolean);

      const { data: userProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          school_id
        `)
        .in('id', userIds);

      const { data: schools } = await supabase
        .from('schools')
        .select('id, name')
        .in('id', (userProfiles || []).map(p => p.school_id).filter(Boolean));

      // Transform notifications into memory stories
      const transformedStories: MemoryStory[] = (recentActivity || []).map(activity => {
        const user = userProfiles?.find(p => p.id === activity.related_user_id);
        const school = schools?.find(s => s.id === user?.school_id);
        
        return {
          id: activity.id,
          type: mapNotificationToStoryType(activity.type),
          title: activity.title,
          description: activity.message || "",
          created_at: activity.created_at,
          school_name: school?.name || "Unknown School",
          user: user ? {
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          } : undefined
        };
      });

      setStories(transformedStories);
    } catch (error) {
      console.error('Error fetching memory stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapNotificationToStoryType = (notificationType: string): MemoryStory['type'] => {
    switch (notificationType) {
      case 'friend_request':
      case 'friend_accepted':
        return 'connection';
      case 'tag_suggestion':
      case 'tag_verified':
        return 'tag_activity';
      case 'yearbook_upload':
        return 'yearbook_upload';
      default:
        return 'new_join';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Memory Lane</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64">
              <Card className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold gradient-text">Memory Lane</h3>
        <Badge variant="secondary" className="text-xs">
          Latest Updates
        </Badge>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {stories.slice(0, 6).map((story) => {
          const storyType = STORY_TYPES[story.type];
          const Icon = storyType.icon;
          
          return (
            <Card
              key={story.id}
              className={cn(
                "flex-shrink-0 w-72 hover-scale cursor-pointer transition-all duration-300",
                "hover:shadow-lg border-l-4",
                storyType.borderColor,
                storyType.bgColor
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "rounded-full p-2 border",
                    storyType.color,
                    "bg-background"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {story.user && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={story.user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {story.user.first_name?.[0]}{story.user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <p className="text-sm font-medium line-clamp-1">
                        {story.title}
                      </p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {story.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {story.school_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {/* See More Story */}
        <Card className="flex-shrink-0 w-48 hover-scale cursor-pointer border-dashed">
          <CardContent className="p-4 h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">👀</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                See more stories
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}