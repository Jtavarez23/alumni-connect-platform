import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SchoolAlumniStatsProps {
  schoolId: string;
  currentCount: number;
  recentCount: number;
  growthPercentage?: number;
  timeframe?: '24h' | '7d' | '30d';
  size?: 'sm' | 'md' | 'lg';
  showGrowth?: boolean;
}

export const SchoolAlumniStats: React.FC<SchoolAlumniStatsProps> = ({
  currentCount,
  recentCount,
  growthPercentage = 0,
  timeframe = '24h',
  size = 'md',
  showGrowth = true
}) => {
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const badgeSize = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1'
  };

  return (
    <div className={cn("flex items-center gap-2", sizeClasses[size])}>
      {/* Current Alumni Count */}
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium text-foreground">
          {formatCount(currentCount)}
        </span>
      </div>

      {/* Recent Activity */}
      {recentCount > 0 && (
        <Badge 
          variant="secondary" 
          className={cn(
            "flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20",
            badgeSize[size]
          )}
        >
          <Activity className="h-3 w-3" />
          <span>+{recentCount}</span>
          <span className="text-muted-foreground">{timeframe}</span>
        </Badge>
      )}

      {/* Growth Indicator */}
      {showGrowth && growthPercentage !== 0 && (
        <div className={cn(
          "flex items-center gap-1",
          growthPercentage > 0 ? "text-emerald-600" : "text-red-500"
        )}>
          {growthPercentage > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span className="text-xs font-medium">
            {Math.abs(growthPercentage)}%
          </span>
        </div>
      )}
    </div>
  );
};