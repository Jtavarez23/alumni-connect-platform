import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  graduation_year: number | null;
  verification_status: string;
  school_id: string;
}

interface School {
  id: string;
  name: string;
  type: string;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

const Alumni = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [alumni, setAlumni] = useState<Profile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchAlumni(),
      fetchFriendships(),
      fetchSchools()
    ]);
    setIsLoading(false);
  };

  const fetchAlumni = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, graduation_year, verification_status, school_id')
      .neq('id', user?.id);
    
    if (data) setAlumni(data);
  };

  const fetchFriendships = async () => {
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`);
    
    if (data) setFriendships(data);
  };

  const fetchSchools = async () => {
    const { data } = await supabase
      .from('schools')
      .select('id, name, type')
      .eq('submission_status', 'approved');
    
    if (data) setSchools(data);
  };

  const sendFriendRequest = async (addresseeId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user?.id,
          addressee_id: addresseeId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Friend request sent!",
        description: "Your request is now pending approval.",
      });

      await fetchFriendships();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFriendshipStatus = (alumniId: string) => {
    const friendship = friendships.find(f => 
      (f.requester_id === user?.id && f.addressee_id === alumniId) ||
      (f.addressee_id === user?.id && f.requester_id === alumniId)
    );
    
    if (!friendship) return 'none';
    if (friendship.status === 'accepted') return 'friends';
    if (friendship.requester_id === user?.id) return 'sent';
    return 'received';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school?.name || "Unknown School";
  };

  const filteredAlumni = alumni.filter(alumni => {
    const matchesSearch = 
      alumni.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumni.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSchool = selectedSchool === "all" || alumni.school_id === selectedSchool;
    const matchesYear = selectedYear === "all" || alumni.graduation_year?.toString() === selectedYear;
    
    return matchesSearch && matchesSchool && matchesYear;
  });

  const graduationYears = Array.from(
    new Set(alumni.map(a => a.graduation_year).filter(Boolean))
  ).sort((a, b) => b! - a!);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile?.school_id) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Find Alumni
            </h1>
            <p className="text-muted-foreground">
              Connect with classmates and expand your network
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Graduation year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {graduationYears.map(year => (
                    <SelectItem key={year} value={year!.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alumni Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-muted rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAlumni.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No alumni found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search filters or check back later for new members.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlumni.map(alumni => {
              const friendshipStatus = getFriendshipStatus(alumni.id);
              
              return (
                <Card key={alumni.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={alumni.avatar_url || ""} />
                        <AvatarFallback className="text-lg">
                          {getInitials(alumni.first_name, alumni.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {alumni.first_name} {alumni.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getSchoolName(alumni.school_id)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {alumni.graduation_year && (
                            <Badge variant="outline" className="text-xs">
                              Class of {alumni.graduation_year}
                            </Badge>
                          )}
                          <Badge 
                            variant={alumni.verification_status === 'verified' ? 'default' : 'secondary'}
                            className="text-xs capitalize"
                          >
                            {alumni.verification_status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="w-full">
                      {friendshipStatus === 'none' && (
                        <Button 
                          onClick={() => sendFriendRequest(alumni.id)}
                          className="w-full gap-2"
                          size="sm"
                        >
                          <UserPlus className="h-4 w-4" />
                          Send Request
                        </Button>
                      )}
                      {friendshipStatus === 'sent' && (
                        <Button variant="secondary" disabled className="w-full" size="sm">
                          Request Sent
                        </Button>
                      )}
                      {friendshipStatus === 'received' && (
                        <Button variant="outline" className="w-full" size="sm">
                          Accept Request
                        </Button>
                      )}
                      {friendshipStatus === 'friends' && (
                        <Button variant="success" disabled className="w-full" size="sm">
                          ✓ Connected
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alumni;