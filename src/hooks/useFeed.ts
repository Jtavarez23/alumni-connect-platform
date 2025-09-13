// Alumni Connect - Feed Hooks
// Implements AC-ARCH-004 data fetching hooks for feed functionality

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  Post, 
  Comment,
  Reaction,
  UUID,
  PaginatedResponse,
  RpcGetNetworkFeed,
  RpcGetForYouFeed
} from '@/types/alumni-connect';

// Hook to get network feed (posts from connections and same school)
export function useNetworkFeed() {
  return useInfiniteQuery({
    queryKey: ['feed', 'network'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .rpc('get_network_feed', {
          p_cursor: pageParam,
          p_limit: 20
        });

      if (error) throw error;
      
      // Transform RPC response to match Post interface
      const items = (data?.items || []).map((item: any) => ({
        id: item.id,
        author_id: item.author?.id,
        school_id: item.school_id,
        group_id: item.group_id,
        visibility: item.visibility,
        text: item.content?.text,
        media: item.content?.media,
        metrics: {
          likes: item.metrics?.likes || 0,
          comments: item.metrics?.comments || 0,
          shares: item.metrics?.shares || 0
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
        author: item.author
      }));
      
      const nextCursor = items.length === 20 ? items[items.length - 1]?.created_at : undefined;
      
      return {
        items,
        nextCursor,
        hasMore: items.length === 20
      } as PaginatedResponse<Post>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

// Hook to get For You feed (trending content)
export function useForYouFeed() {
  return useInfiniteQuery({
    queryKey: ['feed', 'foryou'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .rpc('get_for_you_feed', {
          p_cursor: pageParam,
          p_limit: 20
        });

      if (error) throw error;
      
      // Transform RPC response to match Post interface
      const items = (data?.items || []).map((item: any) => ({
        id: item.id,
        author_id: item.author?.id,
        school_id: item.school_id,
        group_id: item.group_id,
        visibility: item.visibility,
        text: item.content?.text,
        media: item.content?.media,
        metrics: {
          likes: item.metrics?.likes || 0,
          comments: item.metrics?.comments || 0,
          shares: item.metrics?.shares || 0,
          trending_score: item.metrics?.trending_score || 0
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
        author: item.author,
        trending_reason: item.trending_reason
      }));
      
      const nextCursor = items.length === 20 ? items[items.length - 1]?.created_at : undefined;
      
      return {
        items,
        nextCursor,
        hasMore: items.length === 20
      } as PaginatedResponse<Post>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

// Hook to create a post
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      text,
      media,
      schoolId,
      groupId,
      visibility = 'alumni_only'
    }: {
      text?: string;
      media?: any;
      schoolId?: UUID;
      groupId?: UUID;
      visibility?: 'public' | 'alumni_only' | 'school_only' | 'connections_only' | 'private';
    }) => {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          text,
          media,
          school_id: schoolId,
          group_id: groupId,
          visibility,
          author_id: (await supabase.auth.getUser()).data.user?.id,
          metrics: { like_count: 0, comment_count: 0, share_count: 0 }
        })
        .select(`
          *,
          author:profiles!author_id(id, first_name, last_name, avatar_url, trust_level),
          school:schools(id, name, location)
        `)
        .single();

      if (error) throw error;
      return data as Post;
    },
    onSuccess: (newPost) => {
      // Add to the beginning of both feeds
      queryClient.setQueryData(['feed', 'network'], (old: any) => {
        if (!old) return { pages: [{ items: [newPost], nextCursor: undefined, hasMore: false }], pageParams: [undefined] };
        
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => 
            index === 0 
              ? { ...page, items: [newPost, ...page.items] }
              : page
          )
        };
      });
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// Hook to get post comments
export function usePostComments(postId: UUID) {
  return useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!author_id(id, first_name, last_name, avatar_url, trust_level)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .range(pageParam || 0, (pageParam || 0) + 19);

      if (error) throw error;
      
      const items = data || [];
      const nextPageParam = items.length === 20 ? (pageParam || 0) + 20 : undefined;
      
      return {
        items,
        nextPageParam,
        hasMore: items.length === 20
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    initialPageParam: 0,
    enabled: !!postId,
  });
}

// Hook to create a comment
export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, text }: { postId: UUID; text: string }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          text,
          author_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select(`
          *,
          author:profiles!author_id(id, first_name, last_name, avatar_url, trust_level)
        `)
        .single();

      if (error) throw error;
      
      // Update post comment count
      const { error: updateError } = await supabase.rpc('increment_post_metric', {
        post_id: postId,
        metric: 'comment_count'
      });
      
      if (updateError) console.error('Failed to update comment count:', updateError);
      
      return data as Comment;
    },
    onSuccess: (newComment, variables) => {
      // Add comment to the comments query
      queryClient.setQueryData(['comments', variables.postId], (old: any) => {
        if (!old) return { pages: [{ items: [newComment], hasMore: false }], pageParams: [0] };
        
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => 
            index === old.pages.length - 1
              ? { ...page, items: [...page.items, newComment] }
              : page
          )
        };
      });
      
      // Invalidate feed to refresh comment count
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// Hook to toggle reaction (like/unlike)
export function useToggleReaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      postId, 
      emoji = 'like' 
    }: { 
      postId: UUID; 
      emoji?: string; 
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Check if reaction already exists
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('emoji')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
          
        if (error) throw error;
        
        // Decrement like count
        await supabase.rpc('decrement_post_metric', {
          post_id: postId,
          metric: 'like_count'
        });
        
        return { action: 'removed' };
      } else {
        // Add reaction
        const { error } = await supabase
          .from('reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            emoji
          });
          
        if (error) throw error;
        
        // Increment like count
        await supabase.rpc('increment_post_metric', {
          post_id: postId,
          metric: 'like_count'
        });
        
        return { action: 'added' };
      }
    },
    onSuccess: (result, variables) => {
      // Optimistically update the feed data
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((post: Post) => 
              post.id === variables.postId
                ? {
                    ...post,
                    metrics: {
                      ...post.metrics,
                      like_count: (post.metrics?.like_count || 0) + (result.action === 'added' ? 1 : -1)
                    }
                  }
                : post
            )
          }))
        };
      });
    },
  });
}

