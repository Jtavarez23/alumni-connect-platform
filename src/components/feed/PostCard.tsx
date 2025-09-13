import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Flag,
  Eye,
  EyeOff
} from 'lucide-react';
import { useReactions, useUserReaction } from '@/hooks/useReactions';
import { useToast } from '@/components/ui/use-toast';
import { UrlSafetyBadge } from '@/components/common/UrlSafetyBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { CommentSection } from './CommentSection';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ReactionPicker, ReactionCounts } from './ReactionPicker';

interface PostCardProps {
  post: {
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
      total_reactions?: number;
      reactions?: Record<string, number>;
    };
    created_at: string;
    visibility: 'public' | 'alumni_only' | 'school_only' | 'connections_only' | 'private';
  };
  className?: string;
}

export function PostCard({ post, className }: PostCardProps) {
  const [showFullText, setShowFullText] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reactions, setReactions] = useState(post.metrics.reactions || {});
  const { recordPostView, recordPostClick } = useAnalytics();
  const { toggleReaction, loading: reactionLoading } = useReactions();
  const { userReaction, setUserReaction, fetchUserReaction } = useUserReaction(post.id);
  const { toast } = useToast();

  // Record post view and fetch user reaction when component mounts
  useEffect(() => {
    const recordView = async () => {
      await recordPostView(post.id, {
        deviceType: navigator.userAgent,
        location: 'feed',
        referralSource: 'feed_scroll'
      });
    };
    
    recordView();
    fetchUserReaction();
  }, [post.id, recordPostView, fetchUserReaction]);

  const handleReaction = async (reactionType: string) => {
    if (reactionLoading) return;
    
    try {
      const result = await toggleReaction(post.id, reactionType);
      
      // Update reactions state with backend response
      if (result.reactions) {
        setReactions(result.reactions);
      }
      
      // Update user reaction state
      setUserReaction(result.user_reaction);
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update reaction. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleShare = async () => {
    try {
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.author.name}`,
          text: post.content.text || 'Check out this post from Alumni Connect',
          url: `${window.location.origin}/posts/${post.id}`,
        });
      } else {
        // Fallback: Copy link to clipboard
        const url = `${window.location.origin}/posts/${post.id}`;
        await navigator.clipboard.writeText(url);
        
        toast({
          title: 'Link copied!',
          description: 'Post link has been copied to your clipboard.',
        });
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        title: 'Share failed',
        description: 'Could not share the post. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReport = () => {
    setIsReportDialogOpen(true);
  };

  const isLongText = post.content.text && post.content.text.length > 300;
  const displayText = isLongText && !showFullText 
    ? post.content.text!.substring(0, 300) + '...'
    : post.content.text;

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'public': return <Eye className="h-3 w-3" />;
      case 'alumni_only': return <EyeOff className="h-3 w-3" />;
      case 'school_only': return <EyeOff className="h-3 w-3" />;
      case 'connections_only': return <EyeOff className="h-3 w-3" />;
      case 'private': return <EyeOff className="h-3 w-3" />;
      default: return null;
    }
  };

  const getVisibilityText = () => {
    switch (post.visibility) {
      case 'public': return 'Public';
      case 'alumni_only': return 'Alumni Only';
      case 'school_only': return 'School Only';
      case 'connections_only': return 'Connections';
      case 'private': return 'Private';
      default: return '';
    }
  };

  return (
    <>
      <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatar_url} />
              <AvatarFallback>
                {getInitials(post.author.name.split(' ')[0], post.author.name.split(' ')[1])}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{post.author.name}</span>
                {post.author.trust_level === 'verified_alumni' && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{post.author.school} '{post.author.graduation_year.toString().slice(-2)}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {getVisibilityIcon()}
                  <span>{getVisibilityText()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Post Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleReport} className="text-destructive">
                <Flag className="h-4 w-4 mr-2" />
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content */}
        <div className="space-y-3">
          {/* Text Content */}
          {post.content.text && (
            <div>
              <p className="text-sm whitespace-pre-wrap">{displayText}</p>
              <UrlSafetyBadge text={post.content.text} className="mt-2" />
              {isLongText && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-primary hover:no-underline"
                  onClick={() => setShowFullText(!showFullText)}
                >
                  {showFullText ? 'Show less' : 'Show more'}
                </Button>
              )}
            </div>
          )}

          {/* Media Content */}
          {post.content.media && post.content.media.length > 0 && (
            <div className={cn(
              "grid gap-2 rounded-lg overflow-hidden",
              post.content.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}>
              {post.content.media.map((media, index) => (
                <div key={index} className="aspect-square bg-muted">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={media.alt || 'Post image'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Yearbook Snippet */}
          {post.content.yearbook_snippet && (
            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>📖 Yearbook Memory</span>
              </div>
              <div className="aspect-video bg-background rounded overflow-hidden">
                <img
                  src={post.content.yearbook_snippet.preview_url}
                  alt={`Yearbook page ${post.content.yearbook_snippet.page_number}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Reaction Counts Display */}
        {Object.values(reactions).some(count => count > 0) && (
          <div className="pt-3">
            <ReactionCounts reactions={reactions} />
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t">
          <div className="flex items-center gap-4">
            {/* Enhanced Reaction Picker */}
            <div className="group">
              <ReactionPicker
                onReactionSelect={handleReaction}
                currentReaction={userReaction}
                disabled={reactionLoading}
                className="transition-all"
              />
            </div>

            {/* Comment Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="h-8 gap-2 px-3"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{post.metrics.comments}</span>
            </Button>

            {/* Share Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-2 px-3"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-sm">{post.metrics.shares}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <ReportDialog
      isOpen={isReportDialogOpen}
      onClose={() => setIsReportDialogOpen(false)}
      targetTable="posts"
      targetId={post.id}
      targetName={`Post by ${post.author.name}`}
    />

    {showComments && (
      <CommentSection 
        postId={post.id} 
        className="mt-4"
      />
    )}
    </>
  );
}