// Reusable message bubble component with consistent styling
import React, { memo } from 'react';
import { Message } from '@/lib/messaging/types';
import { formatMessageTime, sanitizeMessageText } from '@/lib/messaging/utils';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export const MessageBubble = memo<MessageBubbleProps>(({
  message,
  isOwnMessage,
  showTimestamp = true,
  className
}) => {
  const bubbleClasses = cn(
    'rounded-lg px-3 py-2 max-w-[80%] break-words',
    isOwnMessage
      ? 'bg-primary text-primary-foreground ml-auto'
      : 'bg-muted',
    className
  );

  const timestampClasses = cn(
    'text-xs mt-1',
    isOwnMessage
      ? 'text-primary-foreground/70'
      : 'text-muted-foreground'
  );

  return (
    <div className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
      <div className={bubbleClasses}>
        {/* Media attachments */}
        {message.media?.urls && message.media.urls.length > 0 && (
          <div className="mb-2 space-y-1">
            {message.media.urls.map((url, index) => {
              const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
              return isImage ? (
                <img
                  key={index}
                  src={url}
                  alt="Attachment"
                  className="max-w-full max-h-60 rounded cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                  loading="lazy"
                />
              ) : (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 p-2 rounded bg-background/20 hover:bg-background/30 transition-colors text-xs"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  File attachment
                </a>
              );
            })}
          </div>
        )}

        {/* Text content */}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap">
            {sanitizeMessageText(message.text)}
          </p>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <p className={timestampClasses}>
            {formatMessageTime(message.created_at)}
          </p>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';