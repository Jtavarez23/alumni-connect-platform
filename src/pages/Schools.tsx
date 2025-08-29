import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  MapPin, 
  Users, 
  BookOpen, 
  Star,
  Plus,
  School,
  Calendar,
  Trophy
} from "lucide-react";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";
import { EnhancedSchoolDiscovery } from "@/components/school/EnhancedSchoolDiscovery";
import AddSchoolDialog from "@/components/profile/AddSchoolDialog";
import { NavLink } from "react-router-dom";

const Schools = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const { schoolHistory, loading } = useSchoolHistory();

  const getPrimarySchool = () => {
    return schoolHistory.find(sh => sh.is_primary) || schoolHistory[0];
  };

  const formatSchoolType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getYearRange = (startYear: number, endYear?: number) => {
    return endYear ? `${startYear} - ${endYear}` : `${startYear} - Present`;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Schools Directory</h1>
            <p className="text-muted-foreground mt-1">
              Discover schools, connect with alumni, and manage your education history
            </p>
          </div>
          <div className="flex gap-2">
            <EnhancedSchoolDiscovery 
              onSchoolSelect={(school) => {
                console.log("School selected:", school);
              }}
            />
            <AddSchoolDialog />
          </div>
        </div>

        <Tabs defaultValue="your-schools" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="your-schools">Your Schools</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="nearby">Nearby</TabsTrigger>
          </TabsList>

          <TabsContent value="your-schools" className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Education Journey</h2>
                {schoolHistory.length > 0 && (
                  <Badge variant="secondary">
                    {schoolHistory.length} School{schoolHistory.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : schoolHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schoolHistory.map((sh) => (
                    <Card key={sh.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <School className="h-5 w-5 text-primary" />
                              {sh.school?.name || 'Unknown School'}
                              {sh.is_primary && (
                                <Badge variant="secondary" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {sh.school?.type && formatSchoolType(sh.school.type)}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {getYearRange(sh.start_year, sh.end_year)}
                          {sh.graduated && (
                            <Badge variant="outline" className="text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              Graduated
                            </Badge>
                          )}
                        </div>
                        
                        {sh.school?.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {typeof sh.school.location === 'object' && sh.school.location !== null && 'city' in sh.school.location && 'state' in sh.school.location
                              ? `${sh.school.location.city}, ${sh.school.location.state}`
                              : 'Location specified'
                            }
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex gap-2">
                            <Badge variant={sh.verification_status === 'verified' ? 'default' : 'secondary'}>
                              {sh.verification_status === 'verified' ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                          
                          <Button variant="outline" size="sm" disabled>
                            View School
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Schools Added Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your education history by adding your schools
                    </p>
                    <AddSchoolDialog />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="discover" className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schools by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="School Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="high_school">High School</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="community_college">Community College</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">School Discovery Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                Browse thousands of schools and connect with alumni networks
              </p>
              <Button variant="outline" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Featured Schools</h3>
              <p className="text-muted-foreground mb-4">
                Discover popular schools and trending alumni networks
              </p>
              <Button variant="outline" disabled>
                <Users className="h-4 w-4 mr-2" />
                View Featured
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="nearby" className="space-y-6">
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Schools Near You</h3>
              <p className="text-muted-foreground mb-4">
                Find schools in your area and connect with local alumni
              </p>
              <Button variant="outline" disabled>
                <MapPin className="h-4 w-4 mr-2" />
                Enable Location
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Schools;