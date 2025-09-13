import React, { memo, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MessageInput } from './MessageInput';
import { useOptimizedMessages } from '@/hooks/useOptimizedMessages';
import { messagingService } from '@/lib/messaging/service';
import { UserAvatar } from './shared/UserAvatar';
import { MessageBubble } from './shared/MessageBubble';
import { TypingIndicator } from './shared/TypingIndicator';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { VirtualMessageList } from './shared/VirtualMessageList';
import { formatConversationDate, getDisplayName } from '@/lib/messaging/utils';
import { ConversationWithProfile } from '@/lib/messaging/types';
import { useToast } from '@/components/ui/use-toast';

export const ThreadView = memo(() => {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversation, setConversation] = useState<ConversationWithProfile | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use optimized messages hook
  const {
    messages,
    loading: messagesLoading,
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
  } = useOptimizedMessages({
    conversationId: threadId,
    enableVirtualScrolling: true,
  });

  // Load conversation details
  const loadConversation = useCallback(async () => {
    if (!threadId) return;

    setLoadingConversation(true);
    try {
      const conversations = await messagingService.loadConversations(user?.id || '', false);
      const conv = conversations.find(c => c.id === threadId);
      setConversation(conv || null);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation details',
        variant: 'destructive',
      });
    } finally {
      setLoadingConversation(false);
    }
  }, [threadId, user?.id, toast]);

  // Load conversation when component mounts or threadId changes
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Handle typing indicators
  const handleTypingChange = useCallback((isTyping: boolean) => {
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // Handle message sent callback
  const handleMessageSent = useCallback(() => {
    scrollToBottom();
    markAsRead();
  }, [scrollToBottom, markAsRead]);

  // Get conversation title/name for header
  const getConversationTitle = useCallback(() => {
    if (!conversation) return 'Loading...';

    if (conversation.is_group) {
      return conversation.title || 'Group Chat';
    } else if (conversation.other_user) {
      return getDisplayName(conversation.other_user);
    }
    return 'Conversation';
  }, [conversation]);

  if (loadingConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading conversation..." />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-3">
        {conversation.is_group ? (
          <UserAvatar
            user={{ id: 'group', first_name: 'G', last_name: '', avatar_url: undefined }}
            size="small"
          />
        ) : conversation.other_user ? (
          <UserAvatar
            user={conversation.other_user}
            size="small"
          />
        ) : null}

        <div className="flex-1">
          <h3 className="font-medium">{getConversationTitle()}</h3>
          {conversation.is_group && (
            <p className="text-xs text-muted-foreground">
              {conversation.participants?.length || 0} participants
            </p>
          )}
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      </div>

      {/* Messages using virtual scrolling for large lists */}
      <VirtualMessageList
        messages={messages}
        currentUserId={user?.id || ''}
        height={window.innerHeight - 200} // Approximate remaining height
        onLoadMore={loadMoreMessages}
        hasMore={hasMore}
        loading={messagesLoading}
        className="flex-1"
      />

      {/* Message Input */}
      <div className="border-t p-4">
        <MessageInput
          conversationId={threadId!}
          onTypingChange={handleTypingChange}
          onMessageSent={handleMessageSent}
          disabled={sending}
        />
      </div>
    </div>
  );
});

ThreadView.displayName = 'ThreadView';