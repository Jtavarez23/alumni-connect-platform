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
import { useSchoolHistory } from "@/hooks/useSchoolHistory";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import SchoolSwitcher from "@/components/dashboard/SchoolSwitcher";
import { ArrowLeft, Search, MapPin, Calendar, GraduationCap, Check, Clock, UserPlus, Shield, Users, Crown } from "lucide-react";

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
  school_history?: Array<{
    school_id: string;
    start_year: number;
    end_year?: number;
    school?: {
      name: string;
      type: string;
      location: any;
    };
  }>;
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
  const { schoolHistory } = useSchoolHistory();
  const { isFreeTier, isPremium, canNetworkWithUser, getNetworkableSchools, getYearRangeForNetworking } = useSubscription();
  const [alumni, setAlumni] = useState<Profile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [restrictedUsersCount, setRestrictedUsersCount] = useState(0);

  useEffect(() => {
    if (user && schoolHistory.length > 0) {
      loadData();
    }
  }, [user, schoolHistory]);

  const loadData = async () => {
    await Promise.all([fetchAlumni(), fetchFriendships(), fetchSchools()]);
    setLoading(false);
  };

  const fetchAlumni = async () => {
    try {
      // Get user's networkable school IDs based on subscription
      const networkableSchools = getNetworkableSchools();
      const networkableSchoolIds = networkableSchools.map(s => s.school_id);
      
      if (networkableSchoolIds.length === 0) {
        setAlumni([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          schools(name, type, location),
          school_history(
            school_id,
            start_year,
            end_year,
            school:schools(name, type, location)
          )
        `)
        .neq('id', user?.id)
        .order('first_name');

      if (error) throw error;
      
      // Filter alumni based on subscription restrictions
      let filteredAlumni = data || [];
      let restrictedCount = 0;
      
      // Filter based on networkable schools
      filteredAlumni = filteredAlumni.filter(alumnus => {
        const hasAccessibleSchool = networkableSchoolIds.includes(alumnus.school_id!) ||
          alumnus.school_history?.some((sh: any) => networkableSchoolIds.includes(sh.school_id));
        
        if (!hasAccessibleSchool) return false;

        // For free users, apply additional networking restrictions
        if (isFreeTier) {
          const canNetwork = canNetworkWithUser(alumnus);
          if (!canNetwork) {
            restrictedCount++;
            return false;
          }
        }

        return true;
      });
      
      setAlumni(filteredAlumni);
      setRestrictedUsersCount(restrictedCount);
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
      // Use networkable schools based on subscription
      const networkableSchools = getNetworkableSchools();
      setSchools(networkableSchools.map(sh => ({
        id: sh.school_id,
        name: sh.school?.name || 'Unknown School',
        type: sh.school?.type || 'Unknown',
        location: sh.school?.location || {}
      })));
    } catch (error) {
      console.error('Error setting schools:', error);
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

  const yearRange = getYearRangeForNetworking();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || schoolHistory.length === 0) {
    return (
      <AppLayout title="Alumni Directory">
        <div className="p-6 text-center">
          <p>Please add schools to your education history to access the alumni directory.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Alumni Directory">
      <div className="p-6">
        {/* Subscription Status Banner */}
        {isFreeTier && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-full">
                    <Crown className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warning-foreground">Free Tier Limitations</h3>
                    <p className="text-sm text-muted-foreground">
                      You can only network with alumni from your graduation year. 
                      {restrictedUsersCount > 0 && ` ${restrictedUsersCount} more alumni available with Premium.`}
                      {yearRange && ` Showing alumni from ${yearRange.minYear} only.`}
                    </p>
                  </div>
                </div>
                <UpgradePrompt compact onUpgrade={() => navigate('/settings')} />
              </div>
            </CardContent>
          </Card>
        )}

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
                        {isFreeTier && yearRange && year === yearRange.minYear && (
                          <Badge variant="secondary" className="ml-2">Your Year</Badge>
                        )}
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
            <p className="text-muted-foreground mb-4">
              {isFreeTier 
                ? "No alumni from your graduation year found. Upgrade to Premium to see alumni from all years."
                : "Try adjusting your search criteria"
              }
            </p>
            {isFreeTier && (
              <UpgradePrompt onUpgrade={() => navigate('/settings')} />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredAlumni.map((person) => {
              const friendshipStatus = getFriendshipStatus(person.id);
              
              return (
                <Card key={person.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 mb-4">
                      <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
                        <AvatarImage src={person.avatar_url} />
                        <AvatarFallback className="text-sm sm:text-lg">
                          {getInitials(person.first_name, person.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h3 className="font-semibold text-base sm:text-lg truncate">
                          {person.first_name} {person.last_name}
                        </h3>
                        <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground mt-1">
                          <Badge variant={person.verification_status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                            {person.verification_status === 'verified' && <Shield className="h-3 w-3 mr-1" />}
                            {person.verification_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                        {/* Show school history or current school */}
                        {person.school_history && person.school_history.length > 0 ? (
                          <div className="space-y-1">
                            {person.school_history.slice(0, 1).map((sh, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {sh.school?.name} ({sh.start_year}-{sh.end_year || 'present'})
                                </span>
                              </div>
                            ))}
                            {person.school_history.length > 1 && (
                              <div className="text-xs text-muted-foreground text-center sm:text-left">
                                +{person.school_history.length - 1} more schools
                              </div>
                            )}
                          </div>
                        ) : person.schools && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center sm:justify-start">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{person.schools.name}</span>
                          </div>
                        )}
                      {person.graduation_year && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center sm:justify-start">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>Class of {person.graduation_year}</span>
                          {isFreeTier && yearRange && person.graduation_year === yearRange.minYear && (
                            <Badge variant="outline" className="text-xs ml-1">Same Year</Badge>
                          )}
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
                          <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Send Request</span>
                        </Button>
                      )}
                      {friendshipStatus === 'sent' && (
                        <Button variant="outline" disabled className="flex-1" size="sm">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Request Sent</span>
                        </Button>
                      )}
                      {friendshipStatus === 'connected' && (
                        <Button variant="outline" className="flex-1" size="sm">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Connected</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Premium Upgrade Prompt */}
        {isFreeTier && restrictedUsersCount > 0 && (
          <div className="mt-8">
            <UpgradePrompt 
              feature="unlimited networking"
              onUpgrade={() => navigate('/settings')}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Alumni;