import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThenVsNowPosts } from "@/components/social/ThenVsNowPosts";
import { EnhancedMysteryFeature } from "@/components/social/EnhancedMysteryFeature";
import { MemoryStories } from "@/components/social/MemoryStories";
import { TikTokYearbookBrowser } from "@/components/yearbook/TikTokYearbookBrowser";
import { PartyRoomDialog } from "@/components/yearbook/PartyRoomDialog";
import { PartyRoomBrowser } from "@/components/yearbook/PartyRoomBrowser";
import { PartyYearbookViewer } from "@/components/yearbook/PartyYearbookViewer";
import { AppLayout } from "@/components/layout/AppLayout";
import { Feed } from "@/components/feed/Feed";
import { Camera, Eye, Image, BookOpen, Users, Home } from "lucide-react";

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  school: {
    name: string;
  };
}

const Social = () => {
  const { user } = useAuth();
  const [showTikTokBrowser, setShowTikTokBrowser] = useState(false);
  const [activePartyRoom, setActivePartyRoom] = useState<string | null>(null);
  const [yearbooks, setYearbooks] = useState<YearbookEdition[]>([]);
  const [loadingYearbooks, setLoadingYearbooks] = useState(true);

  useEffect(() => {
    if (user) {
      fetchYearbooks();
    }
  }, [user]);

  const fetchYearbooks = async () => {
    try {
      const { data, error } = await supabase
        .from("yearbooks")
        .select(`
          id,
          title,
          year,
          school:schools(name)
        `)
        .eq("upload_status", "completed")
        .order("year", { ascending: false });

      if (error) throw error;
      setYearbooks(data || []);
    } catch (error) {
      console.error("Error fetching yearbooks:", error);
    } finally {
      setLoadingYearbooks(false);
    }
  };

  if (showTikTokBrowser) {
    return (
      <TikTokYearbookBrowser
        open={showTikTokBrowser}
        onClose={() => setShowTikTokBrowser(false)}
      />
    );
  }

  if (activePartyRoom) {
    return (
      <PartyYearbookViewer
        roomId={activePartyRoom}
        onLeave={() => setActivePartyRoom(null)}
      />
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Social Hub</h1>
          <p className="text-muted-foreground">
            Connect, share memories, and discover your classmates
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <Button
              onClick={() => setShowTikTokBrowser(true)}
              variant="outline"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Yearbooks
            </Button>
            {!loadingYearbooks && yearbooks.length > 0 && (
              <PartyRoomDialog
                yearbooks={yearbooks}
                onRoomCreated={(roomId) => setActivePartyRoom(roomId)}
              />
            )}
          </div>
        </div>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="then-vs-now" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Then vs Now
            </TabsTrigger>
            <TabsTrigger value="mystery" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Mystery Game
            </TabsTrigger>
            <TabsTrigger value="memories" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Memory Stories
            </TabsTrigger>
            <TabsTrigger value="party-rooms" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Party Rooms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-6">
            <Feed />
          </TabsContent>

          <TabsContent value="then-vs-now" className="mt-6">
            <ThenVsNowPosts />
          </TabsContent>

          <TabsContent value="mystery" className="mt-6">
            <EnhancedMysteryFeature />
          </TabsContent>

          <TabsContent value="memories" className="mt-6">
            <MemoryStories />
          </TabsContent>

          <TabsContent value="party-rooms" className="mt-6">
            <div className="space-y-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Yearbook Party Rooms</h3>
                <p className="text-muted-foreground mb-4">
                  Browse yearbooks together with your classmates in real-time!
                </p>
                
                {!loadingYearbooks && yearbooks.length > 0 && (
                  <PartyRoomDialog
                    yearbooks={yearbooks}
                    onRoomCreated={(roomId) => setActivePartyRoom(roomId)}
                  />
                )}
              </div>
              
              <PartyRoomBrowser
                onJoinRoom={(roomId) => setActivePartyRoom(roomId)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Social;