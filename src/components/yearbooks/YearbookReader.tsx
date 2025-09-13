// Alumni Connect - Yearbook Reader
// Implements AC-ARCH-004 YearbookReader component with Deep Zoom and claim functionality

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Toast } from '@/components/ui/toast';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Flag, 
  User,
  ArrowLeft,
  ArrowRight,
  Grid3X3,
  Eye,
  EyeOff
} from 'lucide-react';
import { useYearbook, useYearbookPages, useSubmitClaim } from '@/hooks/useYearbook';
import { ClaimDialog } from './ClaimDialog';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import type { YearbookReaderProps, PageFace, OcrText, UUID } from '@/types/alumni-connect';

interface ViewerState {
  currentPage: number;
  zoomLevel: number;
  panX: number;
  panY: number;
  rotation: number;
  showOcrOverlay: boolean;
  showFaceBoxes: boolean;
  selectedFace: PageFace | null;
  selectedOcrText: OcrText | null;
  searchQuery: string;
  searchResults: OcrText[];
  showClaimDialog: boolean;
}

export function YearbookReader({ yearbookId, page = 1 }: YearbookReaderProps) {
  const [state, setState] = useState<ViewerState>({
    currentPage: page,
    zoomLevel: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    showOcrOverlay: false,
    showFaceBoxes: true,
    selectedFace: null,
    selectedOcrText: null,
    searchQuery: '',
    searchResults: [],
    showClaimDialog: false
  });

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { data: yearbook, isLoading: yearbookLoading } = useYearbook(yearbookId);
  const { data: pages, isLoading: pagesLoading } = useYearbookPages(yearbookId);
  const submitClaimMutation = useSubmitClaim();

  const currentPageData = pages?.find(p => p.pageNumber === state.currentPage);

  const updateState = (updates: Partial<ViewerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Initialize Deep Zoom viewer (simplified - would use OpenSeadragon in production)
  useEffect(() => {
    if (!currentPageData?.tileManifest || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Load and render the image tiles
    // This is a simplified version - full implementation would use OpenSeadragon
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply transformations
      ctx.save();
      ctx.scale(state.zoomLevel, state.zoomLevel);
      ctx.translate(state.panX, state.panY);
      ctx.rotate((state.rotation * Math.PI) / 180);
      
      // Draw the yearbook page
      ctx.drawImage(img, 0, 0);
      
      // Draw OCR overlay if enabled
      if (state.showOcrOverlay && currentPageData.ocrText) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.lineWidth = 2;
        currentPageData.ocrText.forEach((ocr: any) => {
          if (ocr.bbox && ocr.bbox.length === 4) {
            const [x, y, w, h] = ocr.bbox;
            ctx.strokeRect(x, y, w, h);
          }
        });
      }
      
      // Draw face boxes if enabled
      if (state.showFaceBoxes && currentPageData.faces) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 3;
        currentPageData.faces.forEach((face: any) => {
          if (face.bbox && face.bbox.length === 4) {
            const [x, y, w, h] = face.bbox;
            ctx.strokeRect(x, y, w, h);
            
            // Add claim button indicator
            if (!face.claimedBy) {
              ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
              ctx.fillRect(x, y, w, h);
            }
          }
        });
      }
      
      ctx.restore();
    };
    
    // Load image from storage or tiles
    img.src = currentPageData.imagePath || '/placeholder-yearbook-page.jpg';
  }, [currentPageData, state.zoomLevel, state.panX, state.panY, state.rotation, state.showOcrOverlay, state.showFaceBoxes]);

  // Handle canvas click for face/text selection
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentPageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / state.zoomLevel - state.panX;
    const y = (event.clientY - rect.top) / state.zoomLevel - state.panY;

    // Check if click is on a face box
    if (currentPageData.faces) {
      const clickedFace = currentPageData.faces.find((face: any) => {
        if (!face.bbox || face.bbox.length !== 4) return false;
        const [fx, fy, fw, fh] = face.bbox;
        return x >= fx && x <= fx + fw && y >= fy && y <= fy + fh;
      });

      if (clickedFace && !clickedFace.claimedBy) {
        updateState({ 
          selectedFace: clickedFace,
          showClaimDialog: true 
        });
      }
    }

    // Check if click is on OCR text
    if (currentPageData.ocrText) {
      const clickedText = currentPageData.ocrText.find((ocr: any) => {
        if (!ocr.bbox || ocr.bbox.length !== 4) return false;
        const [tx, ty, tw, th] = ocr.bbox;
        return x >= tx && x <= tx + tw && y >= ty && y <= ty + th;
      });

      if (clickedText) {
        updateState({ 
          selectedOcrText: clickedText,
          showClaimDialog: true 
        });
      }
    }
  };

  // Handle zoom
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(5, state.zoomLevel + delta));
    updateState({ zoomLevel: newZoom });
  };

  // Handle page navigation
  const changePage = (direction: 'prev' | 'next') => {
    if (!yearbook?.pageCount) return;
    
    let newPage = state.currentPage;
    if (direction === 'prev' && state.currentPage > 1) {
      newPage = state.currentPage - 1;
    } else if (direction === 'next' && state.currentPage < yearbook.pageCount) {
      newPage = state.currentPage + 1;
    }
    
    updateState({ currentPage: newPage });
  };

  // Handle search in yearbook
  const handleSearch = (query: string) => {
    if (!pages || query.length < 2) {
      updateState({ searchQuery: query, searchResults: [] });
      return;
    }

    const results: OcrText[] = [];
    pages.forEach(page => {
      page.ocrText?.forEach((ocr: any) => {
        if (ocr.text.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            ...ocr,
            pageNumber: page.pageNumber
          } as any);
        }
      });
    });

    updateState({ searchQuery: query, searchResults: results });
  };

  // Handle claim submission
  const handleClaimSubmit = async () => {
    try {
      await submitClaimMutation.mutateAsync({
        pageFaceId: state.selectedFace?.id,
        pageNameId: state.selectedOcrText?.id
      });
      
      updateState({ 
        showClaimDialog: false,
        selectedFace: null,
        selectedOcrText: null
      });
    } catch (error) {
      console.error('Failed to submit claim:', error);
    }
  };

  if (yearbookLoading || pagesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!yearbook || !pages) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600">Yearbook not found</p>
      </div>
    );
  }

  return (
    <div className="yearbook-reader bg-neutral-50 min-h-screen">
      {/* Toolbar */}
      <div className="bg-white border-b border-neutral-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">
              {yearbook.title || `${yearbook.school?.name} Yearbook`}
            </h1>
            {yearbook.school && (
              <Badge variant="secondary">
                {yearbook.school.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
              <Input
                placeholder="Search in yearbook..."
                value={state.searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
              {state.searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-neutral-200 rounded-md mt-1 max-h-48 overflow-y-auto z-20">
                  {state.searchResults.slice(0, 10).map((result, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        updateState({ 
                          currentPage: (result as any).pageNumber,
                          searchResults: []
                        });
                      }}
                      className="block w-full text-left p-2 hover:bg-neutral-50 text-sm"
                    >
                      <span className="font-medium">Page {(result as any).pageNumber}:</span> {result.text}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateState({ showOcrOverlay: !state.showOcrOverlay })}
              >
                {state.showOcrOverlay ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                OCR
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateState({ showFaceBoxes: !state.showFaceBoxes })}
              >
                {state.showFaceBoxes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Faces
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsReportDialogOpen(true)}
              >
                <Flag className="h-4 w-4" />
                Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Page thumbnails sidebar */}
        <div className="w-48 bg-white border-r border-neutral-200 p-4 overflow-y-auto">
          <div className="space-y-2">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => updateState({ currentPage: page.pageNumber })}
                className={`
                  w-full aspect-[3/4] rounded-lg border-2 transition-colors
                  ${state.currentPage === page.pageNumber 
                    ? 'border-brand-500 bg-brand-50' 
                    : 'border-neutral-200 hover:border-neutral-300'
                  }
                `}
              >
                <div className="w-full h-full bg-neutral-100 rounded-md flex items-center justify-center">
                  <span className="text-sm text-neutral-600">Page {page.pageNumber}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main viewer */}
        <div className="flex-1 relative">
          <div 
            ref={viewerRef}
            className="w-full h-full flex items-center justify-center p-8"
          >
            <div className="relative max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="border border-neutral-300 shadow-lg cursor-crosshair"
                style={{
                  transform: `scale(${state.zoomLevel}) translate(${state.panX}px, ${state.panY}px) rotate(${state.rotation}deg)`,
                  transformOrigin: 'center'
                }}
              />
              
              {/* Claim indicators */}
              {state.showFaceBoxes && currentPageData?.faces?.map((face: any, index) => (
                !face.claimedBy && (
                  <div
                    key={index}
                    className="absolute bg-green-500 text-white px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-green-600"
                    style={{
                      left: face.bbox[0] * state.zoomLevel + state.panX,
                      top: face.bbox[1] * state.zoomLevel + state.panY,
                      transform: 'translate(-50%, -100%)'
                    }}
                    onClick={() => updateState({ 
                      selectedFace: face,
                      showClaimDialog: true 
                    })}
                  >
                    Is this you?
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Viewer controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg p-2 flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changePage('prev')}
              disabled={state.currentPage <= 1}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm px-3">
              {state.currentPage} / {yearbook.pageCount || pages.length}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => changePage('next')}
              disabled={state.currentPage >= (yearbook.pageCount || pages.length)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="border-l border-neutral-300 h-6 mx-2" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(-0.2)}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(0.2)}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateState({ rotation: state.rotation + 90 })}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Claim Dialog */}
      <ClaimDialog
        pageFaceId={state.selectedFace?.id}
        pageNameId={state.selectedOcrText?.id}
        open={state.showClaimDialog}
        onClose={() => updateState({ 
          showClaimDialog: false,
          selectedFace: null,
          selectedOcrText: null
        })}
      />

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        targetTable="yearbook_pages"
        targetId={yearbookId}
        targetName={`Yearbook page ${state.currentPage}`}
      />
    </div>
  );
}