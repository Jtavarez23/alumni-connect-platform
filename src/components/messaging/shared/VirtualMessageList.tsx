// Virtual scrolling message list for better performance with large message history
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { List } from 'react-window';
import { Message } from '@/lib/messaging/types';
import { MessageBubble } from './MessageBubble';
import { Badge } from '@/components/ui/badge';
import { groupMessagesByDate, shouldGroupMessages } from '@/lib/messaging/utils';
import { MESSAGE_LIMITS } from '@/lib/messaging/constants';

interface VirtualMessageListProps {
  messages: Message[];
  currentUserId: string;
  height: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

interface MessageItemData {
  messages: Message[];
  currentUserId: string;
  groupedMessages: { date: string; messages: Message[] }[];
}

const MessageItem = memo<{
  index: number;
  style: React.CSSProperties;
  data: MessageItemData;
}>(({ index, style, data }) => {
  const { messages, currentUserId } = data;
  const message = messages[index];
  const previousMessage = index > 0 ? messages[index - 1] : null;

  if (!message) return null;

  const isOwnMessage = message.sender_id === currentUserId;
  const shouldGroup = shouldGroupMessages(message, previousMessage);

  return (
    <div style={style}>
      <div className={`px-4 ${shouldGroup ? 'pt-1' : 'pt-4'}`}>
        <MessageBubble
          message={message}
          isOwnMessage={isOwnMessage}
          showTimestamp={!shouldGroup}
        />
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export const VirtualMessageList = memo<VirtualMessageListProps>(({
  messages,
  currentUserId,
  height,
  onLoadMore,
  hasMore = false,
  loading = false,
  className
}) => {
  const listRef = useRef<List>(null);
  const [isNearTop, setIsNearTop] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isNearBottom && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToItem(messages.length - 1, 'end');
      }, 100);
    }
  }, [messages.length, isNearBottom]);

  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: any) => {
    const nearTop = scrollTop < 100;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setIsNearTop(nearTop);
    setIsNearBottom(nearBottom);

    // Load more messages when scrolling near the top
    if (nearTop && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  const itemData: MessageItemData = {
    messages,
    currentUserId,
    groupedMessages: groupMessagesByDate(messages)
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No messages yet.</p>
          <p className="text-sm mt-1">Start the conversation!</p>
        </div>
      </div>
    );
  }

  // Use virtual scrolling only for large message lists
  if (messages.length < MESSAGE_LIMITS.VIRTUAL_SCROLL_THRESHOLD) {
    return (
      <div className={`flex-1 overflow-y-auto ${className || ''}`}>
        <div className="space-y-1">
          {messages.map((message, index) => {
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const isOwnMessage = message.sender_id === currentUserId;
            const shouldGroup = shouldGroupMessages(message, previousMessage);

            return (
              <div key={message.id} className={`px-4 ${shouldGroup ? 'pt-1' : 'pt-4'}`}>
                <MessageBubble
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showTimestamp={!shouldGroup}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 ${className || ''}`}>
      {loading && hasMore && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading more messages...</span>
        </div>
      )}

      <List
        ref={listRef}
        height={height}
        itemCount={messages.length}
        itemSize={80} // Approximate height per message
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={5} // Render 5 extra items outside viewport
      >
        {MessageItem}
      </List>
    </div>
  );
});

VirtualMessageList.displayName = 'VirtualMessageList';