import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThenVsNowPosts } from "@/components/social/ThenVsNowPosts";
import { EnhancedMysteryFeature } from "@/components/social/EnhancedMysteryFeature";
import { MemoryStories } from "@/components/social/MemoryStories";
import { TikTokYearbookBrowser } from "@/components/yearbook/TikTokYearbookBrowser";
import { AppLayout } from "@/components/layout/AppLayout";
import { Camera, Eye, Image, Sparkles, BookOpen } from "lucide-react";

const Social = () => {
  const [showTikTokBrowser, setShowTikTokBrowser] = useState(false);

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Social Hub</h1>
          <p className="text-muted-foreground">
            Connect, share memories, and discover your classmates
          </p>
          <Button
            onClick={() => setShowTikTokBrowser(true)}
            className="mt-4"
            variant="outline"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Yearbooks (TikTok Style)
          </Button>
        </div>

        <Tabs defaultValue="then-vs-now" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          <TabsContent value="then-vs-now" className="mt-6">
            <ThenVsNowPosts />
          </TabsContent>

          <TabsContent value="mystery" className="mt-6">
            <EnhancedMysteryFeature />
          </TabsContent>

          <TabsContent value="memories" className="mt-6">
            <MemoryStories />
          </TabsContent>
        </Tabs>

        <TikTokYearbookBrowser
          open={showTikTokBrowser}
          onClose={() => setShowTikTokBrowser(false)}
        />
      </div>
    </AppLayout>
  );
};

export default Social;