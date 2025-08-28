import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Camera, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreateThenVsNowDialog } from "./CreateThenVsNowDialog";
import { ReactionSystem } from "./ReactionSystem";

interface ThenVsNowPost {
  id: string;
  user_id: string;
  then_photo_url: string;
  now_photo_url: string;
  caption?: string;
  visibility: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    username?: string;
  };
}

export const ThenVsNowPosts = () => {
  const [posts, setPosts] = useState<ThenVsNowPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      // For now, show demo message since then_vs_now_posts table doesn't exist yet
      const data = [];
      const error = null;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching then vs now posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    fetchPosts();
    setShowCreateDialog(false);
    toast({
      title: "Success",
      description: "Your Then vs Now post has been created!",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Then vs Now</h2>
          <Button disabled>
            <Camera className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded-lg"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Then vs Now</h2>
          <p className="text-muted-foreground">
            Share your transformation journey with classmates
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Camera className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share a Then vs Now comparison!
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Camera className="h-4 w-4 mr-2" />
              Create Your First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback>
                        {post.profiles?.first_name?.[0]}
                        {post.profiles?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {post.profiles?.first_name} {post.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {post.visibility}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Then vs Now Images */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">Then</p>
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={post.then_photo_url}
                        alt="Then photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">Now</p>
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={post.now_photo_url}
                        alt="Now photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Caption */}
                {post.caption && (
                  <p className="text-sm">{post.caption}</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm">
                      <Heart className="h-4 w-4 mr-2" />
                      Like
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Comment
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateThenVsNowDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};