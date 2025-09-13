import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  BookOpen, 
  Maximize2, 
  RotateCcw,
  Home,
  Users,
  Heart,
  MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIPhotoTagger } from "./AIPhotoTagger";
import { useSwipeable } from "react-swipeable";

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

interface PageFlipYearbookProps {
  yearbook: YearbookEdition;
  onBack: () => void;
}

export function PageFlipYearbook({ yearbook, onBack }: PageFlipYearbookProps) {
  const [pages, setPages] = useState<YearbookPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
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
    
    // Create flip animation
    if (pageRef.current) {
      const page = pageRef.current;
      
      // Apply 3D flip transformation
      page.style.transition = 'transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1)';
      page.style.transformOrigin = direction === 'forward' ? 'right center' : 'left center';
      page.style.transform = `perspective(1200px) rotateY(${direction === 'forward' ? '-180deg' : '180deg'})`;
      
      setTimeout(() => {
        setCurrentPageIndex(pageIndex);
        page.style.transform = `perspective(1200px) rotateY(${direction === 'forward' ? '0deg' : '0deg'})`;
        
        setTimeout(() => {
          page.style.transition = '';
          page.style.transform = '';
          page.style.transformOrigin = '';
          setIsFlipping(false);
        }, 400);
      }, 400);
    } else {
      setCurrentPageIndex(pageIndex);
      setIsFlipping(false);
    }
  }, [pages.length, isFlipping]);

  const nextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      flipToPage(currentPageIndex + 1, 'forward');
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      flipToPage(currentPageIndex - 1, 'backward');
    }
  };

  const jumpToPage = (pageNumber: number) => {
    const pageIndex = pages.findIndex(p => p.page_number === pageNumber);
    if (pageIndex !== -1 && pageIndex !== currentPageIndex) {
      const direction = pageIndex > currentPageIndex ? 'forward' : 'backward';
      flipToPage(pageIndex, direction);
    }
  };

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: nextPage,
    onSwipedRight: prevPage,
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onBack();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, nextPage, prevPage, onBack]);

  // Auto-hide UI in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      setShowUI(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowUI(false), 3000);
    };

    const handleMouseMove = () => resetTimer();
    
    resetTimer();
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousemove', handleMouseMove);
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
      {...swipeHandlers}
    >
      {/* Header */}
      <div className={`${
        isFullscreen && !showUI ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } transition-opacity duration-300 ${
        isFullscreen ? 'absolute top-0 left-0 right-0 z-10 bg-black/50' : 'relative bg-background/80 backdrop-blur-sm'
      } border-b`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <Home className="w-4 h-4 mr-2" />
                {isFullscreen ? '' : 'Back'}
              </Button>
              <div>
                <h1 className={`${isFullscreen ? 'text-white text-lg' : 'text-xl'} font-bold`}>
                  {yearbook.title || `${yearbook.schools.name} Yearbook`}
                </h1>
                <div className="flex items-center gap-2">
                  <p className={`${isFullscreen ? 'text-gray-300' : 'text-muted-foreground'} text-sm`}>
                    {yearbook.schools.name}
                  </p>
                  <Badge variant="secondary">{yearbook.year}</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Page Navigation */}
          {!isFullscreen && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Jump to page..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const pageNum = parseInt(searchTerm);
                        if (pageNum) jumpToPage(pageNum);
                      }
                    }}
                    className="pl-10 w-40"
                    type="number"
                  />
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Page {currentPage?.page_number || 1} of {totalPages}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Book Container */}
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="relative">
          {/* Book Shadow */}
          <div className="absolute inset-0 bg-black/20 blur-xl transform translate-y-8 scale-95" />
          
          {/* Book Pages */}
          <div 
            ref={pageRef}
            className="relative bg-white dark:bg-gray-100 rounded-lg shadow-2xl overflow-hidden"
            style={{
              width: isFullscreen ? '90vw' : 'min(90vw, 800px)',
              height: isFullscreen ? '80vh' : 'min(80vh, 600px)',
              maxWidth: isFullscreen ? 'none' : '800px'
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
                  <BookOpen className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-amber-800">
                    No pages found
                  </h3>
                  <p className="text-amber-600">
                    This yearbook doesn't have any pages uploaded yet
                  </p>
                </div>
              </div>
            )}

            {/* Page curl effect */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-white/30 to-transparent" />
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-black/10 to-transparent" />
          </div>

          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="lg"
            onClick={prevPage}
            disabled={currentPageIndex === 0 || isFlipping}
            className={`absolute left-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg ${
              isFullscreen && !showUI ? 'opacity-0 pointer-events-none' : 'opacity-100'
            } transition-opacity duration-300`}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={nextPage}
            disabled={currentPageIndex === pages.length - 1 || isFlipping}
            className={`absolute right-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg ${
              isFullscreen && !showUI ? 'opacity-0 pointer-events-none' : 'opacity-100'
            } transition-opacity duration-300`}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={`${
        isFullscreen && !showUI ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } transition-opacity duration-300 ${
        isFullscreen ? 'absolute bottom-0 left-0 right-0 bg-black/50 text-white' : 'bg-background/80 backdrop-blur-sm'
      } border-t p-4`}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Page Progress */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {!isFullscreen && (
                  <>
                    <Button variant="ghost" size="sm">
                      <Users className="w-4 h-4 mr-2" />
                      Find Classmates
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Heart className="w-4 h-4 mr-2" />
                      Favorites
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Page indicator */}
            <div className="flex items-center gap-2">
              <div className="text-sm">
                {currentPage?.page_number || 1} / {totalPages}
              </div>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ 
                    width: `${((currentPageIndex + 1) / totalPages) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground hidden lg:block">
              Use ← → keys or swipe to navigate • Press F for fullscreen
            </div>
          </div>
        </div>
      </div>

      {/* Mobile swipe hint */}
      {isFullscreen && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-8">
          <div className="text-white/50 text-sm animate-pulse">← Swipe</div>
          <div className="text-white/50 text-sm animate-pulse">Swipe →</div>
        </div>
      )}
    </div>
  );
}