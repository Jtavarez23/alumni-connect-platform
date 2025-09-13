// Alumni Connect - Claim Your Photo Page  
// Find and claim your photos in yearbooks using face recognition

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Search, 
  Users, 
  TrendingUp, 
  Clock,
  Shield,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { FaceSearchInterface } from "@/components/search/FaceSearchInterface";
import { useFaceEmbeddingStats, useFaceClusters } from "@/hooks/useFaceRecognition";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { FaceSearchResult } from "@/hooks/useFaceRecognition";
import { AppLayout } from "@/components/layout/AppLayout";

export default function FaceSearch() {
  const { user } = useAuth();
  const { data: stats } = useFaceEmbeddingStats();
  const { data: clusters } = useFaceClusters(5);

  const handleResultSelect = (result: FaceSearchResult) => {
    toast.success(`Selected face from page ${result.page_id.slice(0, 8)}...`);
    // Here you could navigate to the yearbook page, show more details, etc.
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <div className="text-2xl font-bold mb-2">Authentication Required</div>
            <div className="text-muted-foreground mb-6">
              Please log in to access the face search feature.
            </div>
            <Button>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout title="Claim Your Photo">
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Claim Your Photo</h1>
            <p className="text-muted-foreground">
              Find and claim your photos in yearbooks using AI-powered face recognition
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI-Powered
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Privacy Protected
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Smart Matching
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="clusters" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clusters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <FaceSearchInterface 
            onResultSelect={handleResultSelect}
            maxResults={20}
            showAdvancedOptions={true}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* System Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Faces Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_faces?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all yearbooks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI Processed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.faces_with_embeddings?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for search
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Claimed Faces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.faces_claimed?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified identities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.embedding_coverage_percent || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Faces with AI embeddings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How Face Search Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">AI Detection</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced neural networks detect and analyze faces in yearbook photos
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="p-4 bg-green-500/10 rounded-full w-fit mx-auto mb-4">
                    <Search className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Vector Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate embeddings and find similar faces using vector similarity
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Smart Clustering</h3>
                  <p className="text-sm text-muted-foreground">
                    Group similar faces together to help you find all your photos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <span>All face embeddings are stored securely and never shared with third parties</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <span>You control which faces are claimed and associated with your profile</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <span>Face data is only used for alumni connection and yearbook search</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <span>You can request deletion of your face data at any time</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Face Clusters
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Groups of similar faces that might be the same person
              </p>
            </CardHeader>
            <CardContent>
              {clusters && clusters.length > 0 ? (
                <div className="space-y-4">
                  {clusters.map((cluster) => (
                    <Card key={cluster.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {cluster.name || `Cluster ${cluster.id.slice(0, 8)}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {cluster.face_count} faces
                              {cluster.confidence_score && (
                                <span className="ml-2">
                                  • {(cluster.confidence_score * 100).toFixed(0)}% confidence
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Created {new Date(cluster.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <ArrowRight className="w-4 h-4 mr-2" />
                            View Faces
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <div className="text-lg font-medium">No Clusters Yet</div>
                  <div className="text-muted-foreground">
                    Face clustering will appear here as the AI processes more yearbooks
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AppLayout>
  );
}