import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface School {
  id: string;
  name: string;
  type: string;
  location: any;
  verified: boolean;
}

interface SchoolSelectorProps {
  selectedSchoolId: string;
  onSchoolSelect: (schoolId: string) => void;
}

const SchoolSelector = ({ selectedSchoolId, onSchoolSelect }: SchoolSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedSchoolId) {
      fetchSelectedSchool();
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchSchools();
    } else {
      setSchools([]);
    }
  }, [searchTerm]);

  const fetchSelectedSchool = async () => {
    const { data } = await supabase
      .from('schools')
      .select('*')
      .eq('id', selectedSchoolId)
      .single();
    
    if (data) {
      setSelectedSchool(data);
    }
  };

  const searchSchools = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);

    if (error) {
      toast({
        title: "Error searching schools",
        description: "Please try again",
        variant: "destructive"
      });
    } else {
      setSchools(data || []);
    }
    setLoading(false);
  };

  const handleSchoolSelect = (school: School) => {
    setSelectedSchool(school);
    onSchoolSelect(school.id);
    setSearchTerm("");
    setSchools([]);
  };

  const getLocationDisplay = (location: any) => {
    if (!location) return "";
    if (typeof location === 'string') return location;
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }
    return JSON.stringify(location);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>School *</Label>
        {selectedSchool ? (
          <Card className="mt-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedSchool.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {selectedSchool.type.replace('_', ' ')}
                      </Badge>
                      {selectedSchool.verified && (
                        <Badge variant="default">Verified</Badge>
                      )}
                    </div>
                    {selectedSchool.location && (
                      <div className="flex items-center mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {getLocationDisplay(selectedSchool.location)}
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedSchool(null);
                    onSchoolSelect("");
                  }}
                >
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="relative mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for your school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}

            {schools.length > 0 && (
              <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto">
                <CardContent className="p-0">
                  {schools.map((school) => (
                    <div
                      key={school.id}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSchoolSelect(school)}
                    >
                      <div className="flex items-center space-x-3">
                        <GraduationCap className="h-6 w-6 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{school.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="capitalize text-xs">
                              {school.type.replace('_', ' ')}
                            </Badge>
                            {school.verified && (
                              <Badge variant="default" className="text-xs">Verified</Badge>
                            )}
                          </div>
                          {school.location && (
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {getLocationDisplay(school.location)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {searchTerm.length >= 2 && schools.length === 0 && !loading && (
              <Card className="absolute z-10 w-full mt-1">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No schools found. Try a different search term.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolSelector;