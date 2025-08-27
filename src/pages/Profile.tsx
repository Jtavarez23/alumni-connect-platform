import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Edit, MapPin, GraduationCap, Shield, Calendar, Activity } from "lucide-react";
import ProfileEditDialog from "@/components/profile/ProfileEditDialog";
import ProfileStats from "@/components/profile/ProfileStats";

export default function Profile() {
  const { profile, user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const getInitials = () => {
    if (!profile) return "U";
    return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  };

  const getVerificationBadge = () => {
    const status = profile?.verification_status || 'pending';
    const variants = {
      verified: { variant: 'default' as const, text: 'Verified', color: 'bg-success' },
      pending: { variant: 'secondary' as const, text: 'Pending', color: 'bg-warning' },
      unverified: { variant: 'outline' as const, text: 'Unverified', color: 'bg-muted' }
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  if (!profile || !user) {
    return (
      <AppLayout title="Profile">
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading profile...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const badge = getVerificationBadge();

  return (
    <AppLayout title="Profile">
      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || ""} alt={`${profile.first_name} ${profile.last_name}`} />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <Badge variant={badge.variant} className={`${badge.color} text-white`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {badge.text}
                  </Badge>
                </div>
                
                {profile.bio && (
                  <p className="text-muted-foreground mb-3">{profile.bio}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {profile.school_id && (
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      <span>Alumni</span>
                    </div>
                  )}
                  {profile.graduation_year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Class of {profile.graduation_year}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Member since {new Date(profile.created_at || "").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
              
              <Button onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Profile Statistics */}
            <ProfileStats userId={profile.id} />
            
            {/* Additional Profile Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.bio ? (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No bio available. Click "Edit Profile" to add one.</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{user.email}</span>
                  </div>
                  {profile.graduation_year && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Graduation Year:</span>
                      <span>{profile.graduation_year}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Privacy Level:</span>
                    <span className="capitalize">{profile.privacy_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscription:</span>
                    <span className="capitalize">{profile.subscription_status}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your recent interactions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Activity Feed</h3>
                  <p className="text-muted-foreground">
                    Activity tracking is coming soon. We'll show your recent connections, messages, and yearbook interactions here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Profile Edit Dialog */}
        <ProfileEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onComplete={() => setEditDialogOpen(false)}
        />
      </div>
    </AppLayout>
  );
}