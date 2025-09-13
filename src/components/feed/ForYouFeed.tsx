import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Sparkles, Clock, Loader2 } from 'lucide-react';
import { useForYouFeed } from '@/hooks/useFeed';

// Mock trending posts data - will be replaced with actual API calls
interface TrendingPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
    school: string;
    graduation_year: number;
    trust_level: 'verified_alumni' | 'unverified';
  };
  content: {
    text?: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      alt?: string;
    }>;
    yearbook_snippet?: {
      yearbook_id: string;
      page_number: number;
      preview_url: string;
    };
  };
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    trending_score: number;
  };
  created_at: string;
  visibility: 'public' | 'alumni_only';
  trending_reason: string;
}

const mockTrendingPosts: TrendingPost[] = [
  {
    id: '1',
    author: {
      id: 'user1',
      name: 'Sarah Johnson',
      avatar_url: undefined,
      school: 'Lincoln High School',
      graduation_year: 2018,
      trust_level: 'verified_alumni',
    },
    content: {
      text: "Just found our class president in this yearbook! So many memories from senior year 🎓 Who else remembers the epic senior prank?",
      yearbook_snippet: {
        yearbook_id: 'yb1',
        page_number: 42,
        preview_url: '/api/placeholder/300/200', // Mock URL
      }
    },
    metrics: {
      likes: 47,
      comments: 23,
      shares: 12,
      trending_score: 85,
    },
    created_at: '2024-01-10T14:30:00Z',
    visibility: 'public',
    trending_reason: 'Popular in Lincoln High School Class of 2018',
  },
  {
    id: '2',
    author: {
      id: 'user2',
      name: 'Mike Rodriguez',
      avatar_url: undefined,
      school: 'Roosevelt High School',
      graduation_year: 2015,
      trust_level: 'verified_alumni',
    },
    content: {
      text: "Reunion planning is in full swing! 🎉 Who's ready to see how everyone's doing after 9 years? Already booked the venue!",
    },
    metrics: {
      likes: 34,
      comments: 18,
      shares: 8,
      trending_score: 72,
    },
    created_at: '2024-01-10T12:15:00Z',
    visibility: 'alumni_only',
    trending_reason: 'High engagement from Roosevelt High alumni',
  },
];

export function ForYouFeed() {
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useForYouFeed();

  // Flatten all pages into a single array of posts
  const posts = feedData?.pages.flatMap(page => page.items) || [];

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-32 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* For You Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Discover What's Trending</h3>
              <p className="text-sm text-muted-foreground">
                Popular posts and conversations across alumni networks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trending Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="relative">
            {/* Trending Indicator */}
            <div className="absolute -top-2 left-4 z-10">
              <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                <TrendingUp className="h-3 w-3" />
                Trending
              </div>
            </div>
            
            <PostCard post={post} />
            
            {/* Trending Reason */}
            <div className="mt-2 px-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {post.trending_reason}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="text-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}