import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlumniActivityTickerProps {
  count: number;
  timeframe: '24h' | '7d' | '30d';
  animated?: boolean;
  showIcon?: boolean;
  variant?: 'default' | 'accent' | 'success';
}

export const AlumniActivityTicker: React.FC<AlumniActivityTickerProps> = ({
  count,
  timeframe,
  animated = true,
  showIcon = true,
  variant = 'default'
}) => {
  const [displayCount, setDisplayCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate count changes
  useEffect(() => {
    if (!animated || count === displayCount) return;

    setIsAnimating(true);
    const duration = 1000; // 1 second
    const steps = 20;
    const increment = (count - displayCount) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      
      if (currentStep >= steps) {
        setDisplayCount(count);
        setIsAnimating(false);
        clearInterval(interval);
      } else {
        setDisplayCount(prev => Math.round(prev + increment));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [count, displayCount, animated]);

  // Set initial count without animation
  useEffect(() => {
    if (!animated) {
      setDisplayCount(count);
    }
  }, [count, animated]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return 'bg-accent/10 text-accent hover:bg-accent/20';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20';
      default:
        return 'bg-primary/10 text-primary hover:bg-primary/20';
    }
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case '24h':
        return 'today';
      case '7d':
        return 'this week';
      case '30d':
        return 'this month';
      default:
        return timeframe;
    }
  };

  if (count === 0) return null;

  return (
    <Badge 
      className={cn(
        "flex items-center gap-1.5 text-xs px-2 py-1 transition-all duration-200",
        getVariantStyles(),
        isAnimating && "scale-105",
        animated && count > displayCount && "animate-pulse"
      )}
    >
      {showIcon && (
        <div className="relative">
          <Activity className="h-3 w-3" />
          {animated && count > 0 && (
            <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-current rounded-full animate-ping opacity-75" />
          )}
        </div>
      )}
      
      <span className="font-medium">
        +{animated ? displayCount : count}
      </span>
      
      <span className="text-muted-foreground flex items-center gap-0.5">
        <Clock className="h-2.5 w-2.5" />
        {getTimeframeLabel()}
      </span>
    </Badge>
  );
};