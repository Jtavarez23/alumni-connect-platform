import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import type { BadgeType, UserBadge } from '@/hooks/useGamification';

interface BadgeDisplayProps {
  badge: UserBadge;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  className?: string;
}

const rarityColors = {
  common: 'bg-gray-100 text-gray-700 border-gray-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300',
  epic: 'bg-purple-100 text-purple-700 border-purple-300',
  legendary: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border-yellow-300'
};

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-12 w-12 text-base'
};

export function BadgeDisplay({ badge, size = 'md', showTitle = false, className }: BadgeDisplayProps) {
  const badgeType = badge.badge_type as BadgeType;
  
  // Get the icon component
  const IconComponent = Icons[badgeType.icon as keyof typeof Icons] as React.ComponentType<any>;
  
  const earnedDate = new Date(badge.earned_at).toLocaleDateString();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex flex-col items-center gap-1", className)}>
            <div 
              className={cn(
                "rounded-full border-2 flex items-center justify-center",
                rarityColors[badgeType.rarity],
                sizeClasses[size]
              )}
            >
              {IconComponent && (
                <IconComponent 
                  className={cn(
                    size === 'sm' ? 'h-3 w-3' : 
                    size === 'md' ? 'h-4 w-4' : 'h-6 w-6'
                  )}
                />
              )}
            </div>
            {showTitle && (
              <span className="text-xs font-medium text-center max-w-20 truncate">
                {badgeType.title}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-semibold">{badgeType.title}</div>
            <div className="text-sm text-muted-foreground">{badgeType.description}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Earned on {earnedDate}
            </div>
            <Badge variant="outline" className={cn("mt-1 text-xs", rarityColors[badgeType.rarity])}>
              {badgeType.rarity.charAt(0).toUpperCase() + badgeType.rarity.slice(1)}
            </Badge>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}