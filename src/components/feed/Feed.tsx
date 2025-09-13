import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Users, TrendingUp, Search, Filter, BarChart3 } from 'lucide-react';
import { PostCard } from './PostCard';
import { CreatePost } from './CreatePost';
import { UserAnalytics } from '../analytics/UserAnalytics';
import { useNetworkFeed, useForYouFeed, FeedItem } from '@/hooks/useFeeds';

interface FeedProps {
  className?: string;
}

export function Feed({ className }: FeedProps) {
  const [activeTab, setActiveTab] = useState<'network' | 'foryou' | 'analytics'>('network');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const networkFeed = useNetworkFeed();
  const forYouFeed = useForYouFeed();

  const currentFeed = activeTab === 'network' ? networkFeed : forYouFeed;

  const handleRefresh = async () => {
    await currentFeed.refresh();
  };

  const handleLoadMore = async () => {
    await currentFeed.fetchMore();
  };

  const filterFeedItems = (items: FeedItem[]): FeedItem[] => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase().trim();
    return items.filter(item => 
      item.content.text?.toLowerCase().includes(query) ||
      item.author.name.toLowerCase().includes(query) ||
      item.author.school?.toLowerCase().includes(query)
    );
  };

  const filteredItems = filterFeedItems(currentFeed.items);

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'network' | 'foryou' | 'analytics')}>
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Network
              </TabsTrigger>
              <TabsTrigger value="foryou" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                For You
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={currentFeed.loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${currentFeed.loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts, people, or schools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">
                Advanced filters coming soon...
              </div>
            </div>
          )}
        </div>

        <TabsContent value="network" className="space-y-4">
          <CreatePost 
            onPostCreated={networkFeed.refresh}
            className="mb-6"
          />
          <FeedContent 
            feed={{ ...networkFeed, items: filteredItems }}
            onLoadMore={handleLoadMore}
            emptyMessage="Your network feed is empty. Connect with more alumni to see their posts!"
            searchActive={!!searchQuery.trim()}
          />
        </TabsContent>

        <TabsContent value="foryou" className="space-y-4">
          <CreatePost 
            onPostCreated={forYouFeed.refresh}
            className="mb-6"
          />
          <FeedContent 
            feed={{ ...forYouFeed, items: filteredItems }}
            onLoadMore={handleLoadMore}
            emptyMessage="No trending posts right now. Be the first to share something interesting!"
            searchActive={!!searchQuery.trim()}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <UserAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface FeedContentProps {
  feed: {
    items: FeedItem[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
  };
  onLoadMore: () => void;
  emptyMessage: string;
  searchActive?: boolean;
}

function FeedContent({ feed, onLoadMore, emptyMessage, searchActive }: FeedContentProps) {
  if (feed.error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{feed.error}</p>
        <Button 
          variant="outline" 
          onClick={onLoadMore}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (feed.items.length === 0 && !feed.loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchActive 
            ? "No posts found matching your search."
            : emptyMessage
          }
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {feed.items.map((item) => (
          <PostCard 
            key={item.id} 
            post={{
              id: item.id,
              author: {
                id: item.author.id,
                name: item.author.name,
                avatar_url: item.author.avatar_url,
                school: item.author.school || '',
                graduation_year: item.author.graduation_year || 0,
                trust_level: item.author.trust_level as 'verified_alumni' | 'unverified'
              },
              content: {
                text: item.content.text,
                media: item.content.media?.map(url => ({
                  type: url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'image',
                  url: url
                }))
              },
              metrics: {
                likes: item.metrics.likes,
                comments: item.metrics.comments,
                shares: item.metrics.shares
              },
              created_at: item.created_at,
              visibility: item.visibility as 'alumni_only' | 'public'
            }}
          />
        ))}
      </div>

      {feed.loading && (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      )}

      {feed.hasMore && !feed.loading && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
          >
            Load More
          </Button>
        </div>
      )}
    </>
  );
}