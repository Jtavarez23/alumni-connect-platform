import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Trophy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserStats } from '@/hooks/useGamification';

interface StreakTrackerProps {
  userStats: UserStats | null;
  loading?: boolean;
  className?: string;
}

export function StreakTracker({ userStats, loading, className }: StreakTrackerProps) {
  if (loading || !userStats) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Activity Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextMilestone = userStats.current_streak < 7 ? 7 : userStats.current_streak < 30 ? 30 : 100;
  const progressToNextMilestone = Math.min((userStats.current_streak / nextMilestone) * 100, 100);
  
  const isOnFire = userStats.current_streak >= 7;
  const isLegendary = userStats.current_streak >= 30;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Flame className={cn(
              "h-5 w-5",
              isLegendary ? "text-purple-500" : isOnFire ? "text-orange-500" : "text-gray-400"
            )} />
            Activity Streak
          </div>
          {isOnFire && (
            <Badge variant={isLegendary ? "default" : "secondary"} className="text-xs">
              {isLegendary ? "🔥 Legendary!" : "🔥 On Fire!"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {userStats.current_streak}
          </div>
          <div className="text-sm text-muted-foreground">
            {userStats.current_streak === 1 ? 'day' : 'days'} current streak
          </div>
        </div>

        {/* Progress to Next Milestone */}
        {userStats.current_streak < nextMilestone && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Next milestone: {nextMilestone} days
              </span>
              <span className="font-medium">
                {nextMilestone - userStats.current_streak} to go
              </span>
            </div>
            <Progress value={progressToNextMilestone} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <div className="text-sm font-semibold">{userStats.longest_streak}</div>
            <div className="text-xs text-muted-foreground">Best streak</div>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <Target className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <div className="text-sm font-semibold">Level {userStats.level}</div>
            <div className="text-xs text-muted-foreground">{userStats.points} points</div>
          </div>
        </div>

        {/* Streak Motivation */}
        <div className="text-center text-xs text-muted-foreground">
          {userStats.current_streak === 0 
            ? "Start your streak today! 🎯"
            : userStats.current_streak < 7
            ? "Keep it up! You're building momentum 💪"
            : userStats.current_streak < 30
            ? "Amazing streak! You're on fire 🔥"
            : "Legendary streak! You're a true champion 👑"
          }
        </div>
      </CardContent>
    </Card>
  );
}