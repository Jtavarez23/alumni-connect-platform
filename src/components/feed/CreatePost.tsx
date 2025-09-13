import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCreatePost } from '@/hooks/useFeeds';
import { getInitials } from '@/lib/utils';

interface CreatePostProps {
  onPostCreated?: () => void;
  className?: string;
}

export function CreatePost({ onPostCreated, className }: CreatePostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createPost, loading } = useCreatePost();
  
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && mediaFiles.length === 0) return;

    setUploading(true);
    
    try {
      let mediaUrls: string[] = [];
      
      // Upload media files if any
      if (mediaFiles.length > 0) {
        mediaUrls = await uploadMediaFiles();
      }

      await createPost({
        text: content.trim(),
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        visibility: 'alumni_only'
      });

      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setIsExpanded(false);
      
      toast({
        title: 'Post created',
        description: 'Your post has been shared with the community.',
      });

      onPostCreated?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadMediaFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of mediaFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `post-media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        urls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Upload Error',
          description: 'Failed to upload one or more files.',
          variant: 'destructive',
        });
      }
    }

    return urls;
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 4 - mediaFiles.length); // Max 4 files
    const newPreviews: string[] = [];

    newFiles.forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast({
            title: 'File too large',
            description: 'Please select files under 10MB.',
            variant: 'destructive',
          });
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
        setMediaFiles(prev => [...prev, file]);
      }
    });

    setMediaPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  if (!user) return null;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback>
                {getInitials(user.user_metadata?.first_name, user.user_metadata?.last_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                placeholder="Share something with your alumni network..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                className="min-h-12 resize-none"
                disabled={loading}
              />
              
              {isExpanded && (
                <div className="flex items-center justify-between pt-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleMediaSelect}
                      className="hidden"
                      disabled={loading || uploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || uploading}
                      className="cursor-pointer"
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Add Media
                    </Button>
                  </label>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setContent('');
                        setIsExpanded(false);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      size="sm"
                      disabled={(!content.trim() && mediaFiles.length === 0) || loading || uploading}
                    >
                      {(loading || uploading) ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Post
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Previews */}
          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  {preview.startsWith('blob:') && mediaFiles[index]?.type.startsWith('image/') ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">
                        {mediaFiles[index]?.name}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}