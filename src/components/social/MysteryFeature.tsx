import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Users, MapPin, Calendar, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MysteryLooker {
  id: string;
  looker_id: string;
  target_user_id: string;
  school_name: string;
  graduation_year: number;
  mutual_friends_count: number;
  clues: {
    activities?: string[];
    location?: string;
    common_friends?: string[];
  };
  revealed: boolean;
  created_at: string;
}

export function MysteryFeature() {
  const { user, profile } = useAuth();
  const [mysteryLookers, setMysteryLookers] = useState<MysteryLooker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMysteryLookers();
      // Create some mystery activities for demo
      createMysteryActivity();
    }
  }, [user]);

  const fetchMysteryLookers = async () => {
    try {
      // Since mystery_lookups table isn't in the Supabase types yet, 
      // we'll use a demo approach for now
      setMysteryLookers([]);
    } catch (error) {
      console.error('Error fetching mystery lookers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMysteryActivity = async () => {
    // Demo function - in production this would create mystery lookup entries
    // For now we'll just simulate the data
    console.log('Demo mystery activity created');
  };

  const revealIdentity = async (mysteryId: string) => {
    try {
      // Demo function - in production this would update the mystery_lookups table
      toast.success("Identity revealed! Check your messages for their contact info.");
      // Remove the revealed mystery from the list
      setMysteryLookers(prev => prev.filter(m => m.id !== mysteryId));
    } catch (error) {
      console.error('Error revealing identity:', error);
      toast.error("Failed to reveal identity");
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </CardContent>
      </Card>
    );
  }

  // Show demo mystery feature even without real data
  const demoMystery = mysteryLookers.length === 0 ? [{
    id: 'demo-mystery',
    looker_id: 'demo-user',
    target_user_id: user?.id || '',
    school_name: "Lincoln High School",
    graduation_year: profile?.graduation_year || 2020,
    mutual_friends_count: 3,
    clues: {
      activities: ["Drama Club", "Honor Society"],
      location: "California", 
      common_friends: ["Sarah", "Mike", "Lisa"]
    },
    revealed: false,
    created_at: new Date().toISOString()
  }] : [];

  const mysteries = mysteryLookers.length > 0 ? mysteryLookers : demoMystery;

  if (mysteries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {mysteries.map((mystery) => (
        <Card
          key={mystery.id}
          className={cn(
            "relative overflow-hidden border-2 hover-scale",
            "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200",
            "dark:from-purple-950/20 dark:to-pink-950/20 dark:border-purple-800"
          )}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-400 to-pink-400 rounded-bl-full opacity-10"></div>
          
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              🔍 Someone is looking for YOU!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">
              "A classmate from {mystery.school_name} thinks they know you but isn't sure..."
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Graduated {mystery.graduation_year}</span>
              </div>
              
              {mystery.clues.activities && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Was in {mystery.clues.activities.join(", ")}</span>
                </div>
              )}
              
              {mystery.clues.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Lives in {mystery.clues.location} now</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Has {mystery.mutual_friends_count} mutual friends
                  {mystery.clues.common_friends && (
                    <span className="ml-1">
                      including {mystery.clues.common_friends.slice(0, 2).join(", ")}
                      {mystery.clues.common_friends.length > 2 && `, and ${mystery.clues.common_friends.length - 2} others`}
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Think you know who it is?</span>
                  <Badge variant="outline" className="text-xs bg-gradient-to-r from-purple-100 to-pink-100">
                    Premium Feature
                  </Badge>
                </div>
                <Button
                  onClick={() => revealIdentity(mystery.id)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="sm"
                >
                  Reveal Identity
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Premium members can reveal mystery connections instantly
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}