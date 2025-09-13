import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  BookOpen, 
  Maximize2, 
  Minimize2,
  RotateCcw,
  Home,
  Users,
  Heart,
  MessageCircle,
  Download,
  Share2,
  Bookmark,
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Grid3x3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIPhotoTagger } from "./AIPhotoTagger";

interface YearbookPage {
  id: string;
  page_number: number;
  image_url: string;
  ai_processing_status: string;
}

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  school_id: string;
  schools: {
    name: string;
  };
}

interface DesktopPageFlipProps {
  yearbook: YearbookEdition;
  onBack: () => void;
}

export function DesktopPageFlip({ yearbook, onBack }: DesktopPageFlipProps) {
  const [pages, setPages] = useState<YearbookPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(3000);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showThumbnails, setShowThumbnails] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    fetchPages();
  }, [yearbook.id]);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("yearbook_pages")
        .select("*")
        .eq("edition_id", yearbook.id)
        .order("page_number");

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error("Error fetching yearbook pages:", error);
      toast.error("Failed to load yearbook pages");
    } finally {
      setLoading(false);
    }
  };

  const flipToPage = useCallback((pageIndex: number, direction: 'forward' | 'backward' = 'forward') => {
    if (pageIndex < 0 || pageIndex >= pages.length || isFlipping) return;
    
    setIsFlipping(true);
    
    if (pageRef.current) {
      const page = pageRef.current;
      
      // Enhanced 3D flip with better physics
      page.style.transition = 'transform 0.8s cubic-bezier(0.23, 1, 0.320, 1)';
      page.style.transformOrigin = direction === 'forward' ? 'right center' : 'left center';
      page.style.transform = `perspective(1600px) rotateY(${direction === 'forward' ? '-180deg' : '180deg'}) scale(0.9)`;
      
      setTimeout(() => {
        setCurrentPageIndex(pageIndex);
        page.style.transform = `perspective(1600px) rotateY(0deg) scale(${zoom})`;
        
        setTimeout(() => {
          page.style.transition = '';
          setIsFlipping(false);
        }, 400);
      }, 400);
    } else {
      setCurrentPageIndex(pageIndex);
      setIsFlipping(false);
    }
  }, [pages.length, isFlipping, zoom]);

  const nextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      flipToPage(currentPageIndex + 1, 'forward');
    }
  }, [currentPageIndex, pages.length, flipToPage]);

  const prevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      flipToPage(currentPageIndex - 1, 'backward');
    }
  }, [currentPageIndex, flipToPage]);

  const jumpToPage = (pageNumber: number) => {
    const pageIndex = pages.findIndex(p => p.page_number === pageNumber);
    if (pageIndex !== -1 && pageIndex !== currentPageIndex) {
      const direction = pageIndex > currentPageIndex ? 'forward' : 'backward';
      flipToPage(pageIndex, direction);
    }
  };

  const toggleBookmark = () => {
    const currentPage = pages[currentPageIndex]?.page_number;
    if (currentPage) {
      setBookmarks(prev => 
        prev.includes(currentPage) 
          ? prev.filter(p => p !== currentPage)
          : [...prev, currentPage]
      );
    }
  };

  // Enhanced keyboard shortcuts for desktop
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      // Basic navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        flipToPage(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        flipToPage(pages.length - 1);
      }

      // Function keys and shortcuts
      if (e.key === 'f' || e.key === 'F11') {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onBack();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        setAutoPlay(!autoPlay);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleBookmark();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setShowThumbnails(!showThumbnails);
      }

      // Zoom controls
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(prev => Math.min(prev + 0.1, 2));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom(prev => Math.max(prev - 0.1, 0.5));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }

      // Search focus
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('page-search')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, autoPlay, showThumbnails, nextPage, prevPage, onBack, pages.length, flipToPage]);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && !isFlipping) {
      autoPlayRef.current = setTimeout(() => {
        if (currentPageIndex < pages.length - 1) {
          nextPage();
        } else {
          setAutoPlay(false);
        }
      }, autoPlaySpeed);
    } else {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, [autoPlay, isFlipping, currentPageIndex, pages.length, autoPlaySpeed, nextPage]);

  // Auto-hide UI in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      setShowUI(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowUI(false), 4000);
    };

    const handleMouseMove = () => resetTimer();
    const handleKeyPress = () => resetTimer();
    
    resetTimer();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keypress', handleKeyPress);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keypress', handleKeyPress);
    };
  }, [isFullscreen]);

  const currentPage = pages[currentPageIndex];
  const totalPages = pages.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="w-96 h-[500px] mx-auto mb-4" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-black' 
          : 'min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900'
      }`}
    >
      {/* Enhanced Desktop Header */}
      <div className={`${
        isFullscreen && !showUI ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } transition-all duration-300 ${
        isFullscreen ? 'absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm' : 'relative bg-background/95 backdrop-blur-sm'
      } border-b shadow-sm`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <Home className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className={`${isFullscreen ? 'text-white text-xl' : 'text-2xl'} font-bold`}>
                  {yearbook.title || `${yearbook.schools.name} Yearbook`}
                </h1>
                <div className="flex items-center gap-2 text-sm">
                  <p className={`${isFullscreen ? 'text-gray-300' : 'text-muted-foreground'}`}>
                    {yearbook.schools.name}
                  </p>
                  <Badge variant="secondary">{yearbook.year}</Badge>
                </div>
              </div>
            </div>

            {/* Desktop Controls */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleBookmark}>
                <Bookmark 
                  className={`w-4 h-4 ${
                    bookmarks.includes(currentPage?.page_number || 0) 
                      ? 'fill-current text-yellow-500' 
                      : ''
                  }`} 
                />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowThumbnails(!showThumbnails)}>
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Navigation Bar */}
          {!isFullscreen && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="page-search"
                    placeholder="Jump to page... (Press /)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const pageNum = parseInt(searchTerm);
                        if (pageNum) jumpToPage(pageNum);
                      }
                    }}
                    className="pl-10 w-48"
                    type="number"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => flipToPage(0)}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPageIndex === 0}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={autoPlay ? 'bg-primary text-primary-foreground' : ''}
                  >
                    {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPageIndex === pages.length - 1}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => flipToPage(pages.length - 1)}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Page Info & Zoom Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm min-w-[4rem] text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Page {currentPage?.page_number || 1} of {totalPages}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Panel */}
      {showThumbnails && !isFullscreen && (
        <div className="border-b bg-background/95 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`flex-shrink-0 cursor-pointer border-2 rounded ${
                    index === currentPageIndex ? 'border-primary' : 'border-border'
                  }`}
                  onClick={() => flipToPage(index)}
                >
                  <img
                    src={page.image_url}
                    alt={`Page ${page.page_number}`}
                    className="w-20 h-24 object-cover rounded"
                  />
                  <div className="text-xs text-center py-1">
                    {page.page_number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Book Display */}
      <div className="flex items-center justify-center p-8" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 200px)' }}>
        <div className="relative">
          {/* Enhanced Book Shadow */}
          <div className="absolute inset-0 bg-black/30 blur-2xl transform translate-y-12 scale-95" />
          
          {/* Book Pages with Zoom */}
          <div 
            ref={pageRef}
            className="relative bg-white dark:bg-gray-100 rounded-lg shadow-2xl overflow-hidden border-8 border-amber-800"
            style={{
              width: isFullscreen ? '85vw' : 'min(85vw, 900px)',
              height: isFullscreen ? '75vh' : 'min(75vh, 650px)',
              transform: `scale(${zoom})`,
              maxWidth: 'none'
            }}
          >
            {currentPage ? (
              <AIPhotoTagger
                imageUrl={currentPage.image_url}
                pageId={currentPage.id}
                editable={true}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                <div className="text-center">
                  <BookOpen className="w-24 h-24 text-amber-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-amber-800 mb-2">
                    No pages found
                  </h3>
                  <p className="text-amber-600">
                    This yearbook doesn't have any pages uploaded yet
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Page Effects */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/40 to-transparent" />
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-black/20 to-transparent" />
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-amber-900/20 to-transparent" />
          </div>

          {/* Desktop Navigation Arrows */}
          <Button
            variant="outline"
            size="lg"
            onClick={prevPage}
            disabled={currentPageIndex === 0 || isFlipping}
            className="absolute left-[-80px] top-1/2 -translate-y-1/2 w-16 h-16 rounded-full shadow-xl bg-background/90 backdrop-blur-sm hover:bg-background border-2"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={nextPage}
            disabled={currentPageIndex === pages.length - 1 || isFlipping}
            className="absolute right-[-80px] top-1/2 -translate-y-1/2 w-16 h-16 rounded-full shadow-xl bg-background/90 backdrop-blur-sm hover:bg-background border-2"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </div>
      </div>

      {/* Enhanced Bottom Status Bar */}
      <div className={`${
        isFullscreen && !showUI ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } transition-all duration-300 ${
        isFullscreen ? 'absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm text-white' : 'bg-background/95 backdrop-blur-sm'
      } border-t p-4`}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Auto-play Controls */}
            <div className="flex items-center gap-4">
              {autoPlay && (
                <div className="flex items-center gap-2 text-sm">
                  <Play className="w-4 h-4" />
                  <span>Auto-playing</span>
                  <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ 
                        width: `${100 - ((Date.now() % autoPlaySpeed) / autoPlaySpeed * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="flex-1 mx-8">
              <Progress value={((currentPageIndex + 1) / totalPages) * 100} className="h-2" />
            </div>

            {/* Page Info & Bookmarks */}
            <div className="flex items-center gap-4 text-sm">
              {bookmarks.length > 0 && (
                <div className="flex items-center gap-1">
                  <Bookmark className="w-4 h-4 fill-current text-yellow-500" />
                  <span>{bookmarks.length}</span>
                </div>
              )}
              <span>
                {currentPage?.page_number || 1} / {totalPages}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Keyboard Shortcuts Panel */}
      <div className={`fixed bottom-20 right-4 transition-all duration-300 ${
        isFullscreen && !showUI ? 'opacity-0 pointer-events-none' : 'opacity-60 hover:opacity-100'
      }`}>
        <Card className="p-3">
          <CardContent className="p-0 text-xs space-y-1">
            <div className="font-semibold mb-2">Keyboard Shortcuts</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div><kbd>←/→</kbd> Navigate</div>
              <div><kbd>Home/End</kbd> First/Last</div>
              <div><kbd>F/F11</kbd> Fullscreen</div>
              <div><kbd>Space</kbd> Auto-play</div>
              <div><kbd>+/-</kbd> Zoom</div>
              <div><kbd>B</kbd> Bookmark</div>
              <div><kbd>T</kbd> Thumbnails</div>
              <div><kbd>/</kbd> Search</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}