import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  MapPin, 
  Briefcase, 
  UserPlus,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ProfileSetupDialog from "@/components/profile/ProfileSetupDialog";
import ProfileEditDialog from "@/components/profile/ProfileEditDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { useSchoolHistory, SchoolHistory } from "@/hooks/useSchoolHistory";
import { getInitials } from "@/lib/utils";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";

const Home = () => {
  const { user, profile, loading } = useAuth();
  const { schoolHistory, getPrimarySchool, loading: schoolHistoryLoading } = useSchoolHistory();
  const [selectedSchool, setSelectedSchool] = useState<SchoolHistory | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    if (profile && !schoolHistoryLoading && schoolHistory.length === 0 && 
        (!profile.first_name || !profile.last_name)) {
      setShowProfileSetup(true);
    }
  }, [profile, schoolHistoryLoading, schoolHistory.length]);

  useEffect(() => {
    if (schoolHistory.length > 0) {
      const primary = getPrimarySchool();
      setSelectedSchool(primary);
    }
  }, [schoolHistory, getPrimarySchool]);

  const refreshHome = async () => {
    window.location.reload();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Per AC-ARCH-001 line 123: Unverified users can browse previews and access For You feed
  // Basic profile = name info (unlocks social feed), Complete profile = + school history (unlocks networking features)
  const hasBasicProfile = profile && profile.first_name && profile.last_name;
  const isProfileComplete = hasBasicProfile && schoolHistory.length > 0;

  return (
    <AppLayout title="Home">
      <PullToRefresh onRefresh={refreshHome}>
        <div className="max-w-7xl mx-auto">
          {/* Profile Setup Banner - Show if no basic profile */}
          {!hasBasicProfile && (
            <Card variant="highlight" className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-h2">Complete your profile to unlock the full experience</h3>
                    <p className="text-small text-muted-foreground">Add your school information to connect with classmates</p>
                  </div>
                  <Button variant="primary" onClick={() => setShowProfileSetup(true)}>
                    Complete Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content - AC-ARCH-001 compliant structure */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Feed Column - 75% width */}
            <div className="lg:col-span-3 space-y-6">
              {/* Top Section: Search + Composer + Feed Tabs per AC-ARCH-001 */}
              {hasBasicProfile ? (
                <>
                  {/* Search Bar */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search alumni, schools, or posts..."
                          className="pl-10"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Post Composer - "What's new?" per AC-ARCH-001 */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback>{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
                        </Avatar>
                        <Button 
                          variant="ghost" 
                          className="flex-1 justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          onClick={() => {/* TODO: Open post composer */}}
                        >
                          What's new, {profile?.first_name}?
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        <Button variant="ghost" size="sm" className="text-xs">
                          📷 Photo
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs">
                          📖 Yearbook Snippet
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs">
                          🎉 Event
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs">
                          💼 Job
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feed Tabs: Network | For You per AC-ARCH-001 */}
                  <FeedTabs />
                </>
              ) : (
                /* Empty State per AC-ARCH-001: "Claim your yearbook photo to start finding classmates" */
                <Card variant="outlined" className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h1 className="text-display mb-2">Claim your yearbook photo to start finding classmates</h1>
                    <p className="text-body text-muted-foreground mb-6 max-w-md mx-auto">
                      Connect with your alumni network by adding your school information and claiming your yearbook photos.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="primary" size="lg" onClick={() => setShowProfileSetup(true)}>
                        <GraduationCap className="h-5 w-5 mr-2" />
                        Add School Info
                      </Button>
                      <Button variant="secondary" size="lg" asChild>
                        <Link to="/yearbooks">
                          <BookOpen className="h-5 w-5 mr-2" />
                          Browse Yearbooks
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar - Modules per AC-ARCH-001 */}
            <div className="lg:col-span-1 space-y-6">
              {/* Who to Reconnect per AC-ARCH-001 - Only for verified alumni with school history */}
              {isProfileComplete && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-h2 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Who to Reconnect
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm">CL</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-small font-medium truncate">Sarah Johnson</p>
                          <p className="text-xs text-muted-foreground">Miami High '05 • 2 mutual friends</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                      <Link to="/network">See More</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Trending Schools per AC-ARCH-001 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-h2 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Trending Schools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: 'Miami High School', members: '45 new members', year: '1995-2010' },
                    { name: 'Central Academy', members: '32 new members', year: '2000-2015' },
                    { name: 'North High School', members: '28 new members', year: '1990-2005' }
                  ].map((school, i) => (
                    <div key={school.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-small font-medium truncate">{school.name}</p>
                        <p className="text-xs text-muted-foreground">{school.members} this week</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Upcoming Reunions per AC-ARCH-001 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-h2 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Reunions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="bg-primary/10 rounded-lg p-2 flex-shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-medium">Miami High Class of '05</p>
                      <p className="text-xs text-muted-foreground">Dec 15 • Downtown Miami</p>
                      <Badge variant="secondary" className="text-xs mt-1">85 attending</Badge>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-secondary/10 rounded-lg p-2 flex-shrink-0">
                      <Calendar className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-medium">Central Academy '08</p>
                      <p className="text-xs text-muted-foreground">Jan 20 • Virtual Event</p>
                      <Badge variant="outline" className="text-xs mt-1">52 attending</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link to="/events">View All Events</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* New Business Listings per AC-ARCH-001 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-h2 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Alumni Businesses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">
                      <MapPin className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-medium">Joe's Pizza Co.</p>
                      <p className="text-xs text-muted-foreground">10% alumni discount</p>
                      <Badge variant="verified" className="text-xs mt-1">Verified</Badge>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-small font-medium">Tech Solutions LLC</p>
                      <p className="text-xs text-muted-foreground">IT consulting services</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link to="/businesses">Browse Directory</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions for Mobile */}
              <div className="lg:hidden grid grid-cols-2 gap-3">
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/events">
                    <Calendar className="h-4 w-4 mr-2" />
                    Events
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/jobs">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Jobs
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Setup Dialogs */}
        {showProfileSetup && (
          <ProfileSetupDialog 
            isOpen={showProfileSetup} 
            onClose={() => setShowProfileSetup(false)}
          />
        )}
        
        {showProfileEdit && (
          <ProfileEditDialog 
            isOpen={showProfileEdit} 
            onClose={() => setShowProfileEdit(false)}
          />
        )}
      </PullToRefresh>
    </AppLayout>
  );
};

export default Home;