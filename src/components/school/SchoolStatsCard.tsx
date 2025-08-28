import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SchoolAlumniStats } from './SchoolAlumniStats';
import { AlumniActivityTicker } from './AlumniActivityTicker';
import { GraduationCap, MapPin, Users, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SchoolStatsCardProps {
  school: {
    id: string;
    name: string;
    type?: string;
    location?: any;
  };
  stats?: {
    currentAlumniCount: number;
    recentConnections24h: number;
    recentConnections7d: number;
    recentConnections30d: number;
    growthPercentage: number;
  };
  isSelected?: boolean;
  onClick?: () => void;
  showDetailedStats?: boolean;
}

export const SchoolStatsCard: React.FC<SchoolStatsCardProps> = ({
  school,
  stats,
  isSelected = false,
  onClick,
  showDetailedStats = false
}) => {
  const formatLocation = (location: any): string => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }
    if (location.city) return location.city;
    if (location.state) return location.state;
    return '';
  };

  const getSchoolTypeIcon = (type?: string) => {
    return <GraduationCap className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected && "ring-2 ring-primary ring-offset-2",
          onClick && "hover:bg-accent/5"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getSchoolTypeIcon(school.type)}
                  <h3 className="font-semibold text-foreground truncate">
                    {school.name}
                  </h3>
                </div>
                
                {formatLocation(school.location) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{formatLocation(school.location)}</span>
                  </div>
                )}
              </div>

              {school.type && (
                <Badge variant="outline" className="text-xs">
                  {school.type}
                </Badge>
              )}
            </div>

            {/* Stats Section */}
            {stats && (
              <div className="space-y-2">
                {/* Main Stats */}
                <SchoolAlumniStats
                  schoolId={school.id}
                  currentCount={stats.currentAlumniCount}
                  recentCount={stats.recentConnections24h}
                  growthPercentage={stats.growthPercentage}
                  timeframe="24h"
                  size="md"
                  showGrowth={showDetailedStats}
                />

                {/* Activity Tickers */}
                <div className="flex flex-wrap gap-1.5">
                  {stats.recentConnections24h > 0 && (
                    <AlumniActivityTicker
                      count={stats.recentConnections24h}
                      timeframe="24h"
                      variant="success"
                      animated={true}
                    />
                  )}
                  
                  {showDetailedStats && stats.recentConnections7d > 0 && (
                    <AlumniActivityTicker
                      count={stats.recentConnections7d}
                      timeframe="7d"
                      variant="accent"
                      animated={false}
                    />
                  )}
                </div>

                {/* Detailed Stats Tooltip */}
                {showDetailedStats && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <TrendingUp className="h-3 w-3" />
                        <span>View detailed analytics</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Total Alumni:</span>
                          <span className="font-medium">{stats.currentAlumniCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last 24h:</span>
                          <span className="font-medium">+{stats.recentConnections24h}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last 7 days:</span>
                          <span className="font-medium">+{stats.recentConnections7d}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last 30 days:</span>
                          <span className="font-medium">+{stats.recentConnections30d}</span>
                        </div>
                        {stats.growthPercentage !== 0 && (
                          <div className="flex justify-between pt-1 border-t border-border/50">
                            <span>Growth:</span>
                            <span className={cn(
                              "font-medium",
                              stats.growthPercentage > 0 ? "text-emerald-600" : "text-red-500"
                            )}>
                              {stats.growthPercentage > 0 ? '+' : ''}{stats.growthPercentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {/* No Stats Placeholder */}
            {!stats && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Connect with alumni to see stats</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};