import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Award, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeCelebrationProps {
  badge: {
    name: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
  onComplete?: () => void;
}

const getRarityIcon = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return Crown;
    case 'epic': return Award;
    case 'rare': return Star;
    default: return Trophy;
  }
};

const getRarityColors = (rarity: string) => {
  switch (rarity) {
    case 'legendary': 
      return {
        gradient: 'from-yellow-400 via-yellow-500 to-amber-600',
        glow: 'shadow-yellow-400/50',
        text: 'text-yellow-900'
      };
    case 'epic':
      return {
        gradient: 'from-purple-400 via-purple-500 to-purple-600',
        glow: 'shadow-purple-400/50',
        text: 'text-purple-900'
      };
    case 'rare':
      return {
        gradient: 'from-blue-400 via-blue-500 to-blue-600',
        glow: 'shadow-blue-400/50',
        text: 'text-blue-900'
      };
    default:
      return {
        gradient: 'from-green-400 via-green-500 to-green-600',
        glow: 'shadow-green-400/50',
        text: 'text-green-900'
      };
  }
};

export function BadgeCelebration({ badge, onComplete }: BadgeCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const Icon = getRarityIcon(badge.rarity);
  const colors = getRarityColors(badge.rarity);

  useEffect(() => {
    // Trigger animation
    const timer1 = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-hide after 5 seconds
    const timer2 = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500);
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <>
      {/* Confetti Effect */}
      <div className="fixed inset-0 pointer-events-none z-[100]">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-2 h-2 rounded-full animate-pulse",
              colors.gradient.split(' ').slice(0, 1)[0].replace('from-', 'bg-')
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: '3s'
            }}
          />
        ))}
      </div>

      {/* Badge Card */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
        <Card 
          className={cn(
            "w-full max-w-md transform transition-all duration-500",
            `bg-gradient-to-br ${colors.gradient}`,
            `shadow-2xl ${colors.glow}`,
            isVisible && !isExiting ? "scale-100 opacity-100" : "scale-75 opacity-0",
            isExiting && "animate-scale-out"
          )}
        >
          <CardContent className="p-8 text-center text-white">
            {/* Main Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-scale-in">
                <Icon className="h-12 w-12 text-white animate-pulse" />
              </div>
              
              {/* Sparkles */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-white/30 rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white/20 rounded-full animate-ping delay-300"></div>
            </div>

            {/* Badge Info */}
            <div className="space-y-4">
              <Badge 
                variant="secondary" 
                className="bg-white/20 text-white border-white/30 uppercase tracking-wider"
              >
                {badge.rarity} Badge Earned!
              </Badge>
              
              <h2 className="text-2xl font-bold text-white animate-fade-in">
                {badge.title}
              </h2>
              
              <p className="text-white/90 animate-fade-in delay-200">
                {badge.description}
              </p>
            </div>

            {/* Level Up Effect */}
            <div className="mt-6 flex justify-center">
              <div className="px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Achievement Unlocked!
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}