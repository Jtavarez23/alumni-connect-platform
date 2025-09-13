// Optimized conversations hook with caching and performance improvements
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messagingService } from '@/lib/messaging/service';
import { ConversationWithProfile } from '@/lib/messaging/types';
import { useToast } from '@/components/ui/use-toast';

interface UseConversationsReturn {
  conversations: ConversationWithProfile[];
  loading: boolean;
  error: string | null;
  getTotalUnreadCount: () => number;
  refreshConversations: () => Promise<void>;
  searchConversations: (query: string) => ConversationWithProfile[];
}

export function useOptimizedConversations(): UseConversationsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (showError: boolean = true) => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await messagingService.loadConversations(user.id);
      setConversations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);

      if (showError) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const refreshConversations = useCallback(async () => {
    await loadConversations(false);
  }, [loadConversations]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!user) return;

    const unsubscribes: (() => void)[] = [];

    // Subscribe to each conversation for message updates
    conversations.forEach(conversation => {
      const unsubscribe = messagingService.subscribeToMessages(
        conversation.id,
        () => {
          // Refresh conversations when new messages arrive
          refreshConversations();
        },
        (error) => {
          console.error('Message subscription error:', error);
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, conversations.length, refreshConversations]);

  // Memoized calculations
  const getTotalUnreadCount = useCallback(() => {
    return conversations.reduce((total, conv) => total + conv.unread_count, 0);
  }, [conversations]);

  const searchConversations = useCallback((query: string): ConversationWithProfile[] => {
    if (!query.trim()) return conversations;

    const lowercaseQuery = query.toLowerCase();

    return conversations.filter(conv => {
      if (conv.is_group) {
        return conv.title?.toLowerCase().includes(lowercaseQuery);
      } else if (conv.other_user) {
        const fullName = `${conv.other_user.first_name} ${conv.other_user.last_name}`;
        return fullName.toLowerCase().includes(lowercaseQuery);
      }
      return false;
    });
  }, [conversations]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    conversations,
    loading,
    error,
    getTotalUnreadCount,
    refreshConversations,
    searchConversations,
  }), [conversations, loading, error, getTotalUnreadCount, refreshConversations, searchConversations]);
}