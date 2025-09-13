// Optimized messages hook with virtual scrolling support and performance improvements
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messagingService } from '@/lib/messaging/service';
import { Message, TypingUser } from '@/lib/messaging/types';
import { MESSAGE_LIMITS } from '@/lib/messaging/constants';
import { shouldAutoScroll } from '@/lib/messaging/utils';
import { useToast } from '@/components/ui/use-toast';

interface UseMessagesOptions {
  conversationId: string | null;
  enableVirtualScrolling?: boolean;
  pageSize?: number;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  typingUsers: TypingUser[];
  hasMore: boolean;
  sendMessage: (text?: string, attachments?: string[]) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  scrollToBottom: () => void;
  shouldAutoScrollToBottom: boolean;
}

export function useOptimizedMessages({
  conversationId,
  enableVirtualScrolling = false,
  pageSize = MESSAGE_LIMITS.MESSAGE_BATCH_SIZE
}: UseMessagesOptions): UseMessagesReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [shouldAutoScrollToBottom, setShouldAutoScrollToBottom] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Load messages with pagination
  const loadMessages = useCallback(async (reset: boolean = false) => {
    if (!conversationId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const newMessages = await messagingService.loadMessages(
        conversationId,
        pageSize,
        currentOffset
      );

      if (reset) {
        setMessages(newMessages);
        setOffset(newMessages.length);
      } else {
        setMessages(prev => [...newMessages, ...prev]);
        setOffset(prev => prev + newMessages.length);
      }

      setHasMore(newMessages.length === pageSize);

      // Mark messages as read
      if (newMessages.length > 0) {
        await messagingService.markMessagesAsRead(conversationId, user.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, offset, pageSize, toast]);

  // Load more messages (for pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadMessages(false);
  }, [hasMore, loading, loadMessages]);

  // Send message
  const sendMessage = useCallback(async (text?: string, attachments?: string[]) => {
    if ((!text?.trim() && !attachments?.length) || !conversationId || !user || sending) {
      return;
    }

    setSending(true);
    stopTyping();

    try {
      await messagingService.sendMessage(conversationId, user.id, text, attachments);
      setShouldAutoScrollToBottom(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }, [conversationId, user, sending, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      await messagingService.markMessagesAsRead(conversationId, user.id);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [conversationId, user]);

  // Typing indicators
  const startTyping = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      await messagingService.sendTypingIndicator(conversationId, user.id, true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after timeout
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, MESSAGE_LIMITS.TYPING_TIMEOUT);
    } catch (err) {
      console.error('Error sending typing indicator:', err);
    }
  }, [conversationId, user]);

  const stopTyping = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      await messagingService.sendTypingIndicator(conversationId, user.id, false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping typing indicator:', err);
    }
  }, [conversationId, user]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Auto-scroll logic
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const shouldAutoScroll = shouldAutoScrollToBottom(scrollTop, scrollHeight, clientHeight);
    setShouldAutoScrollToBottom(shouldAutoScroll);
  }, []);

  // Initialize and subscribe to messages
  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setTypingUsers([]);
      setOffset(0);
      setHasMore(true);
      return;
    }

    // Load initial messages
    loadMessages(true);

    // Subscribe to message updates
    const unsubscribeMessages = messagingService.subscribeToMessages(
      conversationId,
      (newMessage) => {
        setMessages(prev => {
          // Prevent duplicates
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;

          return [...prev, newMessage];
        });
        setShouldAutoScrollToBottom(true);
      },
      (error) => {
        console.error('Message subscription error:', error);
      }
    );

    // Subscribe to typing indicators
    const unsubscribeTyping = messagingService.subscribeToTyping(
      conversationId,
      user.id,
      setTypingUsers
    );

    unsubscribeRef.current = () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };

    return () => {
      unsubscribeRef.current?.();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user, loadMessages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (shouldAutoScrollToBottom && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length, shouldAutoScrollToBottom, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return useMemo(() => ({
    messages,
    loading,
    sending,
    error,
    typingUsers,
    hasMore,
    sendMessage,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    scrollToBottom,
    shouldAutoScrollToBottom,
  }), [
    messages,
    loading,
    sending,
    error,
    typingUsers,
    hasMore,
    sendMessage,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    scrollToBottom,
    shouldAutoScrollToBottom,
  ]);
}