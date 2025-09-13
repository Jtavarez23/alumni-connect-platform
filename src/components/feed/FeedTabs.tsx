import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load feed components to reduce bundle size
const NetworkFeed = lazy(() => import('./NetworkFeed').then(m => ({ default: m.NetworkFeed })));
const ForYouFeed = lazy(() => import('./ForYouFeed').then(m => ({ default: m.ForYouFeed })));

const FeedSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="p-4 border rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-4 mt-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    ))}
  </div>
);

interface FeedTabsProps {
  className?: string;
}

export function FeedTabs({ className = "" }: FeedTabsProps) {
  const [activeTab, setActiveTab] = useState("network");

  return (
    <div className={`w-full ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Sticky Tab Bar - matches AC-ARCH-001 spec */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
          <TabsList className="w-full h-12 p-1 bg-muted/50">
            <TabsTrigger 
              value="network" 
              className="flex-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Network
            </TabsTrigger>
            <TabsTrigger 
              value="foryou"
              className="flex-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              For You
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Feed Content */}
        <TabsContent value="network" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<FeedSkeleton />}>
            <NetworkFeed />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="foryou" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<FeedSkeleton />}>
            <ForYouFeed />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}