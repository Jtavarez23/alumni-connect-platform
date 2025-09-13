import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Upload, Users, Calendar, Filter, FileImage, FileText, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { YearbookUploadDialog } from "@/components/yearbook/YearbookUploadDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";
import { useMultiSchoolAccess } from "@/hooks/useMultiSchoolAccess";
import SchoolSwitcher from "@/components/dashboard/SchoolSwitcher";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  school_id: string;
  cover_image_url: string | null;
  page_count: number;
  upload_status: string;
  schools: {
    name: string;
    type: string;
    location: any;
  };
}

export default function Yearbooks() {
  const { user } = useAuth();
  const { schoolHistory } = useSchoolHistory();
  const { accessibleSchools } = useMultiSchoolAccess();
  const [yearbooks, setYearbooks] = useState<YearbookEdition[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [contextSchool, setContextSchool] = useState<any>(null);

  // AC-ARCH-001: Filters for "browse by School → Year; filters: state, district, era, media type"
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedEra, setSelectedEra] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("explore");

  useEffect(() => {
    if (user) {
      fetchYearbooks();
    }
  }, [user, contextSchool]);

  const fetchYearbooks = async () => {
    try {
      // Get accessible school IDs
      const accessibleSchoolIds = accessibleSchools.map(s => s.id);
      
      let query = supabase
        .from("yearbooks")
        .select(`
          *,
          schools (
            name,
            type,
            location
          )
        `)
        .in("upload_status", ["pending", "processing", "completed"]);

      // Filter by context school or accessible schools, with fallbacks
      if (contextSchool) {
        query = query.eq("school_id", contextSchool.id);
      } else if (accessibleSchoolIds.length > 0) {
        query = query.in("school_id", accessibleSchoolIds);
      } else {
        // SIMPLE FALLBACK: If no accessible schools, show all yearbooks
        // Don't add any school filtering - show everything
      }

      const { data, error } = await query.order("year", { ascending: false });

      if (error) throw error;
      setYearbooks(data || []);
    } catch (error) {
      console.error("Error fetching yearbooks:", error);
      toast.error("Failed to load yearbooks");
    } finally {
      setLoading(false);
    }
  };

  // Mock data for My Yearbooks (AC-ARCH-001: "books you uploaded/claimed")
  const myYearbooks = useMemo(() => [
    {
      id: "my1",
      title: "Miami High School 2005",
      year: 2005,
      school_id: "miami-high",
      cover_image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=500&fit=crop",
      page_count: 156,
      upload_status: "completed",
      schools: { name: "Miami High School", type: "high_school", location: { state: "FL" } },
      claimed: true,
      uploaded: false
    },
    {
      id: "my2", 
      title: "Central Academy Yearbook",
      year: 2008,
      school_id: "central-academy",
      cover_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
      page_count: 134,
      upload_status: "completed",
      schools: { name: "Central Academy", type: "middle_school", location: { state: "FL" } },
      claimed: false,
      uploaded: true
    }
  ], []);

  // Enhanced filtering logic per AC-ARCH-001 specifications
  const filteredYearbooks = useMemo(() => {
    let filtered = yearbooks.filter((yearbook) => {
      const matchesSearch = yearbook.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        yearbook.schools?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        yearbook.year.toString().includes(searchTerm);

      const matchesState = selectedState === "all" || 
        yearbook.schools?.location?.state === selectedState;

      const matchesEra = selectedEra === "all" || 
        (selectedEra === "90s" && yearbook.year >= 1990 && yearbook.year < 2000) ||
        (selectedEra === "2000s" && yearbook.year >= 2000 && yearbook.year < 2010) ||
        (selectedEra === "2010s" && yearbook.year >= 2010 && yearbook.year < 2020) ||
        (selectedEra === "2020s" && yearbook.year >= 2020);

      const matchesMediaType = selectedMediaType === "all" ||
        (selectedMediaType === "pdf" && yearbook.cover_image_url?.includes('pdf')) ||
        (selectedMediaType === "image" && !yearbook.cover_image_url?.includes('pdf'));

      return matchesSearch && matchesState && matchesEra && matchesMediaType;
    });

    return filtered;
  }, [yearbooks, searchTerm, selectedState, selectedEra, selectedMediaType]);


  return (
    <AppLayout title="Yearbooks">
      <PullToRefresh onRefresh={fetchYearbooks}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-display gradient-text">Yearbooks</h1>
              <p className="text-body text-muted-foreground">
                Discover yearbooks, claim your photos, and reconnect with classmates
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" asChild>
                <Link to="/yearbooks/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Link>
              </Button>
            </div>
          </div>

          {/* AC-ARCH-001 Required Tabs: Explore | My Yearbooks | Upload | Claim */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="explore">
                <BookOpen className="h-4 w-4 mr-2" />
                Explore
              </TabsTrigger>
              <TabsTrigger value="my-yearbooks">
                <Star className="h-4 w-4 mr-2" />
                My Yearbooks
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="claim">
                <Users className="h-4 w-4 mr-2" />
                Claim
              </TabsTrigger>
            </TabsList>

            {/* EXPLORE TAB - AC-ARCH-001: "browse by School → Year; filters: state, district, era, media type" */}
            <TabsContent value="explore" className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search yearbooks by school, year, or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-wrap lg:flex-nowrap gap-2">
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="w-full lg:w-32">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                      <SelectItem value="NY">New York</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedEra} onValueChange={setSelectedEra}>
                    <SelectTrigger className="w-full lg:w-32">
                      <SelectValue placeholder="Era" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Eras</SelectItem>
                      <SelectItem value="90s">1990s</SelectItem>
                      <SelectItem value="2000s">2000s</SelectItem>
                      <SelectItem value="2010s">2010s</SelectItem>
                      <SelectItem value="2020s">2020s</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
                    <SelectTrigger className="w-full lg:w-36">
                      <SelectValue placeholder="Media Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pdf">
                        <FileText className="h-4 w-4 mr-2 inline" />
                        PDF
                      </SelectItem>
                      <SelectItem value="image">
                        <FileImage className="h-4 w-4 mr-2 inline" />
                        Images
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-48 w-full rounded-md" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Yearbooks Grid */}
              {!loading && filteredYearbooks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredYearbooks.map((yearbook) => (
                    <YearbookCard key={yearbook.id} yearbook={yearbook} />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredYearbooks.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-h2 mb-2">No yearbooks found</h3>
                  <p className="text-body text-muted-foreground mb-4">
                    {searchTerm ? "Try adjusting your search terms" : "Be the first to upload a yearbook"}
                  </p>
                  <Button variant="primary" asChild>
                    <Link to="/yearbooks/upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Yearbook
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* MY YEARBOOKS TAB - AC-ARCH-001: "books you uploaded/claimed" */}
            <TabsContent value="my-yearbooks" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myYearbooks.map((yearbook) => (
                  <Card key={yearbook.id} className="hover:shadow-md transition-shadow">
                    <Link to={`/yearbooks/${yearbook.id}`}>
                      <CardHeader className="p-0">
                        <div className="relative h-48 bg-muted rounded-t-lg overflow-hidden">
                          <img
                            src={yearbook.cover_image_url}
                            alt={`${yearbook.title} cover`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <Badge variant="secondary">{yearbook.year}</Badge>
                            {yearbook.claimed && (
                              <Badge variant="verified" className="text-xs">
                                ✓ Claimed
                              </Badge>
                            )}
                            {yearbook.uploaded && (
                              <Badge variant="premium" className="text-xs">
                                📤 Uploaded
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <CardTitle className="text-h2 mb-2">{yearbook.title}</CardTitle>
                        <p className="text-small text-muted-foreground mb-3">
                          {yearbook.schools.name}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{yearbook.page_count} pages</span>
                          <span>{yearbook.claimed ? 'Photo claimed' : 'Upload by me'}</span>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>

              {myYearbooks.length === 0 && (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-h2 mb-2">No yearbooks yet</h3>
                  <p className="text-body text-muted-foreground mb-4">
                    Upload a yearbook or claim your photo to get started
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="primary" asChild>
                      <Link to="/yearbooks/upload">Upload Yearbook</Link>
                    </Button>
                    <Button variant="secondary" onClick={() => setActiveTab("claim")}>
                      Find My Photo
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* UPLOAD TAB - AC-ARCH-001: "file picker, TOS, safety scan status" */}
            <TabsContent value="upload" className="space-y-6">
              <Card variant="highlight">
                <CardContent className="p-8 text-center">
                  <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-h1 mb-4">Upload a Yearbook</h3>
                  <p className="text-body text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Help preserve school memories by uploading yearbooks. We accept PDF, JPEG, and PNG files up to 500MB per file.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="text-small font-medium mb-1">1. Select Files</h4>
                      <p className="text-xs text-muted-foreground">PDF, JPEG, PNG up to 500MB</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="text-small font-medium mb-1">2. Safety Scan</h4>
                      <p className="text-xs text-muted-foreground">Auto-scan for appropriate content</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="text-small font-medium mb-1">3. OCR & Publish</h4>
                      <p className="text-xs text-muted-foreground">Text extraction and face detection</p>
                    </div>
                  </div>

                  <Button variant="primary" size="lg" asChild>
                    <Link to="/yearbooks/upload">
                      <Upload className="h-5 w-5 mr-2" />
                      Start Upload
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CLAIM TAB - AC-ARCH-001: "name & face suggestions from OCR/vision" */}
            <TabsContent value="claim" className="space-y-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-h1 mb-4">Claim Your Yearbook Photos</h3>
                  <p className="text-body text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Find and claim your photos in uploaded yearbooks using our OCR and face recognition technology.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h4 className="text-small font-medium mb-2">Name Recognition</h4>
                      <p className="text-xs text-muted-foreground">
                        We'll search for your name in yearbook text and suggest potential matches
                      </p>
                    </div>
                    <div>
                      <h4 className="text-small font-medium mb-2">Face Detection</h4>
                      <p className="text-xs text-muted-foreground">
                        Advanced AI helps identify faces and suggests photos that might be you
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Button variant="primary" size="lg" disabled>
                      <Users className="h-5 w-5 mr-2" />
                      Find My Photos (Coming Soon)
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This feature will be available once we have yearbooks in the system
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Upload Dialog */}
          <YearbookUploadDialog 
            open={showUploadDialog} 
            onClose={() => setShowUploadDialog(false)}
            onSuccess={() => {
              setShowUploadDialog(false);
              fetchYearbooks();
            }}
          />
        </div>
      </PullToRefresh>
    </AppLayout>
  );
}

// Extracted YearbookCard component for reusability
function YearbookCard({ yearbook }: { yearbook: YearbookEdition }) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group active:scale-[0.98] touch-manipulation">
      <Link to={`/yearbooks/${yearbook.id}`}>
        <CardHeader className="p-0">
          <div className="relative h-48 bg-muted rounded-t-lg overflow-hidden">
            {yearbook.cover_image_url ? (
              <img
                src={yearbook.cover_image_url}
                alt={`${yearbook.title} cover`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-2">
              <Badge variant="secondary">{yearbook.year}</Badge>
              {yearbook.upload_status === "pending" && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Processing
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-h2 mb-2 line-clamp-1">
            {yearbook.title || `${yearbook.schools.name} Yearbook`}
          </CardTitle>
          <p className="text-small text-muted-foreground mb-3 line-clamp-1">
            {yearbook.schools.name}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {yearbook.year}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {yearbook.page_count} pages
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}