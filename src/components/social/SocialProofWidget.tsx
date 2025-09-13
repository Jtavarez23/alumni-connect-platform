import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Heart, 
  UserPlus, 
  School,
  Sparkles,
  ArrowUp,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";
import { toast } from "sonner";

interface SocialProofData {
  totalClassmates: number;
  joinedClassmates: number;
  completionPercentage: number;
  mutualConnections: number;
  recentJoins: RecentJoin[];
  onlineNow: number;
  trendingMemories: TrendingMemory[];
}

interface RecentJoin {
  id: string;
  name: string;
  avatar_url?: string;
  joined_at: string;
  mutual_friends: number;
}

interface TrendingMemory {
  id: string;
  content: string;
  reaction_count: number;
  author_name: string;
}

interface SocialProofWidgetProps {
  className?: string;
  compact?: boolean;
  showActions?: boolean;
}

export function SocialProofWidget({ className = "", compact = false, showActions = true }: SocialProofWidgetProps) {
  const { user } = useAuth();
  const { schoolHistory, getPrimarySchool } = useSchoolHistory();
  const [socialProof, setSocialProof] = useState<SocialProofData>({
    totalClassmates: 0,
    joinedClassmates: 0,
    completionPercentage: 0,
    mutualConnections: 0,
    recentJoins: [],
    onlineNow: 0,
    trendingMemories: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && schoolHistory.length > 0) {
      fetchSocialProofData();
    }
  }, [user, schoolHistory]);

  const fetchSocialProofData = async () => {
    if (!user) return;
    
    const primarySchool = getPrimarySchool();
    if (!primarySchool?.schools?.id) return;

    try {
      // Fetch social proof metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('social_proof_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', primarySchool.schools.id);

      if (metricsError && metricsError.code !== 'PGRST116') {
        console.error('Error fetching social proof metrics:', metricsError);
      }

      // Fetch recent joins
      const { data: recentUsers, error: recentError } = await supabase
        .from('user_education')
        .select(`
          user_id,
          created_at,
          profiles!inner(id, first_name, last_name, avatar_url)
        `)
        .eq('school_id', primarySchool.schools.id)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent joins:', recentError);
      }

      // Fetch live activity count
      const { data: liveActivity, error: activityError } = await supabase
        .from('live_activity')
        .select('user_id')
        .eq('school_id', primarySchool.schools.id)
        .eq('is_active', true)
        .gt('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (activityError) {
        console.error('Error fetching live activity:', activityError);
      }

      // Fetch total students count
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('total_students')
        .eq('id', primarySchool.schools.id)
        .single();

      // Count total users from this school
      const { count: totalJoined, error: countError } = await supabase
        .from('user_education')
        .select('user_id', { count: 'exact' })
        .eq('school_id', primarySchool.schools.id);

      // Fetch mutual connections count
      const { data: mutualConnections, error: mutualError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      // Fetch trending memories
      const { data: trendingData, error: trendingError } = await supabase
        .from('trending_content')
        .select(`
          content_id,
          total_reactions,
          content_type
        `)
        .eq('school_id', primarySchool.schools.id)
        .eq('time_period', 'daily')
        .order('trending_score', { ascending: false })
        .limit(3);

      // Process the data
      const totalClassmates = schoolData?.total_students || 200;
      const joinedClassmates = totalJoined || 0;
      const completionPercentage = Math.round((joinedClassmates / totalClassmates) * 100);
      const onlineNow = liveActivity?.length || 0;

      const recentJoins: RecentJoin[] = recentUsers?.map(user => ({
        id: user.user_id,
        name: user.profiles ? `${user.profiles.first_name || ''} ${user.profiles.last_name || ''}`.trim() || 'Unknown User' : 'Unknown User',
        avatar_url: user.profiles?.avatar_url,
        joined_at: user.created_at,
        mutual_friends: Math.floor(Math.random() * 8) + 1 // TODO: Calculate actual mutual friends
      })) || [];

      setSocialProof({
        totalClassmates,
        joinedClassmates,
        completionPercentage,
        mutualConnections: mutualConnections?.length || 0,
        recentJoins,
        onlineNow,
        trendingMemories: [] // TODO: Fetch actual trending memories
      });

    } catch (error) {
      console.error('Error fetching social proof data:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviteFriends = () => {
    // Generate referral link and copy to clipboard
    const referralCode = `FRIEND${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
    
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Users className="w-4 h-4" />
        <span>{socialProof.joinedClassmates} of {socialProof.totalClassmates} classmates joined</span>
        {socialProof.onlineNow > 0 && (
          <>
            <span>•</span>
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-green-600">{socialProof.onlineNow} online</span>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={`${className} border-2 border-primary/10 bg-gradient-to-r from-primary/5 to-secondary/5`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Main Stats */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <School className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Your Class Network</h3>
            </div>
            <div className="flex items-center justify-center gap-4 text-2xl font-bold text-primary">
              <span>{socialProof.joinedClassmates}</span>
              <span className="text-muted-foreground text-sm font-normal">of</span>
              <span>{socialProof.totalClassmates}</span>
            </div>
            <p className="text-sm text-muted-foreground">classmates have joined</p>
            <Badge variant="secondary" className="mt-2">
              {socialProof.completionPercentage}% complete
            </Badge>
          </div>

          {/* Live Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <Activity className="w-4 h-4" />
                <span className="font-bold">{socialProof.onlineNow}</span>
              </div>
              <p className="text-xs text-muted-foreground">online now</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="font-bold">{socialProof.mutualConnections}</span>
              </div>
              <p className="text-xs text-muted-foreground">mutual friends</p>
            </div>
          </div>

          {/* Recent Joins */}
          {socialProof.recentJoins.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-sm">Recent Joins</h4>
                <TrendingUp className="w-3 h-3 text-green-600" />
              </div>
              <div className="space-y-2">
                {socialProof.recentJoins.slice(0, 3).map((join) => (
                  <div key={join.id} className="flex items-center gap-3 p-2 bg-background rounded-lg border">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={join.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {join.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{join.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {join.mutual_friends} mutual friends
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(join.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOMO & Action */}
          {showActions && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Don't let your classmates get ahead!
                  </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {socialProof.totalClassmates - socialProof.joinedClassmates} classmates are still missing out
                </p>
              </div>
              
              <Button onClick={inviteFriends} className="w-full" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Classmates
              </Button>
            </div>
          )}

          {/* Viral Proof */}
          <div className="text-center text-xs text-muted-foreground border-t pt-3">
            <div className="flex items-center justify-center gap-1">
              <ArrowUp className="w-3 h-3 text-green-600" />
              <span>Join {socialProof.joinedClassmates} classmates who've already reconnected</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}