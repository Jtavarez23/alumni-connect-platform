import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, ChevronUp, ChevronDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ReactionSystem } from "../social/ReactionSystem";
import { useIsMobile } from "@/hooks/use-mobile";

interface YearbookEntry {
  id: string;
  student_name: string;
  photo_url: string | null;
  page_number: number;
  activities: string[];
  honors: string[];
  quote: string | null;
  profile_id: string | null;
  edition_id: string;
  yearbook_editions: {
    title: string;
    year: number;
    schools: {
      name: string;
    };
  };
}

interface TikTokYearbookBrowserProps {
  open: boolean;
  onClose: () => void;
  initialEntryId?: string;
}

export const TikTokYearbookBrowser = ({ open, onClose, initialEntryId }: TikTokYearbookBrowserProps) => {
  const [entries, setEntries] = useState<YearbookEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<string, any>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      fetchEntries();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (initialEntryId && entries.length > 0) {
      const index = entries.findIndex(entry => entry.id === initialEntryId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [initialEntryId, entries]);

  const fetchEntries = async () => {
    try {
      // Fetch yearbook entries with school data
      const { data, error } = await supabase
        .from('yearbook_entries')
        .select(`
          *,
          yearbook_editions!inner(
            title,
            year,
            schools!inner(
              name
            )
          )
        `)
        .order('page_number');

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching yearbook entries:', error);
      toast({
        title: "Error",
        description: "Failed to load yearbook entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateEntry(-1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      navigateEntry(1);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const navigateEntry = (direction: number) => {
    setCurrentIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) return entries.length - 1;
      if (newIndex >= entries.length) return 0;
      return newIndex;
    });
  };

  const handleSwipe = (direction: 'up' | 'down') => {
    if (direction === 'up') {
      navigateEntry(1);
    } else {
      navigateEntry(-1);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleReaction = async (entryId: string, reactionType: string) => {
    if (!user) return;

    try {
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id, reaction_type')
        .eq('entity_id', entryId)
        .eq('entity_type', 'yearbook_entry')
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction
          await supabase
            .from('reactions')
            .delete()
            .eq('id', existingReaction.id);
        } else {
          // Update reaction
          await supabase
            .from('reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
        }
      } else {
        // Add new reaction
        await supabase
          .from('reactions')
          .insert({
            entity_id: entryId,
            entity_type: 'yearbook_entry',
            user_id: user.id,
            reaction_type: reactionType
          });
      }

      // Refresh reactions for this entry
      const { data: reactionData } = await supabase
        .from('reactions')
        .select('reaction_type, user_id')
        .eq('entity_id', entryId)
        .eq('entity_type', 'yearbook_entry');

      setReactions(prev => ({
        ...prev,
        [entryId]: reactionData || []
      }));
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  if (!open) return null;

  if (loading || entries.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading yearbook...</p>
        </div>
      </div>
    );
  }

  const currentEntry = entries[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-background/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {currentEntry.yearbook_editions.schools.name}
            </h2>
            <Badge variant="secondary">
              {currentEntry.yearbook_editions.year}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div 
        ref={containerRef}
        className="h-full flex items-center justify-center relative"
        style={{ 
          touchAction: isMobile ? 'pan-y' : 'auto'
        }}
      >
        <Card className="w-full max-w-md mx-4 overflow-hidden shadow-2xl">
          <div className="relative">
            {/* Student Photo */}
            <div className="aspect-[3/4] bg-muted relative overflow-hidden">
              {currentEntry.photo_url ? (
                <img
                  src={currentEntry.photo_url}
                  alt={currentEntry.student_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar className="w-32 h-32">
                    <AvatarFallback className="text-4xl">
                      {currentEntry.student_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              
              {/* Entry info overlay */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-xl font-bold mb-1">{currentEntry.student_name}</h3>
                <p className="text-sm opacity-90 mb-2">Page {currentEntry.page_number}</p>
                
                {currentEntry.quote && (
                  <p className="text-sm italic opacity-90 line-clamp-2 mb-2">
                    "{currentEntry.quote}"
                  </p>
                )}
                
                {currentEntry.activities && currentEntry.activities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {currentEntry.activities.slice(0, 3).map((activity, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {activity}
                      </Badge>
                    ))}
                    {currentEntry.activities.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{currentEntry.activities.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(currentEntry.id, 'like')}
                  className="flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">
                    {reactions[currentEntry.id]?.filter((r: any) => r.reaction_type === 'like').length || 0}
                  </span>
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

        {/* Navigation buttons */}
        {!isMobile && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
              onClick={() => navigateEntry(-1)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
              onClick={() => navigateEntry(1)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm text-muted-foreground">
          {currentIndex + 1} of {entries.length}
        </p>
        <div className="w-32 h-1 bg-muted rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / entries.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Mobile swipe areas */}
      {isMobile && (
        <>
          <div 
            className="absolute top-0 left-0 right-0 h-1/2 z-10"
            onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const handleTouchEnd = (e: TouchEvent) => {
                const endY = e.changedTouches[0].clientY;
                const diff = startY - endY;
                if (Math.abs(diff) > 50) {
                  handleSwipe(diff > 0 ? 'up' : 'down');
                }
                document.removeEventListener('touchend', handleTouchEnd);
              };
              document.addEventListener('touchend', handleTouchEnd);
            }}
          />
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/2 z-10"
            onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const handleTouchEnd = (e: TouchEvent) => {
                const endY = e.changedTouches[0].clientY;
                const diff = startY - endY;
                if (Math.abs(diff) > 50) {
                  handleSwipe(diff > 0 ? 'up' : 'down');
                }
                document.removeEventListener('touchend', handleTouchEnd);
              };
              document.addEventListener('touchend', handleTouchEnd);
            }}
          />
        </>
      )}
    </div>
  );
};