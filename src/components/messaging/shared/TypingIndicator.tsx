// Typing indicator component
import React, { memo } from 'react';
import { TypingUser } from '@/lib/messaging/types';
import { getDisplayName } from '@/lib/messaging/utils';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export const TypingIndicator = memo<TypingIndicatorProps>(({
  typingUsers,
  className
}) => {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].first_name} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].first_name} and ${typingUsers[1].first_name} are typing`;
    } else {
      return `${typingUsers.length} people are typing`;
    }
  };

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className || ''}`}>
      <span>{getTypingText()}</span>
      <div className="flex space-x-0.5">
        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
        <div
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
          style={{ animationDelay: '0.2s' }}
        />
        <div
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';