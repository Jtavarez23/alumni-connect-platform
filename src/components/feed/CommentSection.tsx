import React, { useState } from 'react';
import { useComments, Comment } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface CommentSectionProps {
  postId: string;
  className?: string;
}

export function CommentSection({ postId, className }: CommentSectionProps) {
  const { user } = useAuth();
  const { comments, loading, error, totalCount, hasMore, addComment, deleteComment, loadMore, refresh } = useComments(postId);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-load comments when component mounts
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await addComment(newComment);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await deleteComment(commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Comments {totalCount > 0 && `(${totalCount})`}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Comment form */}
        {user && (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback>
                {getInitials(user.user_metadata?.first_name, user.user_metadata?.last_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-10 resize-none"
                disabled={submitting}
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={!newComment.trim() || submitting}
                className="h-10"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        )}

        {/* Comments list */}
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={comment.author.avatar_url} />
                <AvatarFallback>
                  {getInitials(comment.author.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{comment.author.name}</p>
                    <p className="text-sm text-muted-foreground">{comment.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {(user?.id === comment.author.id || user?.user_metadata?.trust_level === 'admin') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {comments.length === 0 && !loading && (
            <p className="text-center text-muted-foreground text-sm py-4">
              No comments yet. Be the first to comment!
            </p>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load More Comments
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}