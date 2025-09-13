import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, BookOpen, Calendar, MapPin, Briefcase, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy components to reduce bundle size
const ProfileSetupDialog = lazy(() => import("@/components/profile/ProfileSetupDialog").then(m => ({ default: m.default })));
const ProfileEditDialog = lazy(() => import("@/components/profile/ProfileEditDialog").then(m => ({ default: m.default })));
const ActivityFeed = lazy(() => import("@/components/activity/ActivityFeed").then(m => ({ default: m.ActivityFeed })));
const LiveActivityIndicator = lazy(() => import("@/components/realtime/LiveActivityIndicator").then(m => ({ default: m.LiveActivityIndicator })));
const FeedTabs = lazy(() => import("@/components/feed/FeedTabs").then(m => ({ default: m.FeedTabs })));
const MemoryStories = lazy(() => import("@/components/social/MemoryStories").then(m => ({ default: m.MemoryStories })));
const MysteryFeature = lazy(() => import("@/components/social/MysteryFeature").then(m => ({ default: m.MysteryFeature })));
const SocialProofWidget = lazy(() => import("@/components/social/SocialProofWidget").then(m => ({ default: m.SocialProofWidget })));
const FOMOActivityFeed = lazy(() => import("@/components/realtime/FOMOActivityFeed").then(m => ({ default: m.FOMOActivityFeed })));
const TrendingMemories = lazy(() => import("@/components/social/TrendingMemories").then(m => ({ default: m.TrendingMemories })));
const SchoolSwitcher = lazy(() => import("@/components/dashboard/SchoolSwitcher").then(m => ({ default: m.default })));
const PullToRefresh = lazy(() => import("@/components/mobile/PullToRefresh").then(m => ({ default: m.PullToRefresh })));

const ComponentSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-32 w-full" />
  </div>
);
import { useSchoolHistory, SchoolHistory } from "@/hooks/useSchoolHistory";
import { getInitials } from "@/lib/utils";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { schoolHistory, getPrimarySchool, loading: schoolHistoryLoading } = useSchoolHistory();
  const [selectedSchool, setSelectedSchool] = useState<SchoolHistory | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    // Show profile setup if user hasn't completed their profile
    // Only show after school history loading is complete to avoid race condition
    
    // Only show setup if: user exists, loading is done, no school history, AND missing basic info
    const needsSetup = profile && 
                      !schoolHistoryLoading && 
                      schoolHistory.length === 0 && 
                      (!profile.first_name || !profile.last_name);
    
    if (needsSetup) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [profile, schoolHistory, schoolHistoryLoading]);

  useEffect(() => {
    // Set primary school as default selection
    if (!selectedSchool && schoolHistory.length > 0) {
      setSelectedSchool(getPrimarySchool() || schoolHistory[0]);
    }
  }, [schoolHistory, selectedSchool, getPrimarySchool]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }


  // Consider profile complete if they have school history OR basic profile info
  const isProfileComplete = schoolHistory.length > 0 || (profile?.first_name && profile?.last_name);

  const refreshDashboard = async () => {
    // Add any refresh logic here if needed
    window.location.reload();
  };

  return (
    <AppLayout title="Dashboard">
      <Suspense fallback={<div className="min-h-screen" />}>
        <PullToRefresh onRefresh={refreshDashboard}>
        <div className="p-4 sm:p-6">
        {/* Welcome Message */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {profile?.first_name || 'there'}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening in your network today.
            </p>
          </div>
          <Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted animate-pulse" />}>
            <LiveActivityIndicator className="hidden md:flex" />
          </Suspense>
        </div>

        {/* Profile Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-lg">{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl">
                  {profile?.first_name} {profile?.last_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isProfileComplete ? "default" : "secondary"}>
                    {isProfileComplete ? "Profile Complete" : "Profile Incomplete"}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {profile?.verification_status}
                  </Badge>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schoolHistory.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current School Context</p>
                  <Suspense fallback={<div className="h-10 bg-muted rounded-md animate-pulse" />}>
                    <SchoolSwitcher 
                      selectedSchool={selectedSchool}
                      onSchoolSelect={setSelectedSchool}
                    />
                  </Suspense>
                </div>
                {schoolHistory.length > 1 && (
                  <p className="text-sm text-muted-foreground">
                    You have {schoolHistory.length} schools in your education history.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Add your schools to access all features
                </p>
                <Button onClick={() => setShowProfileSetup(true)}>
                  Add Schools
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Priority 2 Features */}
        {isProfileComplete && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Discover events, businesses, and career opportunities from your alumni network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/events">
                  <Button variant="outline" className="w-full h-auto p-4 flex-col gap-2">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <span className="font-medium">Events</span>
                    <span className="text-xs text-muted-foreground">Find reunions & meetups</span>
                  </Button>
                </Link>
                <Link to="/businesses">
                  <Button variant="outline" className="w-full h-auto p-4 flex-col gap-2">
                    <MapPin className="w-6 h-6 text-green-600" />
                    <span className="font-medium">Businesses</span>
                    <span className="text-xs text-muted-foreground">Alumni-owned directory</span>
                  </Button>
                </Link>
                <Link to="/jobs">
                  <Button variant="outline" className="w-full h-auto p-4 flex-col gap-2">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                    <span className="font-medium">Jobs</span>
                    <span className="text-xs text-muted-foreground">Career opportunities</span>
                  </Button>
                </Link>
                <Link to="/mentorship">
                  <Button variant="outline" className="w-full h-auto p-4 flex-col gap-2">
                    <UserPlus className="w-6 h-6 text-orange-600" />
                    <span className="font-medium">Mentorship</span>
                    <span className="text-xs text-muted-foreground">Connect & grow</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social Proof Widget - High Priority */}
        {isProfileComplete && (
          <Suspense fallback={<ComponentSkeleton />}>
            <SocialProofWidget className="mb-6" />
          </Suspense>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Quick Actions & Social Features */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Feed System - Network/For You per AC-ARCH-001 */}
            {isProfileComplete ? (
              <Suspense fallback={<FeedSkeleton />}>
                <FeedTabs />
              </Suspense>
            ) : (
              <div className="mb-6">
                <Card className="border-dashed border-2">
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold mb-2">Complete Your Profile</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add your school information to unlock the full Alumni Connect experience.
                    </p>
                    <Button onClick={() => setShowProfileSetup(true)}>
                      Complete Profile
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/yearbooks'}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Browse Yearbooks
                  </CardTitle>
                  <CardDescription>
                    Discover and view yearbooks from your school
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!isProfileComplete}>
                    View Yearbooks
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => isProfileComplete && (window.location.href = '/alumni')}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Find Classmates
                  </CardTitle>
                  <CardDescription>
                    Connect with alumni from your graduating class
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!isProfileComplete}>
                    Find Alumni
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => isProfileComplete && (window.location.href = '/network')}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    My Network
                  </CardTitle>
                  <CardDescription>
                    Manage your connections and friend requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!isProfileComplete}>
                    View Network
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Legacy Features - only show for incomplete profiles */}
            {!isProfileComplete && (
              <div className="space-y-6">
                {/* Memory Stories */}
                <Suspense fallback={<ComponentSkeleton />}>
                  <MemoryStories />
                </Suspense>
                
                {/* Recent Activity */}
                <Suspense fallback={<ComponentSkeleton />}>
                  <ActivityFeed />
                </Suspense>
              </div>
            )}
          </div>

          {/* Right Column - Social Widgets */}
          <div className="lg:col-span-1 space-y-6">
            {/* Full FOMO Activity Feed for Desktop */}
            {isProfileComplete && (
              <div className="hidden lg:block">
                <Suspense fallback={<ComponentSkeleton />}>
                  <FOMOActivityFeed variant="sidebar" showUrgencyEvents={true} />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {/* Profile Setup and Edit Dialogs */}
        <Suspense fallback={null}>
          <ProfileSetupDialog 
            open={showProfileSetup} 
            onOpenChange={setShowProfileSetup}
            onComplete={() => {
              setShowProfileSetup(false);
              window.location.reload();
            }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <ProfileEditDialog 
            open={showProfileEdit} 
            onOpenChange={setShowProfileEdit}
            onComplete={() => {
              setShowProfileEdit(false);
              window.location.reload();
            }}
          />
        </Suspense>
        </div>
      </PullToRefresh>
      </Suspense>
    </AppLayout>
  );
};

export default Dashboard;