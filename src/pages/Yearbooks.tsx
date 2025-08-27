import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Search, Upload, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { YearbookUploadDialog } from "@/components/yearbook/YearbookUploadDialog";
import { YearbookViewer } from "@/components/yearbook/YearbookViewer";
import { AppLayout } from "@/components/layout/AppLayout";

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
  const [yearbooks, setYearbooks] = useState<YearbookEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYearbook, setSelectedYearbook] = useState<YearbookEdition | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchYearbooks();
    }
  }, [user]);

  const fetchYearbooks = async () => {
    try {
      const { data, error } = await supabase
        .from("yearbook_editions")
        .select(`
          *,
          schools (
            name,
            type,
            location
          )
        `)
        .eq("upload_status", "completed")
        .order("year", { ascending: false });

      if (error) throw error;
      setYearbooks(data || []);
    } catch (error) {
      console.error("Error fetching yearbooks:", error);
      toast.error("Failed to load yearbooks");
    } finally {
      setLoading(false);
    }
  };

  const filteredYearbooks = yearbooks.filter(
    (yearbook) =>
      yearbook.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      yearbook.schools?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      yearbook.year.toString().includes(searchTerm)
  );

  if (selectedYearbook) {
    return (
      <YearbookViewer
        yearbook={selectedYearbook}
        onBack={() => setSelectedYearbook(null)}
      />
    );
  }

  return (
    <AppLayout title="Yearbooks">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground">
              Browse yearbooks from schools and discover your classmates
            </p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Yearbook
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search yearbooks by school, year, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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

        {/* Empty State */}
        {!loading && filteredYearbooks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "No yearbooks found" : "No yearbooks available"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Be the first to upload a yearbook for your school"}
            </p>
          </div>
        )}

        {/* Yearbooks Grid */}
        {!loading && filteredYearbooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredYearbooks.map((yearbook) => (
              <Card
                key={yearbook.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setSelectedYearbook(yearbook)}
              >
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
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary">{yearbook.year}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2 line-clamp-1">
                    {yearbook.title || `${yearbook.schools.name} Yearbook`}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
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
              </Card>
            ))}
          </div>
        )}

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
    </AppLayout>
  );
}