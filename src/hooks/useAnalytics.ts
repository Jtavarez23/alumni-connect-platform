import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '@/contexts/AuthContext';

export interface PostAnalytics {
  post_id: string;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_views: number;
  total_clicks: number;
  engagement_rate: number;
  reach_count: number;
  avg_view_duration: number;
  top_engagement_hours: string[];
  click_breakdown: {
    links: number;
    media: number;
    profiles: number;
  };
}

export interface UserAnalytics {
  total_posts: number;
  total_likes_received: number;
  total_comments_received: number;
  total_shares_received: number;
  total_views_received: number;
  avg_engagement_rate: number;
  best_performing_post_id: string;
  top_engagement_types: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}

export interface EngagementTimeline {
  time_period: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  total_engagement: number;
}

export function useAnalytics() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPostAnalytics = useCallback(async (postId: string, timeRange: string = '7 days'): Promise<PostAnalytics | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: analyticsError } = await supabase
        .rpc('get_post_analytics', { 
          p_post_id: postId,
          p_time_range: timeRange 
        });

      if (analyticsError) {
        throw analyticsError;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error fetching post analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch post analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const getUserAnalytics = useCallback(async (timeRange: string = '30 days'): Promise<UserAnalytics | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: analyticsError } = await supabase
        .rpc('get_user_analytics_overview', { 
          p_time_range: timeRange 
        });

      if (analyticsError) {
        throw analyticsError;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error fetching user analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const getEngagementTimeline = useCallback(async (postId: string, granularity: string = 'hour'): Promise<EngagementTimeline[]> => {
    if (!user) {
      setError('User not authenticated');
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: timelineError } = await supabase
        .rpc('get_post_engagement_timeline', { 
          p_post_id: postId,
          p_granularity: granularity 
        });

      if (timelineError) {
        throw timelineError;
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching engagement timeline:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch engagement timeline');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const recordPostView = useCallback(async (postId: string, viewData?: {
    viewDuration?: number;
    deviceType?: string;
    location?: string;
    referralSource?: string;
  }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user.id,
          view_duration: viewData?.viewDuration,
          device_type: viewData?.deviceType,
          location: viewData?.location,
          referral_source: viewData?.referralSource
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error recording post view:', err);
      return false;
    }
  }, [user, supabase]);

  const recordPostClick = useCallback(async (postId: string, clickData: {
    clickType: 'link' | 'media' | 'profile' | 'hashtag' | 'mention';
    targetUrl?: string;
    targetId?: string;
  }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('post_clicks')
        .insert({
          post_id: postId,
          user_id: user.id,
          click_type: clickData.clickType,
          target_url: clickData.targetUrl,
          target_id: clickData.targetId
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error recording post click:', err);
      return false;
    }
  }, [user, supabase]);

  const getTopPosts = useCallback(async (limit: number = 5, timeRange: string = '30 days') => {
    if (!user) {
      setError('User not authenticated');
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      // Get posts with highest engagement rates
      const { data, error: postsError } = await supabase
        .from('post_metrics')
        .select(`
          post_id,
          engagement_rate,
          like_count,
          comment_count,
          share_count,
          view_count,
          posts!inner (id, text, created_at)
        `)
        .eq('posts.author_id', user.id)
        .order('engagement_rate', { ascending: false })
        .limit(limit);

      if (postsError) {
        throw postsError;
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching top posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch top posts');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  return {
    loading,
    error,
    getPostAnalytics,
    getUserAnalytics,
    getEngagementTimeline,
    recordPostView,
    recordPostClick,
    getTopPosts,
    clearError: () => setError(null)
  };
}