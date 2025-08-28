import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, MapPin, Calendar, GraduationCap, Check, Clock, UserPlus, Shield, Users } from "lucide-react";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  school_id?: string;
  graduation_year?: number;
  verification_status: string;
  schools?: {
    name: string;
    type: string;
    location: any;
  };
}

interface School {
  id: string;
  name: string;
  type: string;
  location: any;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  verification_method?: string;
}

const Alumni = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [alumni, setAlumni] = useState<Profile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    if (user && profile?.school_id) {
      loadData();
    }
  }, [user, profile]);

  const loadData = async () => {
    await Promise.all([fetchAlumni(), fetchFriendships(), fetchSchools()]);
    setLoading(false);
  };

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          schools(name, type, location)
        `)
        .neq('id', user?.id)
        .order('first_name');

      if (error) throw error;
      setAlumni(data || []);
    } catch (error) {
      console.error('Error fetching alumni:', error);
    }
  };

  const fetchFriendships = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`);

      if (error) throw error;
      setFriendships(data || []);
    } catch (error) {
      console.error('Error fetching friendships:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
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
      await fetchFriendships();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const getFriendshipStatus = (alumniId: string) => {
    const friendship = friendships.find(f => 
      (f.requester_id === user?.id && f.addressee_id === alumniId) ||
      (f.addressee_id === user?.id && f.requester_id === alumniId)
    );

    if (!friendship) return 'none';
    if (friendship.status === 'accepted') return 'connected';
    if (friendship.requester_id === user?.id) return 'sent';
    return 'received';
  };

  const filteredAlumni = alumni.filter(person => {
    const matchesSearch = !searchTerm || 
      person.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSchool = selectedSchoolId === "all" || person.school_id === selectedSchoolId;
    const matchesYear = selectedYear === "all" || person.graduation_year?.toString() === selectedYear;
    
    return matchesSearch && matchesSchool && matchesYear;
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

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
    return (
      <AppLayout title="Alumni Directory">
        <div className="p-6 text-center">
          <p>Please complete your profile to access the alumni directory.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Alumni Directory">
      <div className="p-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by graduation year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {graduationYears.map((year) => (
                      <SelectItem key={year} value={year!.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alumni Grid */}
        {filteredAlumni.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No alumni found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlumni.map((person) => {
              const friendshipStatus = getFriendshipStatus(person.id);
              
              return (
                <Card key={person.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={person.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {getInitials(person.first_name, person.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {person.first_name} {person.last_name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Badge variant={person.verification_status === 'verified' ? 'default' : 'secondary'}>
                            {person.verification_status === 'verified' && <Shield className="h-3 w-3 mr-1" />}
                            {person.verification_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {person.schools && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <GraduationCap className="h-4 w-4" />
                          <span className="truncate">{person.schools.name}</span>
                        </div>
                      )}
                      {person.graduation_year && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Class of {person.graduation_year}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {friendshipStatus === 'none' && (
                        <Button 
                          onClick={() => sendFriendRequest(person.id)}
                          className="flex-1"
                          size="sm"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Send Request
                        </Button>
                      )}
                      {friendshipStatus === 'sent' && (
                        <Button variant="outline" disabled className="flex-1" size="sm">
                          <Clock className="h-4 w-4 mr-2" />
                          Request Sent
                        </Button>
                      )}
                      {friendshipStatus === 'connected' && (
                        <Button variant="outline" className="flex-1" size="sm">
                          <Check className="h-4 w-4 mr-2" />
                          Connected
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
    </AppLayout>
  );
};

export default Alumni;