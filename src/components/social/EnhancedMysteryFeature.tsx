import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Users, MapPin, Sparkles, Trophy, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface MysteryClue {
  type: 'school' | 'year' | 'activity' | 'location' | 'mutual_friends' | 'quote';
  value: string;
  revealed: boolean;
}

interface MysteryGameSession {
  id: string;
  user_id: string;
  target_user_id: string;
  school_id: string;
  graduation_year: number;
  game_status: string | null;
  score: number | null;
  clues_revealed: number | null;
  max_clues: number | null;
  started_at: string | null;
  completed_at?: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  mystery_clues?: MysteryClue[];
  school?: { name: string };
}

export const EnhancedMysteryFeature = () => {
  const [sessions, setSessions] = useState<MysteryGameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMysterySessions();
  }, []);

  const fetchMysterySessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mystery_game_sessions')
        .select(`
          *,
          school:schools(name)
        `)
        .eq('user_id', user.id)
        .eq('game_status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate clues for each session
      const sessionsWithClues = (data || []).map((session) => {
        const clues = generateCluesFromData(session);
        return { ...session, mystery_clues: clues };
      });

      setSessions(sessionsWithClues);
    } catch (error) {
      console.error('Error fetching mystery sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load mystery games",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCluesFromData = (session: MysteryGameSession): MysteryClue[] => {
    const cluesRevealed = session.clues_revealed || 0;
    const maxClues = session.max_clues || 3;
    
    const allClues: MysteryClue[] = [
      {
        type: 'school',
        value: `Attended ${session.school?.name || 'Unknown School'}`,
        revealed: cluesRevealed >= 1
      },
      {
        type: 'year',
        value: `Graduated in ${session.graduation_year}`,
        revealed: cluesRevealed >= 2
      },
      {
        type: 'activity',
        value: 'Was active in student organizations',
        revealed: cluesRevealed >= 3
      }
    ];

    return allClues.slice(0, maxClues);
  };

  const generateNewMystery = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      // Get user's school for creating a realistic mystery
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, graduation_year')
        .eq('id', user.id)
        .single();

      if (!profile?.school_id) {
        toast({
          title: "Setup Required",
          description: "Please complete your profile to play mystery games",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('mystery_game_sessions')
        .insert({
          user_id: user.id,
          target_user_id: user.id, // Demo: using same user
          school_id: profile.school_id,
          graduation_year: profile.graduation_year || 2020,
          clues_revealed: 1
        });

      if (error) throw error;

      await fetchMysterySessions();
      toast({
        title: "New Mystery Game!",
        description: "A new mystery classmate is waiting to be discovered",
      });
    } catch (error) {
      console.error('Error generating mystery:', error);
      toast({
        title: "Error",
        description: "Failed to generate new mystery",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const revealNextClue = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session || session.clues_revealed >= session.max_clues) return;

      const { error } = await supabase
        .from('mystery_game_sessions')
        .update({ 
          clues_revealed: session.clues_revealed + 1,
          score: session.score + 5
        })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchMysterySessions();
      toast({
        title: "New Clue Revealed!",
        description: "You've uncovered another clue about this mystery classmate",
      });
    } catch (error) {
      console.error('Error revealing clue:', error);
      toast({
        title: "Error",
        description: "Failed to reveal clue",
        variant: "destructive"
      });
    }
  };

  const completeGame = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('mystery_game_sessions')
        .update({ 
          game_status: 'completed',
          completed_at: new Date().toISOString(),
          score: 100
        })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchMysterySessions();
      toast({
        title: "Mystery Solved!",
        description: "Congratulations! You've identified your mystery classmate!",
      });
    } catch (error) {
      console.error('Error completing game:', error);
      toast({
        title: "Error",
        description: "Failed to complete game",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Mystery Classmates</h2>
          <Button disabled>
            <Sparkles className="h-4 w-4 mr-2" />
            New Mystery
          </Button>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-40 bg-muted rounded-lg"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mystery Classmates</h2>
          <p className="text-muted-foreground">
            Discover who your mystery classmate is using the clues
          </p>
        </div>
        <Button onClick={generateNewMystery} disabled={generating}>
          <Sparkles className="h-4 w-4 mr-2" />
          {generating ? "Generating..." : "New Mystery"}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active mysteries</h3>
            <p className="text-muted-foreground mb-4">
              Generate a new mystery to start discovering classmates!
            </p>
            <Button onClick={generateNewMystery} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Mystery
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sessions.map((session) => {
            const isCompleted = session.game_status === 'completed';
            const cluesRevealed = session.clues_revealed || 0;
            const maxClues = session.max_clues || 3;
            const score = session.score || 0;
            const progress = (cluesRevealed / maxClues) * 100;
            
            return (
              <Card key={session.id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Mystery Classmate from {session.school?.name || 'Unknown School'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {score} pts
                      </Badge>
                      {isCompleted && (
                        <Badge variant="default">Completed</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Mystery Avatar */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      <Avatar className="h-20 w-20">
                        {isCompleted ? (
                          <AvatarImage src="" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                            <Eye className="h-8 w-8 text-primary-foreground" />
                          </div>
                        )}
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      {!isCompleted && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <EyeOff className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Graduated in {session.graduation_year}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{cluesRevealed}/{maxClues} clues revealed</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Clues */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Clues:</h4>
                    {session.mystery_clues?.map((clue, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border transition-all ${
                          clue.revealed
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-muted/50 border-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {clue.type === 'school' && <Users className="h-4 w-4" />}
                          {clue.type === 'location' && <MapPin className="h-4 w-4" />}
                          {clue.type === 'activity' && <Sparkles className="h-4 w-4" />}
                          <span className={clue.revealed ? '' : 'blur-sm'}>
                            {clue.revealed ? clue.value : 'Hidden clue - reveal to see'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  {!isCompleted && (
                    <div className="space-y-2">
                      {cluesRevealed < maxClues && (
                        <Button
                          onClick={() => revealNextClue(session.id)}
                          className="w-full"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Reveal Next Clue
                        </Button>
                      )}
                      <Button
                        onClick={() => completeGame(session.id)}
                        className="w-full"
                        size="lg"
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Solve Mystery
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};