import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Reply, Smile, MoreHorizontal } from 'lucide-react';
import { ChannelMessage } from '@/hooks/useClassChannels';
import { useChannelMessages } from '@/hooks/useChannelMessages';
import { format, formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MessageItemProps {
  message: ChannelMessage;
  currentUserId?: string;
  onReply: (messageId: string) => void;
}

const popularEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉'];

export function MessageItem({ message, currentUserId, onReply }: MessageItemProps) {
  const { addReaction } = useChannelMessages(message.channel_id);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleReaction = async (emoji: string) => {
    await addReaction(message.id, emoji);
    setShowEmojiPicker(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'HH:mm');
    }
    return format(date, 'MMM d, HH:mm');
  };

  const isOwnMessage = currentUserId === message.sender_id;

  return (
    <div className="group flex gap-3 hover:bg-muted/30 p-2 rounded-lg transition-colors">
      <Avatar className="w-8 h-8">
        <AvatarImage src={message.sender.avatar_url} />
        <AvatarFallback className="text-xs">
          {getInitials(message.sender.first_name, message.sender.last_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {message.sender.first_name} {message.sender.last_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
          {message.edited_at && (
            <Badge variant="secondary" className="text-xs">edited</Badge>
          )}
        </div>

        {/* Reply preview */}
        {message.reply_to && (
          <div className="mb-2 pl-3 border-l-2 border-muted bg-muted/30 rounded p-2">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">
                {message.reply_to.sender.first_name} {message.reply_to.sender.last_name}
              </span>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {message.reply_to.content}
            </div>
          </div>
        )}

        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Reactions */}
        {Object.keys(message.reactions || {}).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(message.reactions || {}).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="flex items-center gap-1 px-2 py-1 bg-muted/50 hover:bg-muted rounded-full text-xs transition-colors"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{userIds.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Message Actions */}
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReply(message.id)}
            className="h-6 px-2"
          >
            <Reply className="h-3 w-3" />
          </Button>
          
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Smile className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-4 gap-1">
                {popularEmojis.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReaction(emoji)}
                    className="h-8 w-8 p-0 text-lg hover:bg-muted"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {isOwnMessage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Edit message</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Delete message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}