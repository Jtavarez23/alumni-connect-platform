import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReactionCounts {
  like?: number;
  love?: number;
  wow?: number;
  laugh?: number;
  sad?: number;
  angry?: number;
}

interface UseReactionsReturn {
  toggleReaction: (postId: string, reactionType: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useReactions(): UseReactionsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleReaction = useCallback(async (postId: string, reactionType: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('toggle_post_reaction', {
        p_post_id: postId,
        p_reaction_type: reactionType
      });

      if (rpcError) throw rpcError;

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      console.error('Error toggling reaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle reaction');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    toggleReaction,
    loading,
    error
  };
}

// Hook to get user's reaction to a specific post
export function useUserReaction(postId: string) {
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUserReaction = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_post_reaction', {
        p_post_id: postId
      });

      if (error) throw error;
      setUserReaction(data);
    } catch (err) {
      console.error('Error fetching user reaction:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  return {
    userReaction,
    loading,
    fetchUserReaction,
    setUserReaction
  };
}

// Utility functions for reaction handling
export const reactionUtils = {
  // Convert reaction counts object to total count
  getTotalReactions: (reactions: ReactionCounts): number => {
    return Object.values(reactions).reduce((sum, count) => sum + (count || 0), 0);
  },

  // Get top reactions for display
  getTopReactions: (reactions: ReactionCounts, limit = 3): Array<{ type: string; count: number }> => {
    return Object.entries(reactions)
      .filter(([_, count]) => (count || 0) > 0)
      .sort(([_, a], [__, b]) => (b || 0) - (a || 0))
      .slice(0, limit)
      .map(([type, count]) => ({ type, count: count || 0 }));
  },

  // Check if user has reacted
  hasUserReacted: (userReaction: string | null): boolean => {
    return userReaction !== null;
  }
};