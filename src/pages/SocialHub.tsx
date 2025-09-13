import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Users, 
  Gift, 
  Activity, 
  Zap, 
  Trophy,
  Flame,
  Star,
  Crown
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SocialProofWidget } from "@/components/social/SocialProofWidget";
import { FOMOActivityFeed } from "@/components/realtime/FOMOActivityFeed";
import { TrendingMemories } from "@/components/social/TrendingMemories";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";

const SocialHub = () => {
  const { user, profile } = useAuth();
  const { schoolHistory } = useSchoolHistory();
  const [activeTab, setActiveTab] = useState("trending");

  const isProfileComplete = schoolHistory.length > 0;

  if (!user) {
    return (
      <AppLayout title="Social Hub">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Join the Conversation!</h2>
          <p className="text-muted-foreground mb-6">
            Sign in to access trending memories, connect with classmates, and earn rewards.
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Sign In
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!isProfileComplete) {
    return (
      <AppLayout title="Social Hub">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Complete Your Profile First!</h2>
          <p className="text-muted-foreground mb-6">
            Add your school history to access all the amazing social features.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Complete Profile
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Social Hub">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            Social Hub
          </h1>
          <p className="text-muted-foreground">
            Discover trending memories, connect with classmates, and be part of the conversation!
          </p>
        </div>

        {/* Social Proof - Always Visible */}
        <SocialProofWidget className="mb-8" />

        {/* Main Social Features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Activity
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Trending Content Tab */}
          <TabsContent value="trending" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TrendingMemories variant="full" showChallenges={true} />
              </div>
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Today's Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-red-500">47</div>
                          <div className="text-xs text-muted-foreground">Viral Posts</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-500">234</div>
                          <div className="text-xs text-muted-foreground">Total Reactions</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-500">15</div>
                          <div className="text-xs text-muted-foreground">Challenges</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-500">89</div>
                          <div className="text-xs text-muted-foreground">Active Users</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trending Tags */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Trending Topics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                          #prom2019
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          #seniorprank
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          #graduation
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                          #thenvsnnow
                        </Badge>
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                          #classmates
                        </Badge>
                        <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200">
                          #memories
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Live Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <FOMOActivityFeed variant="full" showUrgencyEvents={true} />
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Referral system has been removed.</p>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Most Active */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Most Active Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "David Brown", activity: "Posted 15 memories", streak: "12 day streak", badge: "🔥" },
                      { name: "Lisa Garcia", activity: "89 reactions given", streak: "8 day streak", badge: "❤️" },
                      { name: "James Wilson", activity: "Connected with 23 people", streak: "5 day streak", badge: "🤝" },
                      { name: "Maria Rodriguez", activity: "Shared 8 yearbook photos", streak: "15 day streak", badge: "📸" },
                      { name: "John Smith", activity: "Commented 47 times", streak: "3 day streak", badge: "💬" }
                    ].map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{user.badge}</div>
                          <div>
                            <p className="font-semibold text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.activity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{user.streak}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Your Rankings */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Your Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-green-600">#12</div>
                    <div className="text-sm text-muted-foreground">Activity Rank</div>
                    <Badge variant="outline" className="mt-2">Very active</Badge>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">#4</div>
                    <div className="text-sm text-muted-foreground">Social Rank</div>
                    <Badge variant="outline" className="mt-2">Rising fast!</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SocialHub;