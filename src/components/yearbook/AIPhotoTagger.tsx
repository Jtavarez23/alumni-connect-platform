import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, User, Tag, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DetectedPerson {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  claimed_by?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  } | null;
  suggested_name?: string;
}

interface AIPhotoTaggerProps {
  imageUrl: string;
  pageId: string;
  editable?: boolean;
  className?: string;
}

export function AIPhotoTagger({ imageUrl, pageId, editable = false, className = "" }: AIPhotoTaggerProps) {
  const [detectedPeople, setDetectedPeople] = useState<DetectedPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredPerson, setHoveredPerson] = useState<string | null>(null);
  const [processingAI, setProcessingAI] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadExistingTags();
  }, [pageId]);

  const loadExistingTags = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_tags')
        .select(`
          *,
          tagged_user:profiles(id, display_name, avatar_url)
        `)
        .eq('page_id', pageId);

      if (error) throw error;
      
      const tags = data?.map(tag => ({
        id: tag.id,
        x: tag.x_position,
        y: tag.y_position,
        width: tag.width,
        height: tag.height,
        confidence: tag.confidence || 0.9,
        claimed_by: tag.tagged_user,
        suggested_name: tag.suggested_name
      })) || [];

      setDetectedPeople(tags);
    } catch (error) {
      console.error('Error loading photo tags:', error);
    }
  };

  const runAIPhotoDetection = async () => {
    setProcessingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-yearbook-faces', {
        body: { 
          imageUrl,
          pageId 
        }
      });

      if (error) throw error;

      const newDetections = data?.detections?.map((detection: any) => ({
        id: crypto.randomUUID(),
        x: detection.x,
        y: detection.y,
        width: detection.width,
        height: detection.height,
        confidence: detection.confidence,
        suggested_name: detection.suggested_name
      })) || [];

      setDetectedPeople(prev => [...prev, ...newDetections]);
      toast.success(`Detected ${newDetections.length} people in photo`);

    } catch (error) {
      console.error('AI detection failed:', error);
      toast.error('AI photo detection failed');
    } finally {
      setProcessingAI(false);
    }
  };

  const claimPhoto = async (personId: string) => {
    if (!user) return;

    try {
      const person = detectedPeople.find(p => p.id === personId);
      if (!person) return;

      const { error } = await supabase
        .from('photo_tags')
        .insert({
          page_id: pageId,
          tagged_user_id: user.id,
          x_position: person.x,
          y_position: person.y,
          width: person.width,
          height: person.height,
          confidence: person.confidence,
          tag_type: 'self_claimed'
        });

      if (error) throw error;

      // Update local state
      setDetectedPeople(prev => prev.map(p => 
        p.id === personId 
          ? { 
              ...p, 
              claimed_by: {
                id: user.id,
                display_name: user.user_metadata?.display_name || user.email || 'Unknown',
                avatar_url: user.user_metadata?.avatar_url
              }
            }
          : p
      ));

      toast.success('Photo claimed successfully!');
    } catch (error) {
      console.error('Error claiming photo:', error);
      toast.error('Failed to claim photo');
    }
  };

  const PersonHoverCard = ({ person }: { person: DetectedPerson }) => {
    if (!person.claimed_by) return null;

    return (
      <div className="absolute z-50 bg-background border rounded-lg shadow-lg p-3 min-w-64 pointer-events-none"
           style={{
             left: `${person.x + person.width + 10}px`,
             top: `${person.y}px`,
           }}>
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={person.claimed_by.avatar_url} />
            <AvatarFallback>
              {person.claimed_by.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-sm">{person.claimed_by.display_name}</h4>
            <p className="text-xs text-muted-foreground">Class of 2024</p>
            <div className="flex gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">Drama Club</Badge>
              <Badge variant="secondary" className="text-xs">Honor Roll</Badge>
            </div>
          </div>
        </div>
        <Button size="sm" className="w-full mt-2 h-7 text-xs">
          View Profile
        </Button>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative inline-block">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Yearbook page"
          className="max-w-full h-auto rounded-lg"
          onLoad={() => {
            // Image loaded, positions are now accurate
          }}
        />

        {/* AI Processing Overlay */}
        {processingAI && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-8 h-8 animate-pulse mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">AI analyzing faces...</p>
            </div>
          </div>
        )}

        {/* Photo Tags */}
        {detectedPeople.map((person) => (
          <div key={person.id}>
            {/* Detection Box */}
            <div
              className={`absolute border-2 rounded-md transition-all duration-200 cursor-pointer ${
                person.claimed_by
                  ? 'border-yellow-500 bg-yellow-500/20 shadow-lg shadow-yellow-500/50'
                  : 'border-primary bg-primary/20 hover:bg-primary/30'
              }`}
              style={{
                left: `${person.x}%`,
                top: `${person.y}%`,
                width: `${person.width}%`,
                height: `${person.height}%`,
              }}
              onMouseEnter={() => setHoveredPerson(person.id)}
              onMouseLeave={() => setHoveredPerson(null)}
              onClick={() => {
                if (!person.claimed_by && editable) {
                  claimPhoto(person.id);
                }
              }}
            >
              {/* Golden silhouette effect for claimed photos */}
              {person.claimed_by && (
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 to-yellow-600/30 rounded-md animate-pulse" />
              )}
              
              {/* Tag indicator */}
              <div className="absolute -top-2 -right-2">
                {person.claimed_by ? (
                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black h-5 px-1">
                    <Check className="w-3 h-3" />
                  </Badge>
                ) : (
                  <Badge variant="default" className="h-5 px-1">
                    <Tag className="w-3 h-3" />
                  </Badge>
                )}
              </div>
            </div>

            {/* Hover Card */}
            {hoveredPerson === person.id && person.claimed_by && (
              <PersonHoverCard person={person} />
            )}
          </div>
        ))}
      </div>

      {/* AI Controls */}
      {editable && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={runAIPhotoDetection}
              disabled={processingAI}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {processingAI ? 'Detecting...' : 'AI Detect Faces'}
            </Button>
            <Badge variant="secondary" className="text-xs">
              {detectedPeople.length} people detected
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground">
            {detectedPeople.filter(p => p.claimed_by).length} claimed • 
            {detectedPeople.filter(p => !p.claimed_by).length} unclaimed
          </div>
        </div>
      )}

      {/* Instructions */}
      {editable && detectedPeople.some(p => !p.claimed_by) && (
        <Card className="mt-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              Click on highlighted faces to claim your photos. Claimed photos show with a golden glow.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}