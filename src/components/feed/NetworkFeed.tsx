import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BookOpen, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNetworkFeed, useCreatePost } from '@/hooks/useFeed';
import { toast } from 'sonner';

// Mock data structure - will be replaced with actual API calls
interface Post {
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
  };
  created_at: string;
  visibility: 'public' | 'alumni_only' | 'school_only' | 'connections_only';
}

export function NetworkFeed() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useNetworkFeed();
  const createPost = useCreatePost();

  // Handle new post creation
  const handleCreatePost = async (postData: any) => {
    try {
      await createPost.mutateAsync({
        text: postData.text,
        media: postData.media,
        visibility: postData.visibility,
      });
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post. Please try again.');
    }
  };

  // Flatten all pages into a single array of posts
  const posts = feedData?.pages.flatMap(page => page.items) || [];

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <PostComposer onPost={handleCreatePost} />
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 p-4">
        <PostComposer onPost={handleCreatePost} />
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Failed to load your network feed.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message || 'Please try again later.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Post Composer */}
      <PostComposer onPost={handleCreatePost} />

      {/* Empty State for Network Feed */}
      {posts.length === 0 && (
        <div className="space-y-4">
          {/* Who to Reconnect Card */}
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Find Your Classmates</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect with people from your school to see their posts in your network feed.
              </p>
              <Button onClick={() => navigate('/network')}>
                <Users className="h-4 w-4 mr-2" />
                Discover People
              </Button>
            </CardContent>
          </Card>

          {/* Claim Yearbook Photo CTA - per AC-ARCH-001 spec */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <Camera className="h-12 w-12 mx-auto text-primary mb-4" />
              <h3 className="font-semibold mb-2">Claim Your Yearbook Photo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Find yourself in uploaded yearbooks to start finding classmates and build your network.
              </p>
              <Button onClick={() => navigate('/yearbooks')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Yearbooks
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
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