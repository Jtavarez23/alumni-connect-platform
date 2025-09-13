import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, GraduationCap, MapPin } from "lucide-react";
import { useSchoolHistory, type SchoolHistory } from "@/hooks/useSchoolHistory";
import { useSchoolAlumniStats } from "@/hooks/useSchoolAlumniStats";
import { SchoolAlumniStats } from "@/components/school/SchoolAlumniStats";

interface SchoolSwitcherProps {
  selectedSchool: SchoolHistory | null;
  onSchoolSelect: (school: SchoolHistory | null) => void;
}

const SchoolSwitcher: React.FC<SchoolSwitcherProps> = ({ selectedSchool, onSchoolSelect }) => {
  const { schoolHistory } = useSchoolHistory();
  const { getStatsForSchool } = useSchoolAlumniStats();
  const [open, setOpen] = useState(false);

  const getLocationDisplay = (location: any) => {
    if (!location) return "";
    if (typeof location === 'string') return location;
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }
    return "";
  };

  if (schoolHistory.length === 0) {
    return null;
  }

  if (schoolHistory.length === 1) {
    const school = schoolHistory[0];
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">{school.schools?.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{school.start_year} - {school.end_year || "Present"}</span>
                {school.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
              </div>
              {school.schools?.location && (
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {getLocationDisplay(school.schools.location)}
                </div>
              )}
              {school.schools?.id && (
                <div className="mt-2">
                  <SchoolAlumniStats
                    schoolId={school.schools.id}
                    currentCount={getStatsForSchool(school.schools.id)?.currentAlumniCount || 0}
                    recentCount={getStatsForSchool(school.schools.id)?.recentConnections24h || 0}
                    growthPercentage={getStatsForSchool(school.schools.id)?.growthPercentage}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              {selectedSchool ? (
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">{selectedSchool.school?.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{selectedSchool.start_year} - {selectedSchool.end_year || "Present"}</span>
                      {selectedSchool.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">All Schools</h3>
                    <p className="text-sm text-muted-foreground">View across all schools</p>
                  </div>
                </div>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2">
              <Button
                variant={selectedSchool === null ? "secondary" : "ghost"}
                className="w-full justify-start mb-2"
                onClick={() => {
                  onSchoolSelect(null);
                  setOpen(false);
                }}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                All Schools
              </Button>
              {schoolHistory.map((school) => (
                  <Button
                    key={school.id}
                    variant={selectedSchool?.id === school.id ? "secondary" : "ghost"}
                    className="w-full justify-start mb-1 h-auto p-3"
                    onClick={() => {
                      onSchoolSelect(school);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="text-left flex-1 min-w-0 space-y-1">
                        <div className="font-medium truncate">{school.schools?.name}</div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{school.start_year} - {school.end_year || "Present"}</span>
                          {school.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                        </div>
                        {school.schools?.id && (
                          <SchoolAlumniStats
                            schoolId={school.schools.id}
                            currentCount={getStatsForSchool(school.schools.id)?.currentAlumniCount || 0}
                            recentCount={getStatsForSchool(school.schools.id)?.recentConnections24h || 0}
                            size="sm"
                            showGrowth={false}
                          />
                        )}
                      </div>
                    </div>
                  </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
};

export default SchoolSwitcher;