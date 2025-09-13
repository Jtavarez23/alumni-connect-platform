import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Smile, 
  Frown, 
  Angry, 
  Zap,
  Laugh
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ReactionPickerProps {
  onReactionSelect: (reactionType: string) => void;
  currentReaction?: string;
  className?: string;
  disabled?: boolean;
}

const reactionTypes = [
  { 
    type: 'like', 
    icon: Heart, 
    emoji: '👍', 
    label: 'Like',
    color: 'text-blue-500',
    hoverColor: 'hover:bg-blue-50 hover:text-blue-600'
  },
  { 
    type: 'love', 
    icon: Heart, 
    emoji: '❤️', 
    label: 'Love',
    color: 'text-red-500',
    hoverColor: 'hover:bg-red-50 hover:text-red-600'
  },
  { 
    type: 'wow', 
    icon: Zap, 
    emoji: '😮', 
    label: 'Wow',
    color: 'text-yellow-500',
    hoverColor: 'hover:bg-yellow-50 hover:text-yellow-600'
  },
  { 
    type: 'laugh', 
    icon: Laugh, 
    emoji: '😄', 
    label: 'Haha',
    color: 'text-green-500',
    hoverColor: 'hover:bg-green-50 hover:text-green-600'
  },
  { 
    type: 'sad', 
    icon: Frown, 
    emoji: '😢', 
    label: 'Sad',
    color: 'text-purple-500',
    hoverColor: 'hover:bg-purple-50 hover:text-purple-600'
  },
  { 
    type: 'angry', 
    icon: Angry, 
    emoji: '😠', 
    label: 'Angry',
    color: 'text-orange-500',
    hoverColor: 'hover:bg-orange-50 hover:text-orange-600'
  }
];

export function ReactionPicker({ 
  onReactionSelect, 
  currentReaction, 
  className,
  disabled = false 
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentReactionData = reactionTypes.find(r => r.type === currentReaction);
  
  const handleReactionClick = (reactionType: string) => {
    onReactionSelect(reactionType);
    setIsOpen(false);
  };

  const handleQuickReaction = () => {
    // Quick like/unlike on direct click
    if (currentReaction === 'like') {
      onReactionSelect('like'); // This will toggle off the like
    } else {
      onReactionSelect('like');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center">
          {/* Quick reaction button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickReaction}
            disabled={disabled}
            className={cn(
              "h-8 px-3 transition-all duration-200",
              currentReaction && currentReactionData && [
                currentReactionData.color,
                "hover:" + currentReactionData.color
              ],
              className
            )}
          >
            {currentReactionData ? (
              <>
                <span className="text-base mr-1">{currentReactionData.emoji}</span>
                <span className="text-sm">{currentReactionData.label}</span>
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-1" />
                <span className="text-sm">Like</span>
              </>
            )}
          </Button>
          
          {/* Reaction picker trigger */}
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 w-8 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseEnter={() => setIsOpen(true)}
          >
            <span className="text-xs">+</span>
          </Button>
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-auto p-2" 
        side="top" 
        align="start"
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="flex gap-1">
          {reactionTypes.map((reaction) => (
            <Button
              key={reaction.type}
              variant="ghost"
              size="sm"
              onClick={() => handleReactionClick(reaction.type)}
              className={cn(
                "h-12 w-12 p-2 flex flex-col items-center gap-1 transition-all duration-200",
                "hover:scale-110 hover:bg-muted",
                reaction.hoverColor,
                currentReaction === reaction.type && [
                  reaction.color,
                  "bg-muted scale-105"
                ]
              )}
              title={reaction.label}
            >
              <span className="text-lg">{reaction.emoji}</span>
              <span className="text-xs">{reaction.label}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper component to display reaction counts
interface ReactionCountsProps {
  reactions: Record<string, number>;
  className?: string;
}

export function ReactionCounts({ reactions, className }: ReactionCountsProps) {
  const hasReactions = Object.values(reactions).some(count => count > 0);
  
  if (!hasReactions) return null;
  
  const topReactions = Object.entries(reactions)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 3);
  
  const totalCount = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  
  return (
    <div className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <div className="flex">
        {topReactions.map(([type, count]) => {
          const reaction = reactionTypes.find(r => r.type === type);
          return reaction ? (
            <span 
              key={type} 
              className="text-base -ml-1 first:ml-0"
              title={`${count} ${reaction.label}`}
            >
              {reaction.emoji}
            </span>
          ) : null;
        })}
      </div>
      <span>{totalCount}</span>
    </div>
  );
}