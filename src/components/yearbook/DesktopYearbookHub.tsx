import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { 
  BookOpen,
  Users,
  Search,
  Filter,
  Grid3x3,
  LayoutGrid,
  List,
  Calendar,
  Trophy,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Download,
  Share2,
  Heart,
  MessageSquare,
  Settings,
  Maximize2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AIPhotoTagger } from "./AIPhotoTagger";
import { PageFlipYearbook } from "./PageFlipYearbook";
import { YearbookSocialHub } from "./YearbookSocialHub";

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  school_id: string;
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

interface DesktopYearbookHubProps {
  yearbook: YearbookEdition;
  onBack: () => void;
}

export function DesktopYearbookHub({ yearbook, onBack }: DesktopYearbookHubProps) {
  const [entries, setEntries] = useState<YearbookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<YearbookEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'pages' | 'social'>('grid');
  const [filterBy, setFilterBy] = useState<'all' | 'activities' | 'honors'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'page' | 'activities'>('name');
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();

  useEffect(() => {
    fetchEntries();
  }, [yearbook.id]);

  // Keyboard shortcuts for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case '1':
            e.preventDefault();
            setViewMode('grid');
            break;
          case '2':
            e.preventDefault();
            setViewMode('list');
            break;
          case '3':
            e.preventDefault();
            setViewMode('pages');
            break;
          case '4':
            e.preventDefault();
            setViewMode('social');
            break;
        }
      }

      // Navigation shortcuts
      if (e.key === 'Escape') {
        if (selectedEntry) {
          setSelectedEntry(null);
        } else {
          onBack();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntry, onBack]);

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
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedEntries = entries
    .filter(entry => {
      const matchesSearch = entry.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.activities?.some(activity => activity.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.honors?.some(honor => honor.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterBy === 'activities') {
        return matchesSearch && entry.activities && entry.activities.length > 0;
      }
      if (filterBy === 'honors') {
        return matchesSearch && entry.honors && entry.honors.length > 0;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.student_name.localeCompare(b.student_name);
        case 'page':
          return a.page_number - b.page_number;
        case 'activities':
          return (b.activities?.length || 0) - (a.activities?.length || 0);
        default:
          return 0;
      }
    });

  // Full-screen modes
  if (viewMode === 'pages') {
    return <PageFlipYearbook yearbook={yearbook} onBack={() => setViewMode('grid')} />;
  }

  if (viewMode === 'social') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <Button variant="ghost" onClick={() => setViewMode('grid')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Yearbook
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-6 py-6">
          <YearbookSocialHub yearbookId={yearbook.id} yearbook={yearbook} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header with Advanced Controls */}
      <div className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">
                  {yearbook.title || `${yearbook.schools.name} Yearbook`}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{yearbook.schools.name}</span>
                  <Badge variant="secondary">{yearbook.year}</Badge>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{filteredAndSortedEntries.length} students</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Search and Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="search-input"
                placeholder="Search students, activities, or honors... (Ctrl+F)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Students</option>
              <option value="activities">With Activities</option>
              <option value="honors">With Honors</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="name">Sort by Name</option>
              <option value="page">Sort by Page</option>
              <option value="activities">Sort by Activities</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-fit">
            <Button
              variant={viewMode === 'grid' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('grid')}
              title="Grid View (Ctrl+1)"
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('list')}
              title="List View (Ctrl+2)"
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'pages' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('pages')}
              title="Page View (Ctrl+3)"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Pages
            </Button>
            <Button
              variant={viewMode === 'social' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('social')}
              title="Social Hub (Ctrl+4)"
            >
              <Users className="w-4 h-4 mr-2" />
              Social
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout with Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-200px)]">
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={selectedEntry ? 70 : 100} minSize={50}>
          <div className="p-6">
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
                {filteredAndSortedEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary/50"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-muted">
                        {entry.photo_url ? (
                          <img
                            src={entry.photo_url}
                            alt={entry.student_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <Users className="w-8 h-8 text-primary" />
                          </div>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                        {entry.student_name}
                      </h3>

                      <p className="text-xs text-muted-foreground mb-2">
                        Page {entry.page_number}
                      </p>

                      {/* Quick Stats */}
                      <div className="flex justify-center gap-1 text-xs">
                        {entry.activities && entry.activities.length > 0 && (
                          <Badge variant="secondary" className="px-1 py-0">
                            {entry.activities.length} activities
                          </Badge>
                        )}
                        {entry.honors && entry.honors.length > 0 && (
                          <Badge variant="outline" className="px-1 py-0">
                            {entry.honors.length} honors
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted rounded-lg text-sm font-medium">
                  <div className="col-span-1">Photo</div>
                  <div className="col-span-3">Name</div>
                  <div className="col-span-1">Page</div>
                  <div className="col-span-3">Activities</div>
                  <div className="col-span-3">Honors</div>
                  <div className="col-span-1">Actions</div>
                </div>
                {filteredAndSortedEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardContent className="p-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                            {entry.photo_url ? (
                              <img
                                src={entry.photo_url}
                                alt={entry.student_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-3">
                          <h3 className="font-semibold">{entry.student_name}</h3>
                        </div>
                        <div className="col-span-1">
                          <Badge variant="outline">{entry.page_number}</Badge>
                        </div>
                        <div className="col-span-3">
                          <div className="flex flex-wrap gap-1">
                            {entry.activities?.slice(0, 2).map((activity, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {activity}
                              </Badge>
                            ))}
                            {(entry.activities?.length || 0) > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(entry.activities?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="col-span-3">
                          <div className="flex flex-wrap gap-1">
                            {entry.honors?.slice(0, 2).map((honor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {honor}
                              </Badge>
                            ))}
                            {(entry.honors?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(entry.honors?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Heart className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* Detail Panel */}
        {selectedEntry && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
              <div className="border-l bg-card h-full overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Student Details</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEntry(null)}
                    >
                      ×
                    </Button>
                  </div>

                  {/* Student Photo */}
                  <div className="text-center mb-6">
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-muted mb-4">
                      {selectedEntry.photo_url ? (
                        <AIPhotoTagger
                          imageUrl={selectedEntry.photo_url}
                          pageId={selectedEntry.id}
                          editable={true}
                          className="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                          <Users className="w-16 h-16 text-primary" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold">{selectedEntry.student_name}</h3>
                    <p className="text-muted-foreground">Page {selectedEntry.page_number}</p>
                  </div>

                  {/* Quote */}
                  {selectedEntry.quote && (
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <p className="text-sm italic text-center">
                          "{selectedEntry.quote}"
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activities */}
                  {selectedEntry.activities && selectedEntry.activities.length > 0 && (
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          Activities
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {selectedEntry.activities.map((activity, idx) => (
                            <Badge key={idx} variant="secondary">
                              {activity}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Honors */}
                  {selectedEntry.honors && selectedEntry.honors.length > 0 && (
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Honors & Awards
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {selectedEntry.honors.map((honor, idx) => (
                            <Badge key={idx} variant="outline">
                              {honor}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      View Full Profile
                    </Button>
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Heart className="w-4 h-4 mr-2" />
                      Add to Favorites
                    </Button>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 opacity-70 hover:opacity-100 transition-opacity">
        <Card className="p-2">
          <CardContent className="p-2 text-xs">
            <div className="text-muted-foreground">
              <div><kbd>Ctrl+F</kbd> Search</div>
              <div><kbd>Ctrl+1-4</kbd> Switch Views</div>
              <div><kbd>Esc</kbd> Back/Close</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}