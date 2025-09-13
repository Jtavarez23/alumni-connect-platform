import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  Flame, 
  Heart, 
  MessageCircle, 
  Share2,
  Trophy,
  Clock,
  Zap,
  ArrowUp,
  Star,
  Camera,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";

interface TrendingMemory {
  id: string;
  content_id: string;
  content_type: 'memory' | 'yearbook_entry' | 'then_vs_now' | 'achievement';
  title: string;
  content: string;
  image_url?: string;
  author_name: string;
  author_avatar?: string;
  trending_score: number;
  total_reactions: number;
  total_shares: number;
  total_comments: number;
  velocity_score: number; // Reactions per hour
  trending_badge: 'hot' | 'rising' | 'viral' | 'legendary';
  time_trending: string;
}

interface ViralChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'photo_contest' | 'story_sharing' | 'then_vs_now' | 'group_memory';
  end_date: string;
  participant_count: number;
  prize_description: string;
  is_trending: boolean;
}

interface TrendingMemoriesProps {
  className?: string;
  variant?: 'full' | 'compact' | 'widget';
  showChallenges?: boolean;
  limit?: number;
}

export function TrendingMemories({ 
  className = "", 
  variant = 'full', 
  showChallenges = true,
  limit = 5
}: TrendingMemoriesProps) {
  const { user } = useAuth();
  const { schoolHistory, getPrimarySchool } = useSchoolHistory();
  const [trendingMemories, setTrendingMemories] = useState<TrendingMemory[]>([]);
  const [viralChallenges, setViralChallenges] = useState<ViralChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && schoolHistory.length > 0) {
      fetchTrendingData();
    }
  }, [user, schoolHistory]);

  const fetchTrendingData = async () => {
    if (!user) return;
    
    const primarySchool = getPrimarySchool();
    if (!primarySchool?.schools?.id) return;

    try {
      // Fetch trending content
      const { data: trendingData, error: trendingError } = await supabase
        .from('trending_content')
        .select('*')
        .eq('school_id', primarySchool.schools.id)
        .eq('time_period', 'daily')
        .order('trending_score', { ascending: false })
        .limit(limit);

      // Fetch viral challenges  
      const { data: challengeData, error: challengeError } = await supabase
        .from('memory_challenges')
        .select('*')
        .eq('school_id', primarySchool.schools.id)
        .eq('is_active', true)
        .order('participant_count', { ascending: false })
        .limit(3);

      // Process trending memories (mock data for now since we need actual content)
      const mockTrendingMemories: TrendingMemory[] = [
        {
          id: '1',
          content_id: 'memory_1',
          content_type: 'memory',
          title: 'Remember our epic senior prank?',
          content: 'When we turned the entire cafeteria into a beach party complete with sand and palm trees! 🏖️ The principal\'s face was priceless!',
          image_url: 'https://images.unsplash.com/photo-1544827763-2c1b8b2b3b7b?w=400',
          author_name: 'Sarah Johnson',
          author_avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=100',
          trending_score: 89.5,
          total_reactions: 47,
          total_shares: 12,
          total_comments: 23,
          velocity_score: 15.6,
          trending_badge: 'viral',
          time_trending: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          content_id: 'then_vs_now_1',
          content_type: 'then_vs_now',
          title: 'Prom 2019 vs Now',
          content: 'Found my old prom photos and decided to recreate the pose. Some things never change! 😂',
          image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
          author_name: 'Mike Chen',
          author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
          trending_score: 72.3,
          total_reactions: 34,
          total_shares: 8,
          total_comments: 16,
          velocity_score: 11.3,
          trending_badge: 'hot',
          time_trending: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          content_id: 'yearbook_entry_1',
          content_type: 'yearbook_entry',
          title: 'Found our class clown!',
          content: 'Just discovered Tommy\'s yearbook photo and his quote is still hilarious: "I came, I saw, I forgot what I came for" 🤣',
          author_name: 'Emma Davis',
          author_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
          trending_score: 58.7,
          total_reactions: 28,
          total_shares: 5,
          total_comments: 12,
          velocity_score: 9.5,
          trending_badge: 'rising',
          time_trending: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Mock viral challenges
      const mockChallenges: ViralChallenge[] = [
        {
          id: 'challenge_1',
          title: '🤳 Most Embarrassing School Photo',
          description: 'Share your most cringe-worthy school photo for a chance to win a $50 gift card!',
          challenge_type: 'photo_contest',
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          participant_count: 23,
          prize_description: '$50 Amazon Gift Card',
          is_trending: true
        },
        {
          id: 'challenge_2',
          title: '📝 Share Your Senior Quote Story',
          description: 'Tell us the story behind your senior quote! What made you choose those words?',
          challenge_type: 'story_sharing',
          end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          participant_count: 15,
          prize_description: 'Featured in newsletter',
          is_trending: false
        }
      ];

      setTrendingMemories(mockTrendingMemories);
      setViralChallenges(mockChallenges);

    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendingBadge = (badge: string) => {
    switch (badge) {
      case 'viral':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white"><Flame className="w-3 h-3 mr-1" />VIRAL</Badge>;
      case 'hot':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white"><TrendingUp className="w-3 h-3 mr-1" />HOT</Badge>;
      case 'rising':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white"><ArrowUp className="w-3 h-3 mr-1" />RISING</Badge>;
      case 'legendary':
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white"><Trophy className="w-3 h-3 mr-1" />LEGENDARY</Badge>;
      default:
        return <Badge variant="secondary"><Star className="w-3 h-3 mr-1" />TRENDING</Badge>;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatTimeLeft = (endDate: string) => {
    const now = Date.now();
    const end = new Date(endDate).getTime();
    const diff = Math.floor((end - now) / 1000);
    
    if (diff < 0) return 'Ended';
    if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
    return `${Math.floor(diff / 86400)}d left`;
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

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium">Trending Now</span>
        </div>
        {trendingMemories.length > 0 && (
          <div className="text-sm text-muted-foreground truncate">
            {trendingMemories[0].title} • {trendingMemories[0].total_reactions} reactions
          </div>
        )}
      </div>
    );
  }

  if (variant === 'widget') {
    return (
      <Card className={`border-2 border-red-200 dark:border-red-800 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <Flame className="w-4 h-4" />
            Trending
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {trendingMemories.slice(0, 3).map((memory) => (
            <div key={memory.id} className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={memory.author_avatar} />
                <AvatarFallback className="text-xs">
                  {memory.author_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{memory.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendingBadge(memory.trending_badge)}
                  <span className="text-xs text-muted-foreground">
                    {memory.total_reactions} reactions
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Trending Header */}
      <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <Flame className="w-6 h-6" />
            Trending Memories
            <Badge className="bg-red-500 text-white">
              <TrendingUp className="w-3 h-3 mr-1" />
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            The hottest memories and stories from your classmates right now! 🔥
          </p>
        </CardContent>
      </Card>

      {/* Trending Memories */}
      <div className="space-y-4">
        {trendingMemories.map((memory, index) => (
          <Card key={memory.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-center">
                  <div className="text-2xl font-bold text-red-500">#{index + 1}</div>
                  {getTrendingBadge(memory.trending_badge)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={memory.author_avatar} />
                        <AvatarFallback className="text-xs">
                          {memory.author_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{memory.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(memory.time_trending)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {Math.round(memory.trending_score)}
                      </div>
                      <div className="text-xs text-muted-foreground">trend score</div>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg mb-2">{memory.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {memory.content}
                  </p>

                  {memory.image_url && (
                    <div className="mb-3">
                      <img 
                        src={memory.image_url} 
                        alt={memory.title}
                        className="rounded-lg max-w-full h-auto max-h-48 object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Heart className="w-4 h-4 text-red-500" />
                        {memory.total_reactions}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageCircle className="w-4 h-4" />
                        {memory.total_comments}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Share2 className="w-4 h-4" />
                        {memory.total_shares}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-orange-600">
                        <Zap className="w-4 h-4" />
                        {memory.velocity_score.toFixed(1)}/hr
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Memory
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Viral Challenges */}
      {showChallenges && viralChallenges.length > 0 && (
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Trophy className="w-5 h-5" />
              Viral Challenges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {viralChallenges.map((challenge) => (
              <div key={challenge.id} className="p-4 bg-background rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold">{challenge.title}</h4>
                      {challenge.is_trending && (
                        <Badge className="bg-red-500 text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Trending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {challenge.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {challenge.participant_count} participants
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeLeft(challenge.end_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {challenge.prize_description}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm">
                      <Camera className="w-3 h-3 mr-1" />
                      Join Challenge
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create Challenge CTA */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-blue-600" />
          <h3 className="font-semibold mb-1">Start Your Own Challenge!</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Create a viral challenge and get your classmates engaged
          </p>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            Create Challenge
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}