import React from 'react';
import { LiveReactionNotifications } from './LiveReactionNotifications';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LiveReactionNotifications />
    </>
  );
}