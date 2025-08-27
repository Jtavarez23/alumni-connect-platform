import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, GraduationCap, Users, BookOpen } from "lucide-react";
import ProfileSetupDialog from "@/components/profile/ProfileSetupDialog";
import ProfileEditDialog from "@/components/profile/ProfileEditDialog";

interface School {
  id: string;
  name: string;
  type: string;
  location: any;
}

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    if (profile && profile.school_id) {
      fetchSchool();
    }
  }, [profile]);

  useEffect(() => {
    // Show profile setup if user hasn't completed their profile
    if (profile && (!profile.school_id || !profile.graduation_year)) {
      setShowProfileSetup(true);
    }
  }, [profile]);

  const fetchSchool = async () => {
    if (!profile?.school_id) return;
    
    const { data } = await supabase
      .from('schools')
      .select('*')
      .eq('id', profile.school_id)
      .single();
    
    if (data) setSchool(data);
  };

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

  const isProfileComplete = profile?.school_id && profile?.graduation_year;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-muted-foreground">
              {profile?.first_name ? `Hi ${profile.first_name}` : "Complete your profile to get started"}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowProfileEdit(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
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
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">School</p>
                <p className="font-medium">
                  {school ? school.name : "Not selected"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Graduation Year</p>
                <p className="font-medium">
                  {profile?.graduation_year || "Not specified"}
                </p>
              </div>
            </div>
            {!isProfileComplete && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Complete your profile to access all features
                </p>
                <Button onClick={() => setShowProfileSetup(true)}>
                  Complete Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest interactions and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
              <p className="text-sm mt-1">
                Complete your profile to start connecting with classmates
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Setup Dialog */}
      <ProfileSetupDialog 
        open={showProfileSetup} 
        onOpenChange={setShowProfileSetup}
        onComplete={() => {
          setShowProfileSetup(false);
          window.location.reload(); // Refresh to update profile data
        }}
      />

      {/* Profile Edit Dialog */}
      <ProfileEditDialog 
        open={showProfileEdit} 
        onOpenChange={setShowProfileEdit}
        onComplete={() => {
          setShowProfileEdit(false);
          window.location.reload(); // Refresh to update profile data
        }}
      />
    </div>
  );
};

export default Dashboard;