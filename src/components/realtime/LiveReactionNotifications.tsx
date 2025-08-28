import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReactionNotification {
  id: string;
  user_id: string;
  reaction_type: string;
  entity_id: string;
  entity_type: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

const REACTION_EMOJIS: Record<string, string> = {
  aww: "😍",
  iconic: "🔥",
  lol: "😂",
  goals: "💪",
  memories: "😭",
  omg: "🤯"
};

export function LiveReactionNotifications() {
  const { user } = useAuth();
  const [recentReactions, setRecentReactions] = useState<ReactionNotification[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to real-time reaction updates
    const channel = supabase
      .channel('reactions-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions'
        },
        async (payload) => {
          const newReaction = payload.new as ReactionNotification;
          
          // Only show notifications for reactions on content that might be yours
          // You'd need to implement logic to check if this reaction is on your content
          
          // Fetch user profile for the reactor
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', newReaction.user_id)
            .single();

          if (userProfile && newReaction.user_id !== user.id) {
            const reactionWithUser = {
              ...newReaction,
              user: userProfile
            };

            // Add to recent reactions for display
            setRecentReactions(prev => [reactionWithUser, ...prev.slice(0, 4)]);

            // Show toast notification
            const emoji = REACTION_EMOJIS[newReaction.reaction_type] || "👍";
            toast.success(
              `${userProfile.first_name} ${userProfile.last_name} reacted ${emoji}`,
              {
                description: `Someone reacted to your ${newReaction.entity_type.replace('_', ' ')}`,
                duration: 3000,
                action: {
                  label: "View",
                  onClick: () => {
                    // Navigate to the content that was reacted to
                    console.log('Navigate to:', newReaction.entity_type, newReaction.entity_id);
                  }
                }
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (recentReactions.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {recentReactions.map((reaction, index) => (
        <Card 
          key={reaction.id} 
          className={cn(
            "w-80 shadow-lg border-l-4 border-l-primary animate-slide-in-right",
            "transition-all duration-300 hover:shadow-xl"
          )}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={reaction.user?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {reaction.user?.first_name?.[0]}
                  {reaction.user?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {reaction.user?.first_name} {reaction.user?.last_name}
                  </span>
                  <span className="text-lg">
                    {REACTION_EMOJIS[reaction.reaction_type] || "👍"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reacted to your {reaction.entity_type.replace('_', ' ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}