// Hook to share a post
export function useSharePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, text }: { postId: UUID; text?: string }) => {
      // Create a new post that shares the original
      const { data: originalPost } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
        
      if (!originalPost) throw new Error('Original post not found');
      
      const { data, error } = await supabase
        .from('posts')
        .insert({
          text: text || `Sharing: ${originalPost.text?.substring(0, 100)}...`,
          author_id: (await supabase.auth.getUser()).data.user?.id,
          visibility: 'alumni_only',
          media: {
            type: 'shared_post',
            original_post_id: postId,
            original_post: originalPost
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      // Increment share count
      await supabase.rpc('increment_post_metric', {
        post_id: postId,
        metric: 'share_count'
      });
      
      return data;
    },
    onSuccess: (newPost, variables) => {
      // Invalidate feeds to show the shared post
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// Hook to delete a post
export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postId: UUID) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      // Remove from all feed queries
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((post: Post) => post.id !== postId)
          }))
        };
      });
    },
  });
}

// Hook to report a post
export function useReportPost() {
  return useMutation({
    mutationFn: async ({
      postId,
      reason,
      details
    }: {
      postId: UUID;
      reason: 'impersonation' | 'nudity' | 'violence' | 'harassment' | 'copyright' | 'spam' | 'other';
      details?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('report_item', {
          p_target_table: 'posts',
          p_target_id: postId,
          p_reason: reason,
          p_details: details
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Could show a success toast here
      console.log('Post reported successfully');
    },
  });
}