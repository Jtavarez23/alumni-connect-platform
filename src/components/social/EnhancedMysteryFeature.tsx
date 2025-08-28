import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Users, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MysteryClue {
  type: 'school' | 'year' | 'activity' | 'location' | 'mutual_friends' | 'quote';
  value: string;
  revealed: boolean;
}

interface MysteryLookup {
  id: string;
  looker_id: string;
  target_user_id: string;
  school_name: string;
  graduation_year: number;
  mutual_friends_count: number;
  clues: any;
  revealed: boolean;
  created_at: string;
  expires_at: string;
  mystery_clues?: MysteryClue[];
}

export const EnhancedMysteryFeature = () => {
  const [sessions, setSessions] = useState<MysteryLookup[]>([]);
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
        .from('mystery_lookups')
        .select('*')
        .eq('target_user_id', user.id)
        .eq('revealed', false)
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

  const generateCluesFromData = (session: MysteryLookup): MysteryClue[] => {
    const allClues: MysteryClue[] = [
      {
        type: 'school',
        value: `Attended ${session.school_name}`,
        revealed: true
      },
      {
        type: 'year',
        value: `Graduated in ${session.graduation_year}`,
        revealed: true
      },
      {
        type: 'mutual_friends',
        value: `Has ${session.mutual_friends_count} mutual friends with you`,
        revealed: true
      }
    ];

    // Add clues from the clues object if available
    if (session.clues && typeof session.clues === 'object') {
      Object.entries(session.clues).forEach(([key, value]) => {
        allClues.push({
          type: key as any,
          value: value as string,
          revealed: true
        });
      });
    }

    return allClues;
  };

  const generateNewMystery = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      // For demo, we'll create a mock session
      const { error } = await supabase
        .from('mystery_lookups')
        .insert({
          looker_id: user.id,
          target_user_id: user.id,
          school_name: 'Demo High School',
          graduation_year: 2020,
          mutual_friends_count: 3,
          clues: { activity: 'Was in drama club', location: 'Lives nearby' }
        });

      if (error) throw error;

      await fetchMysterySessions();
      toast({
        title: "New Mystery!",
        description: "A new mystery person is waiting to be discovered",
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

  const revealIdentity = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('mystery_lookups')
        .update({ revealed: true })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchMysterySessions();
      toast({
        title: "Mystery Solved!",
        description: "Identity revealed!",
      });
    } catch (error) {
      console.error('Error revealing identity:', error);
      toast({
        title: "Error",
        description: "Failed to reveal identity",
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
          {sessions.map((session) => (
            <Card key={session.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Mystery Classmate from {session.school_name}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Mystery Avatar */}
                <div className="text-center">
                  <div className="relative inline-block">
                    <Avatar className="h-20 w-20">
                      {session.revealed ? (
                        <AvatarImage src="" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                          <Eye className="h-8 w-8 text-primary-foreground" />
                        </div>
                      )}
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    {!session.revealed && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <EyeOff className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Graduated in {session.graduation_year}
                  </p>
                </div>

                {/* Clues */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Clues:</h4>
                  {session.mystery_clues?.map((clue, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-primary/5 border-primary/20"
                    >
                      <div className="flex items-center gap-2">
                        {clue.type === 'school' && <Users className="h-4 w-4" />}
                        {clue.type === 'location' && <MapPin className="h-4 w-4" />}
                        {clue.type === 'mutual_friends' && <Users className="h-4 w-4" />}
                        <span>{clue.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                {!session.revealed && (
                  <Button
                    onClick={() => revealIdentity(session.id)}
                    className="w-full"
                    size="lg"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Reveal Identity
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};