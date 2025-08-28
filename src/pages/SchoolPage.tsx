import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSchoolDetails } from "@/hooks/useSchoolDetails";
import { SchoolHeader } from "@/components/school/SchoolHeader";
import { SchoolPhotoGallery } from "@/components/school/SchoolPhotoGallery";
import { SchoolClubDirectory } from "@/components/school/SchoolClubDirectory";
import { SchoolYearbookArchive } from "@/components/school/SchoolYearbookArchive";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingBoundary from "@/components/LoadingBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function SchoolPage() {
  const { slug } = useParams<{ slug: string }>();
  const { school, loading, error } = useSchoolDetails(slug || "");

  if (loading) {
    return (
      <AppLayout title="Loading School...">
        <LoadingBoundary>Loading school details...</LoadingBoundary>
      </AppLayout>
    );
  }

  if (error || !school) {
    return (
      <AppLayout title="School Not Found">
        <div className="container mx-auto px-4 py-8">
          <Alert className="max-w-md mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || "School not found. Please check the URL and try again."}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={school.name}>
      <div className="min-h-screen bg-background">
        <SchoolHeader school={school} />
        
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="clubs">Clubs</TabsTrigger>
              <TabsTrigger value="yearbooks">Yearbooks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">About {school.name}</h3>
                      <p className="text-muted-foreground mb-4">
                        {school.description || "No description available."}
                      </p>
                      
                      {school.founding_year && (
                        <div className="mb-2">
                          <span className="font-medium">Founded:</span> {school.founding_year}
                        </div>
                      )}
                      
                      {school.principal_name && (
                        <div className="mb-2">
                          <span className="font-medium">Principal:</span> {school.principal_name}
                        </div>
                      )}
                      
                      {school.total_students && (
                        <div className="mb-2">
                          <span className="font-medium">Total Students:</span> {school.total_students.toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">School Details</h3>
                      
                      <div className="mb-2">
                        <span className="font-medium">Type:</span> {school.type}
                      </div>
                      
                      {school.mascot && (
                        <div className="mb-2">
                          <span className="font-medium">Mascot:</span> {school.mascot}
                        </div>
                      )}
                      
                      {school.school_colors && school.school_colors.length > 0 && (
                        <div className="mb-2">
                          <span className="font-medium">School Colors:</span>{" "}
                          {school.school_colors.join(", ")}
                        </div>
                      )}
                      
                      {school.website_url && (
                        <div className="mb-2">
                          <span className="font-medium">Website:</span>{" "}
                          <a 
                            href={school.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {school.website_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="photos">
              <SchoolPhotoGallery schoolId={school.id} />
            </TabsContent>
            
            <TabsContent value="clubs">
              <SchoolClubDirectory schoolId={school.id} />
            </TabsContent>
            
            <TabsContent value="yearbooks">
              <SchoolYearbookArchive schoolId={school.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}