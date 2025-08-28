import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface BadgeType {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  requirement_type: 'count' | 'streak' | 'special';
  requirement_value: number | null;
  category: 'social' | 'discovery' | 'engagement' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserBadge {
  id: string;
  badge_type_id: string;
  earned_at: string;
  badge_type: BadgeType;
}

export interface UserStats {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_reactions: number;
  total_tags: number;
  total_connections: number;
  total_messages: number;
  total_yearbooks_viewed: number;
  points: number;
  level: number;
}

export function useGamification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchGamificationData();
    }
  }, [user?.id]);

  const fetchGamificationData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch badge types
      const { data: badgeTypesData, error: badgeTypesError } = await supabase
        .from('badge_types')
        .select('*')
        .order('category', { ascending: true });

      if (badgeTypesError) throw badgeTypesError;
      setBadgeTypes((badgeTypesData || []) as BadgeType[]);

      // Fetch user badges
      const { data: userBadgesData, error: userBadgesError } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge_type:badge_types(*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (userBadgesError) throw userBadgesError;
      setUserBadges((userBadgesData || []) as UserBadge[]);

      // Fetch user stats
      const { data: userStatsData, error: userStatsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userStatsError && userStatsError.code !== 'PGRST116') {
        throw userStatsError;
      }

      if (userStatsData) {
        setUserStats(userStatsData);
      } else {
        // Create initial user stats
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            total_reactions: 0,
            total_tags: 0,
            total_connections: 0,
            total_messages: 0,
            total_yearbooks_viewed: 0,
            points: 0,
            level: 1
          })
          .select()
          .single();

        if (createError) throw createError;
        setUserStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      toast({
        title: "Error",
        description: "Failed to load gamification data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const awardPoints = async (points: number, activity: string) => {
    if (!user?.id) return;

    try {
      // Update user stats with points
      const { error } = await supabase.rpc('update_user_stats_points', {
        user_id: user.id,
        points_to_add: points
      });

      if (error) throw error;

      // Show points notification
      toast({
        title: "Points Earned! 🎉",
        description: `+${points} points for ${activity}`,
        variant: "default",
      });

      // Refresh stats
      await fetchGamificationData();
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const updateActivity = async (activityType: 'reaction' | 'tag' | 'connection' | 'message' | 'yearbook_view') => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Update activity counts and streak
      const updates: Partial<UserStats> = {
        last_activity_date: today,
      };

      // Increment specific counters
      if (userStats) {
        switch (activityType) {
          case 'reaction':
            updates.total_reactions = userStats.total_reactions + 1;
            break;
          case 'tag':
            updates.total_tags = userStats.total_tags + 1;
            break;
          case 'connection':
            updates.total_connections = userStats.total_connections + 1;
            break;
          case 'message':
            updates.total_messages = userStats.total_messages + 1;
            break;
          case 'yearbook_view':
            updates.total_yearbooks_viewed = userStats.total_yearbooks_viewed + 1;
            break;
        }

        // Update streak logic
        const lastActivityDate = userStats.last_activity_date ? new Date(userStats.last_activity_date) : null;
        const todayDate = new Date(today);
        
        if (lastActivityDate) {
          const daysDiff = Math.floor((todayDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            // Consecutive day, increase streak
            updates.current_streak = userStats.current_streak + 1;
            updates.longest_streak = Math.max(userStats.longest_streak, updates.current_streak);
          } else if (daysDiff > 1) {
            // Missed days, reset streak
            updates.current_streak = 1;
          }
          // If daysDiff === 0, it's the same day, no streak change
        } else {
          // First activity ever
          updates.current_streak = 1;
          updates.longest_streak = 1;
        }
      }

      // Update in database
      const { error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // Check for new badges
      await checkForNewBadges();
      
      // Refresh data
      await fetchGamificationData();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const checkForNewBadges = async () => {
    if (!user?.id || !userStats) return;

    const earnedBadgeIds = userBadges.map(b => b.badge_type_id);
    const availableBadges = badgeTypes.filter(b => !earnedBadgeIds.includes(b.id));

    for (const badge of availableBadges) {
      let shouldAward = false;

      switch (badge.name) {
        case 'first_tag':
          shouldAward = userStats.total_tags >= 1;
          break;
        case 'first_reaction':
          shouldAward = userStats.total_reactions >= 1;
          break;
        case 'first_connection':
          shouldAward = userStats.total_connections >= 1;
          break;
        case 'streak_7':
          shouldAward = userStats.current_streak >= 7;
          break;
        case 'streak_30':
          shouldAward = userStats.current_streak >= 30;
          break;
        case 'tag_master':
          shouldAward = userStats.total_tags >= 50;
          break;
        case 'social_butterfly':
          shouldAward = userStats.total_connections >= 25;
          break;
        case 'yearbook_explorer':
          shouldAward = userStats.total_yearbooks_viewed >= 10;
          break;
        case 'reaction_enthusiast':
          shouldAward = userStats.total_reactions >= 100;
          break;
        case 'legend':
          shouldAward = userStats.level >= 10;
          break;
      }

      if (shouldAward) {
        await awardBadge(badge.id, badge.title);
      }
    }
  };

  const awardBadge = async (badgeTypeId: string, badgeTitle: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_type_id: badgeTypeId
        });

      if (error) throw error;

      // Show badge celebration
      const badgeType = badgeTypes.find(b => b.id === badgeTypeId);
      if (badgeType) {
        // Trigger celebration component
        window.dispatchEvent(new CustomEvent('badgeEarned', { 
          detail: badgeType 
        }));
      }

      toast({
        title: "New Badge Earned! 🏆",
        description: `You earned the "${badgeTitle}" badge!`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  };

  return {
    userBadges,
    userStats,
    badgeTypes,
    loading,
    awardPoints,
    updateActivity,
    fetchGamificationData
  };
}