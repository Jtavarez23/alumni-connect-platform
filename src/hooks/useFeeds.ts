// Hook for fetching and managing feeds

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCached, setCached, cacheKeys } from '@/lib/redis';

export interface FeedItem {
  id: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
    school?: string;
    graduation_year?: number;
    trust_level: string;
  };
  content: {
    text?: string;
    media?: string[];
  };
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    trending_score?: number;
  };
  created_at: string;
  visibility: string;
  trending_reason?: string;
}

interface FeedResponse {
  items: FeedItem[];
  next_cursor?: string;
  error?: string;
}

interface PostRow {
  id: string;
  author_id: string;
  text?: string;
  media_urls?: string[];
  visibility: string;
  created_at: string;
}

interface UseFeedsReturn {
  items: FeedItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNetworkFeed(): UseFeedsReturn {
  return useFeed('network');
}

export function useForYouFeed(): UseFeedsReturn {
  return useFeed('forYou');
}

function useFeed(feedType: 'network' | 'forYou'): UseFeedsReturn {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (refresh = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const functionName = feedType === 'network' ? 'get_network_feed' : 'get_for_you_feed';
      const cacheKey = cacheKeys.feed(user?.id || 'anonymous', feedType, refresh ? null : cursor);
      
      // Try to get from cache first
      if (!refresh) {
        const cachedData = await getCached<FeedResponse>(cacheKey);
        if (cachedData) {
          setItems(prev => [...prev, ...(cachedData.items || [])]);
          setCursor(cachedData.next_cursor || null);
          setHasMore(!!cachedData.next_cursor);
          setLoading(false);
          return;
        }
      }

      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_cursor: refresh ? null : cursor,
        p_limit: 20
      });

      if (rpcError) throw rpcError;

      const response: FeedResponse = data;
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (refresh) {
        setItems(response.items || []);
      } else {
        setItems(prev => [...prev, ...(response.items || [])]);
      }

      setCursor(response.next_cursor || null);
      setHasMore(!!response.next_cursor);

      // Cache the response for 2 minutes
      if (response.items && response.items.length > 0) {
        await setCached(cacheKey, response, { ttl: 120 });
      }

    } catch (err) {
      console.error(`Error fetching ${feedType} feed:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch feed');
    } finally {
      setLoading(false);
    }
  }, [feedType, cursor, loading, user?.id]);

  const fetchMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchFeed(false);
    }
  }, [hasMore, loading, fetchFeed]);

  const refresh = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchFeed(true);
  }, [fetchFeed]);

  // Load initial feed
  useEffect(() => {
    if (items.length === 0 && !loading && user) {
      fetchFeed(true);
    }
  }, [fetchFeed, items.length, loading, user]);

  // Subscribe to real-time post updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('posts')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'posts',
          filter: feedType === 'network' 
            ? `author_id=in.(${getNetworkUserFilter()})`
            : undefined
        }, 
        (payload) => {
          // Only add new posts that match our feed criteria
          const newPost = payload.new as PostRow;
          if (shouldIncludePost(newPost, feedType)) {
            setItems(prev => [transformPostToFeedItem(newPost), ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, feedType]);

  return {
    items,
    loading,
    error,
    hasMore,
    fetchMore,
    refresh
  };

  // Helper functions for real-time filtering
  function getNetworkUserFilter(): string {
    // In a real implementation, this would fetch the user's network
    // For now, we'll rely on the RPC function's filtering
    return '';
  }

  function shouldIncludePost(post: PostRow, feedType: string): boolean {
    // Basic filtering - in production, this would match the RPC logic
    return feedType === 'network' 
      ? post.visibility !== 'private'
      : post.visibility !== 'private' && post.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  function transformPostToFeedItem(post: PostRow): FeedItem {
    return {
      id: post.id,
      author: {
        id: post.author_id,
        name: 'Loading...', // Will be populated from profile data
        trust_level: 'unverified'
      },
      content: {
        text: post.text,
        media: post.media_urls
      },
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0
      },
      created_at: post.created_at,
      visibility: post.visibility
    };
  }
}

// Hook for creating posts
export function useCreatePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = async (postData: {
    text?: string;
    mediaUrls?: string[];
    visibility?: string;
    schoolId?: string;
    groupId?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('create_post', {
        p_text: postData.text,
        p_media_urls: postData.mediaUrls,
        p_visibility: postData.visibility || 'alumni_only',
        p_school_id: postData.schoolId,
        p_group_id: postData.groupId
      });

      if (rpcError) throw rpcError;

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPost,
    loading,
    error
  };
}

// Hook for toggling post likes
export function usePostLikes() {
  const [loading, setLoading] = useState(false);

  const toggleLike = async (postId: string) => {
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('toggle_post_like', {
        p_post_id: postId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      console.error('Error toggling post like:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    toggleLike,
    loading
  };
}