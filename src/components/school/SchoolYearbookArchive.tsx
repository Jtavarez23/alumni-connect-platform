import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search, BookOpen, Calendar, Eye } from "lucide-react";
import LoadingBoundary from "@/components/LoadingBoundary";
import { YearbookViewer } from "@/components/yearbook/YearbookViewer";

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  cover_image_url?: string;
  page_count: number;
  upload_status: string;
  school: {
    name: string;
  };
}

interface SchoolYearbookArchiveProps {
  schoolId: string;
}

export function SchoolYearbookArchive({ schoolId }: SchoolYearbookArchiveProps) {
  const [yearbooks, setYearbooks] = useState<YearbookEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchYear, setSearchYear] = useState("");
  const [selectedYearbook, setSelectedYearbook] = useState<YearbookEdition | null>(null);

  useEffect(() => {
    async function fetchYearbooks() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("yearbooks")
          .select(`
            id,
            title,
            year,
            cover_image_url,
            page_count,
            upload_status,
            school:schools(name)
          `)
          .eq("school_id", schoolId)
          .eq("upload_status", "completed")
          .order("year", { ascending: false });

        if (error) throw error;
        setYearbooks(data || []);
      } catch (err) {
        console.error("Error fetching yearbooks:", err);
      } finally {
        setLoading(false);
      }
    }

    if (schoolId) {
      fetchYearbooks();
    }
  }, [schoolId]);

  const filteredYearbooks = yearbooks.filter(yearbook => {
    if (!searchYear) return true;
    return yearbook.year.toString().includes(searchYear);
  });

  if (selectedYearbook) {
    // Create a compatible yearbook object for the viewer
    const compatibleYearbook = {
      ...selectedYearbook,
      school_id: schoolId,
      schools: {
        name: selectedYearbook.school.name,
        type: "",
        location: {}
      },
      cover_image_url: selectedYearbook.cover_image_url || ""
    };
    
    return (
      <YearbookViewer
        yearbook={compatibleYearbook}
        onBack={() => setSelectedYearbook(null)}
      />
    );
  }

  if (loading) {
    return <LoadingBoundary>Loading yearbooks...</LoadingBoundary>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by year..."
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          {filteredYearbooks.length} yearbook{filteredYearbooks.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Yearbooks Grid */}
      {filteredYearbooks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {searchYear 
                ? `No yearbooks found for year ${searchYear}.` 
                : "No yearbooks available yet. Check back later!"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredYearbooks.map((yearbook) => (
            <Card key={yearbook.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/10 to-primary/20">
                {yearbook.cover_image_url ? (
                  <img
                    src={yearbook.cover_image_url}
                    alt={`${yearbook.title} cover`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-primary/40" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => setSelectedYearbook(yearbook)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Yearbook
                    </Button>
                  </div>
                </div>
              </div>
              
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">
                      {yearbook.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        <Calendar className="w-3 h-3 mr-1" />
                        {yearbook.year}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  {yearbook.page_count} pages
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => setSelectedYearbook(yearbook)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Browse
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}