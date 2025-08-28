import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Target, TrendingUp } from 'lucide-react';
import { useGamificationContext } from './GamificationProvider';
import { BadgeDisplay } from './BadgeDisplay';
import { UserLevel } from './UserLevel';
import { StreakTracker } from './StreakTracker';

export function GamificationWidget() {
  const { userBadges, userStats, loading } = useGamificationContext();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const recentBadges = userBadges.slice(0, 3);
  
  return (
    <div className="space-y-6">
      {/* Level & Points Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserLevel userStats={userStats} showProgress={true} size="lg" />
          
          {userStats && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{userStats.points}</div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-500">{userBadges.length}</div>
                <div className="text-sm text-muted-foreground">Badges Earned</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Badges */}
      {userBadges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Recent Badges
              </div>
              <Badge variant="outline">{userBadges.length} earned</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center">
              {recentBadges.map((badge) => (
                <BadgeDisplay 
                  key={badge.id} 
                  badge={badge} 
                  size="lg" 
                  showTitle={true}
                />
              ))}
            </div>
            {userBadges.length > 3 && (
              <div className="text-center mt-3">
                <Badge variant="secondary" className="text-xs">
                  +{userBadges.length - 3} more badges
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Stats */}
      {userStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 border rounded-lg">
                <div className="text-lg font-semibold">{userStats.total_reactions}</div>
                <div className="text-xs text-muted-foreground">Reactions</div>
              </div>
              <div className="text-center p-2 border rounded-lg">
                <div className="text-lg font-semibold">{userStats.total_tags}</div>
                <div className="text-xs text-muted-foreground">Tags</div>
              </div>
              <div className="text-center p-2 border rounded-lg">
                <div className="text-lg font-semibold">{userStats.total_connections}</div>
                <div className="text-xs text-muted-foreground">Connections</div>
              </div>
              <div className="text-center p-2 border rounded-lg">
                <div className="text-lg font-semibold">{userStats.total_yearbooks_viewed}</div>
                <div className="text-xs text-muted-foreground">Yearbooks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak Tracker */}
      <StreakTracker userStats={userStats} />
    </div>
  );
}