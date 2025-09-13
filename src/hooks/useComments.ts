// Hook for managing post comments

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Comment {
  id: string;
  text: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
    trust_level: string;
  };
}

interface CommentsResponse {
  comments: Comment[];
  total_count: number;
  has_more: boolean;
  error?: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  addComment: (text: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useComments(postId: string): UseCommentsReturn {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const loadComments = useCallback(async (reset = false) => {
    if (loading || !postId) return;

    setLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const { data, error: rpcError } = await supabase.rpc('get_post_comments', {
        p_post_id: postId,
        p_limit: 20,
        p_offset: currentOffset
      });

      if (rpcError) throw rpcError;

      const response: CommentsResponse = data;
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (reset) {
        setComments(response.comments || []);
      } else {
        setComments(prev => [...prev, ...(response.comments || [])]);
      }

      setTotalCount(response.total_count || 0);
      setHasMore(response.has_more || false);
      setOffset(reset ? 20 : currentOffset + 20);

    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId, loading, offset]);

  const addComment = useCallback(async (text: string) => {
    if (!user || !postId || !text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('create_comment', {
        p_post_id: postId,
        p_text: text.trim()
      });

      if (rpcError) throw rpcError;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Refresh comments to show the new one
      await loadComments(true);

    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, postId, loadComments]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('delete_comment', {
        p_comment_id: commentId
      });

      if (rpcError) throw rpcError;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Remove comment from local state
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      setTotalCount(prev => Math.max(prev - 1, 0));

    } catch (err) {
      console.error('Error deleting comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await loadComments(false);
    }
  }, [hasMore, loading, loadComments]);

  const refresh = useCallback(async () => {
    await loadComments(true);
  }, [loadComments]);

  return {
    comments,
    loading,
    error,
    totalCount,
    hasMore,
    addComment,
    deleteComment,
    loadMore,
    refresh
  };
}