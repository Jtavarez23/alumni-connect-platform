import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClassChannels } from '@/components/channels/ClassChannels';

export default function Channels() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Class Channels</h1>
          <p className="text-muted-foreground">
            Connect with your classmates in topic-based channels
          </p>
        </div>
        
        <ClassChannels />
      </div>
    </AppLayout>
  );
}