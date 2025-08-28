import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserStats } from '@/hooks/useGamification';

interface UserLevelProps {
  userStats: UserStats | null;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserLevel({ userStats, showProgress = true, size = 'md', className }: UserLevelProps) {
  if (!userStats) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="animate-pulse bg-gray-200 rounded h-6 w-16"></div>
        {showProgress && <div className="animate-pulse bg-gray-200 rounded h-2 w-20"></div>}
      </div>
    );
  }

  // Calculate points needed for next level
  const currentLevelPoints = Math.pow(userStats.level - 1, 2) * 100;
  const nextLevelPoints = Math.pow(userStats.level, 2) * 100;
  const pointsForNextLevel = nextLevelPoints - userStats.points;
  const progressPercentage = ((userStats.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;

  const levelBadgeSize = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const getLevelColor = (level: number) => {
    if (level >= 25) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
    if (level >= 15) return 'bg-gradient-to-r from-blue-500 to-purple-500 text-white';
    if (level >= 10) return 'bg-gradient-to-r from-green-500 to-blue-500 text-white';
    if (level >= 5) return 'bg-gradient-to-r from-yellow-500 to-green-500 text-white';
    return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <Badge 
              variant="outline" 
              className={cn(
                "border-2 font-bold flex items-center gap-1",
                levelBadgeSize[size],
                getLevelColor(userStats.level)
              )}
            >
              <Star className={cn(
                size === 'sm' ? 'h-3 w-3' : 
                size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'
              )} />
              Level {userStats.level}
            </Badge>
            
            {showProgress && userStats.level < 50 && (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <Progress 
                  value={Math.max(0, Math.min(100, progressPercentage))} 
                  className={cn(
                    "flex-1",
                    size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-2.5'
                  )} 
                />
                <TrendingUp className={cn(
                  "text-muted-foreground",
                  size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
                )} />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center space-y-1">
            <div className="font-semibold">Level {userStats.level}</div>
            <div className="text-sm">{userStats.points.toLocaleString()} total points</div>
            {userStats.level < 50 && (
              <div className="text-xs text-muted-foreground">
                {pointsForNextLevel.toLocaleString()} points to Level {userStats.level + 1}
              </div>
            )}
            {userStats.level >= 50 && (
              <div className="text-xs text-muted-foreground text-yellow-400">
                🏆 Max Level Reached! 🏆
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}