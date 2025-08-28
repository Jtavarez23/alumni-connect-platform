import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, GraduationCap, Users, BookOpen } from "lucide-react";
import ProfileSetupDialog from "@/components/profile/ProfileSetupDialog";
import ProfileEditDialog from "@/components/profile/ProfileEditDialog";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { AppLayout } from "@/components/layout/AppLayout";
import { MemoryStories } from "@/components/social/MemoryStories";
import { MysteryFeature } from "@/components/social/MysteryFeature";
import { GamificationWidget } from "@/components/gamification/GamificationWidget";
import { LiveActivityIndicator } from "@/components/realtime/LiveActivityIndicator";
import { useSchoolHistory, SchoolHistory } from "@/hooks/useSchoolHistory";
import SchoolSwitcher from "@/components/dashboard/SchoolSwitcher";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { schoolHistory, getPrimarySchool } = useSchoolHistory();
  const [selectedSchool, setSelectedSchool] = useState<SchoolHistory | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    // Show profile setup if user hasn't completed their profile
    if (profile && schoolHistory.length === 0) {
      setShowProfileSetup(true);
    }
  }, [profile, schoolHistory]);

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

  const getInitials = () => {
    if (!profile) return "U";
    return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  };

  const isProfileComplete = schoolHistory.length > 0;

  return (
    <AppLayout title="Dashboard">
      <div className="p-6">
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
          <LiveActivityIndicator className="hidden md:flex" />
        </div>

        {/* Profile Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
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
                  <SchoolSwitcher 
                    selectedSchool={selectedSchool}
                    onSchoolSelect={setSelectedSchool}
                  />
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

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
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

            {/* Memory Stories */}
            <MemoryStories />
            
            {/* Mystery Feature */}
            <MysteryFeature />

            {/* Recent Activity */}
            <ActivityFeed />
          </div>

          {/* Right Column - Gamification */}
          <div className="lg:col-span-1">
            <GamificationWidget />
          </div>
        </div>

        {/* Profile Setup and Edit Dialogs */}
        <ProfileSetupDialog 
          open={showProfileSetup} 
          onOpenChange={setShowProfileSetup}
          onComplete={() => {
            setShowProfileSetup(false);
            window.location.reload();
          }}
        />
        <ProfileEditDialog 
          open={showProfileEdit} 
          onOpenChange={setShowProfileEdit}
          onComplete={() => {
            setShowProfileEdit(false);
            window.location.reload();
          }}
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;