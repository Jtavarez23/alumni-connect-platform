import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Share2, Instagram, Facebook, Twitter, LinkedIn, Download, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareableMemoryCardProps {
  title: string;
  school: string;
  year: number;
  photos: Array<{
    url: string;
    name: string;
    avatar?: string;
  }>;
  className?: string;
}

export function ShareableMemoryCard({ title, school, year, photos, className }: ShareableMemoryCardProps) {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateShareCard = async (platform: string) => {
    setIsGenerating(true);
    try {
      // Simulate card generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const shareText = `Found my yearbook squad! ${school} Class of ${year} 🎓 Join us on ReconnectHive!`;
      const shareUrl = `${window.location.origin}?ref=share`;
      
      if (platform === 'copy') {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast.success("Share text copied to clipboard!");
        return;
      }
      
      let platformUrl = '';
      switch (platform) {
        case 'instagram':
          // Instagram doesn't support direct URL sharing, so we copy text
          await navigator.clipboard.writeText(shareText);
          toast.success("Share text copied! Paste it in your Instagram story.");
          break;
        case 'facebook':
          platformUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
          window.open(platformUrl, '_blank', 'width=600,height=400');
          break;
        case 'twitter':
          platformUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
          window.open(platformUrl, '_blank', 'width=600,height=400');
          break;
        case 'linkedin':
          platformUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
          window.open(platformUrl, '_blank', 'width=600,height=400');
          break;
      }
      
      toast.success("Memory card shared successfully!");
    } catch (error) {
      toast.error("Failed to share memory card");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCard = async () => {
    setIsGenerating(true);
    try {
      // Simulate card generation and download
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Memory card downloaded! Check your downloads folder.");
    } catch (error) {
      toast.error("Failed to download memory card");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("hover-scale", className)}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Memory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Memory Card</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview Card */}
          <div className="relative">
            <Card className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-2">
              <CardContent className="p-6 text-center space-y-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg gradient-text">
                    "{title}"
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      {school}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      Class of {year}
                    </Badge>
                  </div>
                </div>
                
                {/* Photo Grid */}
                <div className="grid grid-cols-2 gap-2 max-w-[200px] mx-auto">
                  {photos.slice(0, 4).map((photo, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={photo.avatar} />
                              <AvatarFallback className="text-xs">
                                {photo.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-1">
                        <p className="text-white text-xs font-medium truncate">
                          {photo.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Join us: ReconnectHive.com
                </div>
              </CardContent>
            </Card>
            
            {isGenerating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Generating card...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Share Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Share to:</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start"
                onClick={() => generateShareCard('instagram')}
                disabled={isGenerating}
              >
                <Instagram className="w-4 h-4 text-pink-600" />
                Instagram Story
              </Button>
              
              <Button
                variant="outline" 
                className="flex items-center gap-2 justify-start"
                onClick={() => generateShareCard('facebook')}
                disabled={isGenerating}
              >
                <Facebook className="w-4 h-4 text-blue-600" />
                Facebook
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start"
                onClick={() => generateShareCard('linkedin')}
                disabled={isGenerating}
              >
                <LinkedIn className="w-4 h-4 text-blue-700" />
                LinkedIn
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start"
                onClick={() => generateShareCard('twitter')}
                disabled={isGenerating}
              >
                <Twitter className="w-4 h-4 text-blue-500" />
                Twitter
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadCard}
                disabled={isGenerating}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => generateShareCard('copy')}
                disabled={isGenerating}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Sharing helps us grow the community and reconnect more classmates!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}