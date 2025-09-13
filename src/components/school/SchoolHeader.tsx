import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, Phone, Calendar } from "lucide-react";
import { SchoolDetails } from "@/hooks/useSchoolDetails";
import { SchoolAlumniStats } from "./SchoolAlumniStats";
import { formatSchoolType } from "@/lib/utils/schoolUtils";

interface SchoolHeaderProps {
  school: SchoolDetails;
}

export function SchoolHeader({ school }: SchoolHeaderProps) {
  const locationString = [
    school.location.city,
    school.location.state,
    school.location.country
  ].filter(Boolean).join(", ");

  return (
    <div className="relative">
      {/* Banner Image */}
      <div 
        className="h-64 md:h-80 bg-gradient-to-r from-primary/20 to-primary/40 bg-cover bg-center relative"
        style={{
          backgroundImage: school.banner_image_url 
            ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${school.banner_image_url})` 
            : undefined
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* School Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {formatSchoolType(school.type)}
                  </Badge>
                  {school.founding_year && (
                    <Badge variant="outline" className="text-xs text-white border-white/50">
                      <Calendar className="w-3 h-3 mr-1" />
                      Est. {school.founding_year}
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {school.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm opacity-90">
                  {locationString && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {locationString}
                    </div>
                  )}
                  
                  {school.website_url && (
                    <a 
                      href={school.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  
                  {school.phone_number && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {school.phone_number}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm">
                  Connect
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats Card */}
      <div className="container mx-auto px-6 -mt-8 relative z-10">
        <Card className="p-4 bg-background/95 backdrop-blur-sm border shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {school.total_students?.toLocaleString() || "N/A"}
              </div>
              <div className="text-sm text-muted-foreground">Students</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {school.founding_year ? new Date().getFullYear() - school.founding_year : "N/A"}
              </div>
              <div className="text-sm text-muted-foreground">Years Old</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {school.mascot || "N/A"}
              </div>
              <div className="text-sm text-muted-foreground">Mascot</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {school.school_colors?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">School Colors</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}