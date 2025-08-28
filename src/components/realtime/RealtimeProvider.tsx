import React, { useState, useEffect } from 'react';
import { LiveReactionNotifications } from './LiveReactionNotifications';
import { BadgeCelebration } from './BadgeCelebration';
import { BadgeType } from '@/hooks/useGamification';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeType | null>(null);

  useEffect(() => {
    const handleBadgeEarned = (event: CustomEvent<BadgeType>) => {
      setCelebrationBadge(event.detail);
    };

    window.addEventListener('badgeEarned', handleBadgeEarned as EventListener);

    return () => {
      window.removeEventListener('badgeEarned', handleBadgeEarned as EventListener);
    };
  }, []);

  return (
    <>
      {children}
      <LiveReactionNotifications />
      {celebrationBadge && (
        <BadgeCelebration
          badge={celebrationBadge}
          onComplete={() => setCelebrationBadge(null)}
        />
      )}
    </>
  );
}