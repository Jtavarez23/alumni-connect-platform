import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Image, 
  Link, 
  BookOpen, 
  Globe, 
  Users, 
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostComposerProps {
  className?: string;
  onPost?: (data: PostData) => void;
}

interface PostData {
  text: string;
  media?: File[];
  visibility: 'public' | 'alumni_only' | 'school_only' | 'connections_only' | 'private';
  yearbook_snippet?: string;
  link_preview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  };
}

const visibilityOptions = [
  { value: 'public', label: 'Public', icon: Globe, description: 'Everyone can see' },
  { value: 'alumni_only', label: 'Alumni Only', icon: Users, description: 'All verified alumni' },
  { value: 'school_only', label: 'School Only', icon: BookOpen, description: 'Your school only' },
  { value: 'connections_only', label: 'Connections', icon: Users, description: 'People you know' },
  { value: 'private', label: 'Private', icon: Lock, description: 'Only you' },
] as const;

export function PostComposer({ className = "", onPost }: PostComposerProps) {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<PostData['visibility']>('alumni_only');
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [linkPreview, setLinkPreview] = useState<PostData['link_preview']>();
  const [showYearbookSelector, setShowYearbookSelector] = useState(false);
  const [yearbookSnippet, setYearbookSnippet] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentVisibility = visibilityOptions.find(opt => opt.value === visibility);

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Validate file types and sizes per AC-ARCH-004
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB max
      return isValidType && isValidSize;
    });
    
    setSelectedMedia(prev => [...prev, ...validFiles].slice(0, 4)); // Max 4 files
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-detect links for preview
  const detectLinks = (text: string) => {
    const urlRegex = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/g;
    const matches = text.match(urlRegex);
    if (matches && matches.length > 0 && !linkPreview) {
      // In a real implementation, you'd fetch the link metadata
      setLinkPreview({
        url: matches[0],
        title: 'Link Preview',
        description: 'Click to preview link content',
      });
    }
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    detectLinks(newText);
  };

  const handleSubmit = async () => {
    if (!text.trim() && selectedMedia.length === 0 && !yearbookSnippet) return;
    
    setIsPosting(true);
    try {
      const postData: PostData = {
        text: text.trim(),
        media: selectedMedia.length > 0 ? selectedMedia : undefined,
        visibility,
        link_preview: linkPreview,
        yearbook_snippet: yearbookSnippet,
      };
      
      await onPost?.(postData);
      
      // Reset form
      setText('');
      setSelectedMedia([]);
      setVisibility('alumni_only');
      setLinkPreview(undefined);
      setYearbookSnippet(undefined);
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className={`${className} border-0 shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* User Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="text-sm">
              {getInitials(profile?.first_name, profile?.last_name)}
            </AvatarFallback>
          </Avatar>

          {/* Composer Content */}
          <div className="flex-1 space-y-3">
            {/* Text Input */}
            <Textarea
              placeholder="What's new? Share memories, updates, or yearbook moments..."
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
            />

            {/* Link Preview */}
            {linkPreview && (
              <div className="border rounded-lg p-3 bg-muted/30 relative">
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => setLinkPreview(undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{linkPreview.title}</div>
                  <div className="text-xs text-muted-foreground">{linkPreview.description}</div>
                  <div className="text-xs text-primary">{linkPreview.url}</div>
                </div>
              </div>
            )}

            {/* Yearbook Snippet Preview */}
            {yearbookSnippet && (
              <div className="border rounded-lg p-3 bg-muted/30 relative">
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => setYearbookSnippet(undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm">Yearbook memory attached</span>
                </div>
              </div>
            )}

            {/* Media Preview */}
            {selectedMedia.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {selectedMedia.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Video: {file.name}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions Row */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {/* Media Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Image className="h-4 w-4" />
                </Button>

                {/* Link Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = prompt('Enter a link URL:');
                    if (url) {
                      setLinkPreview({
                        url,
                        title: 'Manual Link',
                        description: 'Added by user',
                      });
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link className="h-4 w-4" />
                </Button>

                {/* Yearbook Snippet Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // In a real implementation, this would open a yearbook selector dialog
                    setYearbookSnippet('sample-yearbook-snippet-id');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>

                {/* Visibility Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <currentVisibility.icon className="h-4 w-4 mr-1" />
                      <span className="text-xs">{currentVisibility.label}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {visibilityOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setVisibility(option.value)}
                      >
                        <option.icon className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Post Button */}
              <Button
                onClick={handleSubmit}
                disabled={(!text.trim() && selectedMedia.length === 0 && !yearbookSnippet) || isPosting}
                size="sm"
                className="px-6"
              >
                {isPosting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}