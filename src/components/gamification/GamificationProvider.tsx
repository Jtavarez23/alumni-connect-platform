import React, { createContext, useContext, ReactNode } from 'react';
import { useGamification } from '@/hooks/useGamification';
import type { BadgeType, UserBadge, UserStats } from '@/hooks/useGamification';

interface GamificationContextType {
  userBadges: UserBadge[];
  userStats: UserStats | null;
  badgeTypes: BadgeType[];
  loading: boolean;
  awardPoints: (points: number, activity: string) => Promise<void>;
  updateActivity: (activityType: 'reaction' | 'tag' | 'connection' | 'message' | 'yearbook_view') => Promise<void>;
  fetchGamificationData: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

interface GamificationProviderProps {
  children: ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const gamificationData = useGamification();

  return (
    <GamificationContext.Provider value={gamificationData}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamificationContext() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamificationContext must be used within a GamificationProvider');
  }
  return context;
}