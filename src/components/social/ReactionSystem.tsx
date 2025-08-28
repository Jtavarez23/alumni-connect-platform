import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGamificationContext } from "@/components/gamification/GamificationProvider";

const REACTIONS = [
  { emoji: "😍", label: "Aww", key: "aww" },
  { emoji: "🔥", label: "Iconic", key: "iconic" },
  { emoji: "😂", label: "LOL", key: "lol" },
  { emoji: "💪", label: "Goals", key: "goals" },
  { emoji: "😭", label: "Memories", key: "memories" },
  { emoji: "🤯", label: "OMG", key: "omg" }
];

interface ReactionSystemProps {
  entityId: string;
  entityType: "yearbook_entry" | "tag" | "story";
  className?: string;
}

interface Reaction {
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

interface ReactionCount {
  reaction_type: string;
  count: number;
  users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  }>;
}

export function ReactionSystem({ entityId, entityType, className }: ReactionSystemProps) {
  const { user } = useAuth();
  const { updateActivity, awardPoints } = useGamificationContext();
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReactions();

    // Subscribe to real-time reaction updates
    const channel = supabase
      .channel(`reactions:${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `entity_id=eq.${entityId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('reactions')
        .select(`
          id,
          user_id,
          reaction_type,
          created_at
        `)
        .eq('entity_id', entityId)
        .eq('entity_type', entityType);

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      // Group reactions by type
      const reactionMap = new Map<string, ReactionCount>();
      let currentUserReaction = null;

      data?.forEach((reaction) => {
        const type = reaction.reaction_type;
        const userProfile = userProfiles?.find(p => p.id === reaction.user_id);
        
        if (!reactionMap.has(type)) {
          reactionMap.set(type, { reaction_type: type, count: 0, users: [] });
        }
        
        const reactionCount = reactionMap.get(type)!;
        reactionCount.count++;
        reactionCount.users.push({
          id: reaction.user_id,
          first_name: userProfile?.first_name || '',
          last_name: userProfile?.last_name || '',
          avatar_url: userProfile?.avatar_url
        });

        if (reaction.user_id === user?.id) {
          currentUserReaction = type;
        }
      });

      setReactions(Array.from(reactionMap.values()));
      setUserReaction(currentUserReaction);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) {
      toast.error("Please log in to react");
      return;
    }

    setLoading(true);
    try {
      if (userReaction === reactionType) {
        // Remove reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .eq('user_id', user.id);

        if (error) throw error;
        setUserReaction(null);
      } else {
        // Update or add reaction
        const { error } = await supabase
          .from('reactions')
          .upsert({
            entity_id: entityId,
            entity_type: entityType,
            user_id: user.id,
            reaction_type: reactionType
          }, {
            onConflict: 'entity_id,entity_type,user_id'
          });

        if (error) throw error;
        setUserReaction(reactionType);
        
        // Award points and update activity for new reactions
        if (userReaction !== reactionType) {
          await updateActivity('reaction');
          await awardPoints(2, 'reacting to content');
        }
      }

      fetchReactions();
    } catch (error) {
      console.error('Error updating reaction:', error);
      toast.error("Failed to update reaction");
    } finally {
      setLoading(false);
    }
  };

  const getTopReactions = () => {
    return reactions
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const topReactions = getTopReactions();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Quick reactions (top 3) */}
      {topReactions.map((reaction) => {
        const reactionConfig = REACTIONS.find(r => r.key === reaction.reaction_type);
        if (!reactionConfig) return null;
        
        const isUserReaction = userReaction === reaction.reaction_type;
        
        return (
          <Button
            key={reaction.reaction_type}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 hover-scale",
              isUserReaction && "bg-accent/20 text-accent-foreground"
            )}
            onClick={() => handleReaction(reaction.reaction_type)}
            disabled={loading}
          >
            <span className="text-sm mr-1">{reactionConfig.emoji}</span>
            <span className="text-xs">{reaction.count}</span>
          </Button>
        );
      })}

      {/* All reactions popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-xs hover-scale"
            disabled={loading}
          >
            {userReaction ? "😊" : "😍"} React
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">React to this memory</h4>
            <div className="grid grid-cols-3 gap-2">
              {REACTIONS.map((reaction) => {
                const isActive = userReaction === reaction.key;
                const count = reactions.find(r => r.reaction_type === reaction.key)?.count || 0;
                
                return (
                  <Button
                    key={reaction.key}
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "flex flex-col gap-1 h-auto py-2 hover-scale",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleReaction(reaction.key)}
                    disabled={loading}
                  >
                    <span className="text-lg">{reaction.emoji}</span>
                    <span className="text-xs">{reaction.label}</span>
                    {count > 0 && (
                      <span className="text-xs opacity-70">{count}</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}