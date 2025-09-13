import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, User, Heart, MessageCircle, Tag, BookOpen, Users, LayoutGrid, Monitor } from "lucide-react";
import { toast } from "sonner";
import { StudentTagDialog } from "./StudentTagDialog";
import { TaggedStudentsList } from "./TaggedStudentsList";
import { ReactionSystem } from "../social/ReactionSystem";
import { ShareableMemoryCard } from "../social/ShareableMemoryCard";
import { PageFlipYearbook } from "./PageFlipYearbook";
import { YearbookSocialHub } from "./YearbookSocialHub";
import { DesktopYearbookHub } from "./DesktopYearbookHub";
import { DesktopPageFlip } from "./DesktopPageFlip";
import { useIsMobile } from "@/hooks/use-mobile";

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  school_id: string;
  cover_image_url: string | null;
  page_count: number;
  schools: {
    name: string;
    type: string;
    location: any;
  };
}

interface YearbookEntry {
  id: string;
  student_name: string;
  photo_url: string | null;
  page_number: number;
  activities: string[];
  honors: string[];
  quote: string | null;
  profile_id: string | null;
}

interface YearbookViewerProps {
  yearbook: YearbookEdition;
  onBack: () => void;
}

export function YearbookViewer({ yearbook, onBack }: YearbookViewerProps) {
  const [entries, setEntries] = useState<YearbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntryForTag, setSelectedEntryForTag] = useState<YearbookEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'pages' | 'social'>('grid');
  const [useDesktopMode, setUseDesktopMode] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchEntries();
  }, [yearbook.id]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("yearbook_pages")
        .select("*")
        .eq("edition_id", yearbook.id)
        .order("student_name");

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching yearbook entries:", error);
      toast.error("Failed to load yearbook entries");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) =>
    entry.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.activities?.some(activity => 
      activity.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    entry.honors?.some(honor => 
      honor.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Auto-enable desktop mode for larger screens
  useEffect(() => {
    setUseDesktopMode(!isMobile && window.innerWidth >= 1200);
  }, [isMobile]);

  // Use desktop components for better experience on larger screens
  if (useDesktopMode && viewMode === 'pages') {
    return <DesktopPageFlip yearbook={yearbook} onBack={onBack} />;
  }

  if (useDesktopMode && (viewMode === 'grid' || viewMode === 'social')) {
    return <DesktopYearbookHub yearbook={yearbook} onBack={onBack} />;
  }

  // Render different view modes (mobile/tablet)
  if (viewMode === 'pages') {
    return <PageFlipYearbook yearbook={yearbook} onBack={onBack} />;
  }

  if (viewMode === 'social') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Yearbook
              </Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <YearbookSocialHub yearbookId={yearbook.id} yearbook={yearbook} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Yearbooks
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {yearbook.title || `${yearbook.schools.name} Yearbook`}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground">{yearbook.schools.name}</p>
                <Badge variant="secondary">{yearbook.year}</Badge>
              </div>
            </div>
            
            {/* View Mode Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex items-center gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'pages' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('pages')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Pages
                </Button>
                <Button
                  variant={viewMode === 'social' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('social')}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Social
                </Button>
              </div>
              
              {/* Desktop Mode Toggle */}
              {!isMobile && (
                <Button
                  variant={useDesktopMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseDesktopMode(!useDesktopMode)}
                  className="flex items-center gap-2"
                  title="Toggle Desktop Mode"
                >
                  <Monitor className="w-4 h-4" />
                  {useDesktopMode ? 'Desktop' : 'Standard'}
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search students, activities, or honors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="w-20 h-20 rounded-full mx-auto mb-3" />
                  <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                  <Skeleton className="h-3 w-1/2 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "No students found" : "No entries available"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms"
                : "This yearbook doesn't have any entries yet"}
            </p>
          </div>
        )}

        {/* Entries Grid */}
        {!loading && filteredEntries.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'student' : 'students'} found
              </p>
              <ShareableMemoryCard
                title="Found my yearbook squad!"
                school={yearbook.schools.name}
                year={yearbook.year}
                photos={filteredEntries.slice(0, 4).map(entry => ({
                  url: entry.photo_url || '',
                  name: entry.student_name,
                  avatar: entry.photo_url || ''
                }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEntries.map((entry) => (
                <Card
                  key={entry.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group relative"
                >
                  <CardContent className="p-4 text-center">
                    {/* Tag button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntryForTag(entry);
                      }}
                      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Tag className="w-3 h-3" />
                    </Button>

                    {/* Photo */}
                    <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-muted">
                      {entry.photo_url ? (
                        <img
                          src={entry.photo_url}
                          alt={entry.student_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                          <User className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                      {entry.student_name}
                    </h3>

                    {/* Page Number */}
                    {entry.page_number && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Page {entry.page_number}
                      </p>
                    )}

                    {/* Tagged students list */}
                    <div className="mb-2">
                      <TaggedStudentsList 
                        yearbookEntryId={entry.id} 
                        onTagUpdate={() => {
                          // Could refresh specific entry data if needed
                        }}
                      />
                    </div>

                    {/* Activities */}
                    {entry.activities && entry.activities.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Activities</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {entry.activities.slice(0, 2).map((activity, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                              {activity}
                            </Badge>
                          ))}
                          {entry.activities.length > 2 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              +{entry.activities.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Honors */}
                    {entry.honors && entry.honors.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Honors</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {entry.honors.slice(0, 2).map((honor, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs px-1 py-0">
                              {honor}
                            </Badge>
                          ))}
                          {entry.honors.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              +{entry.honors.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quote Preview */}
                    {entry.quote && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2 mt-2">
                        "{entry.quote}"
                      </p>
                    )}

                    {/* Social Interactions */}
                    <div className="mt-3 pt-2 border-t border-border">
                      <ReactionSystem 
                        entityId={entry.id} 
                        entityType="yearbook_entry"
                        className="justify-center mb-2"
                      />
                      
                      {entry.profile_id && (
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="ghost" className="h-8 px-2">
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Student Tag Dialog */}
      {selectedEntryForTag && (
        <StudentTagDialog
          open={!!selectedEntryForTag}
          onClose={() => setSelectedEntryForTag(null)}
          yearbookEntryId={selectedEntryForTag.id}
          studentName={selectedEntryForTag.student_name}
          onTagged={() => {
            // Could refresh the entries or show updated tag state
          }}
        />
      )}
    </div>
  );
}