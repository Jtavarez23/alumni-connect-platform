// Alumni Connect - Advanced Face Search Interface
// Implements AI-powered face search functionality

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Search, 
  User, 
  Image, 
  Brain, 
  Filter, 
  Sliders,
  Camera,
  Eye,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { 
  useFaceImageSearch,
  useFaceSimilaritySearch,
  useProfilePhotoFaceSearch,
  useFaceEmbeddingStats,
  useFaceClusters,
  useRecordFaceSearch,
  type FaceSearchResult
} from "@/hooks/useFaceRecognition";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FaceSearchInterfaceProps {
  onResultSelect?: (result: FaceSearchResult) => void;
  maxResults?: number;
  showAdvancedOptions?: boolean;
}

export const FaceSearchInterface = ({
  onResultSelect,
  maxResults = 20,
  showAdvancedOptions = true
}: FaceSearchInterfaceProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search state
  const [searchType, setSearchType] = useState<'upload' | 'profile' | 'existing'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [faceId, setFaceId] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Search parameters
  const [similarityThreshold, setSimilarityThreshold] = useState([0.75]);
  const [qualityThreshold, setQualityThreshold] = useState([0.5]);
  const [includeClusters, setIncludeClusters] = useState(true);
  const [onlyUnclaimedFaces, setOnlyUnclaimedFaces] = useState(false);
  
  // Hooks
  const imageSearch = useFaceImageSearch();
  const similaritySearch = useFaceSimilaritySearch();
  const profileSearch = useProfilePhotoFaceSearch();
  const recordSearch = useRecordFaceSearch();
  const { data: stats } = useFaceEmbeddingStats();
  const { data: clusters } = useFaceClusters(10);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to perform face search');
      return;
    }

    setIsSearching(true);
    const startTime = Date.now();
    
    try {
      let results: FaceSearchResult[] = [];
      
      switch (searchType) {
        case 'upload':
          if (!selectedFile) {
            toast.error('Please select an image to search');
            return;
          }
          results = await imageSearch.mutateAsync({
            imageFile: selectedFile,
            similarityThreshold: similarityThreshold[0],
            maxResults
          });
          break;
          
        case 'existing':
          if (!faceId) {
            toast.error('Please enter a face ID');
            return;
          }
          results = await similaritySearch.mutateAsync({
            faceId,
            similarityThreshold: similarityThreshold[0],
            maxResults
          });
          break;
          
        case 'profile':
          results = await profileSearch.mutateAsync({
            userId: user.id,
            similarityThreshold: similarityThreshold[0],
            maxResults
          });
          break;
      }
      
      // Filter results based on quality threshold and claimed status
      const filteredResults = results.filter(result => {
        const qualityCheck = !result.quality_score || result.quality_score >= qualityThreshold[0];
        const claimedCheck = !onlyUnclaimedFaces || !result.is_claimed;
        return qualityCheck && claimedCheck;
      });
      
      setSearchResults(filteredResults);
      
      // Record the search
      await recordSearch.mutateAsync({
        userId: user.id,
        queryType: searchType,
        queryMetadata: {
          similarity_threshold: similarityThreshold[0],
          quality_threshold: qualityThreshold[0],
          include_clusters: includeClusters,
          only_unclaimed: onlyUnclaimedFaces,
          search_type: searchType
        },
        resultsCount: filteredResults.length,
        searchDurationMs: Date.now() - startTime
      });
      
      toast.success(`Found ${filteredResults.length} similar faces`);
      
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [
    user,
    searchType,
    selectedFile,
    faceId,
    similarityThreshold,
    qualityThreshold,
    onlyUnclaimedFaces,
    includeClusters,
    maxResults,
    imageSearch,
    similaritySearch,
    profileSearch,
    recordSearch
  ]);

  const resetSearch = useCallback(() => {
    setSelectedFile(null);
    setFaceId('');
    setSearchResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Face Recognition System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.total_faces?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Faces</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.faces_with_embeddings?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-muted-foreground">AI Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.faces_claimed?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-muted-foreground">Claimed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.embedding_coverage_percent || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Coverage</div>
                <Progress 
                  value={stats.embedding_coverage_percent || 0} 
                  className="mt-1 h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Face Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={searchType} onValueChange={(value: any) => setSearchType(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Photo
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                My Profile
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Face ID
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 space-y-4">
              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="face-upload"
                  />
                  <label htmlFor="face-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      <Camera className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Click to upload photo</div>
                        <div className="text-sm text-muted-foreground">
                          JPG, PNG up to 10MB
                        </div>
                      </div>
                    </div>
                  </label>
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <div className="font-medium">{selectedFile.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="profile" className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    This will search using your profile photo to find similar faces in yearbooks
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="existing" className="space-y-4">
                <Input
                  placeholder="Enter face ID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
                  value={faceId}
                  onChange={(e) => setFaceId(e.target.value)}
                />
              </TabsContent>

              {showAdvancedOptions && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4" />
                      <Label className="font-medium">Advanced Options</Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Similarity Threshold: {similarityThreshold[0]}</Label>
                        <Slider
                          value={similarityThreshold}
                          onValueChange={setSimilarityThreshold}
                          min={0.5}
                          max={0.95}
                          step={0.05}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">
                          Higher values = more precise matches
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Quality Threshold: {qualityThreshold[0]}</Label>
                        <Slider
                          value={qualityThreshold}
                          onValueChange={setQualityThreshold}
                          min={0.1}
                          max={1.0}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">
                          Minimum face detection quality
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="clusters"
                          checked={includeClusters}
                          onCheckedChange={setIncludeClusters}
                        />
                        <Label htmlFor="clusters">Include cluster info</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="unclaimed"
                          checked={onlyUnclaimedFaces}
                          onCheckedChange={setOnlyUnclaimedFaces}
                        />
                        <Label htmlFor="unclaimed">Only unclaimed faces</Label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={performSearch} 
                  disabled={isSearching || (searchType === 'upload' && !selectedFile) || (searchType === 'existing' && !faceId)}
                  className="flex-1"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Faces
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetSearch}>
                  Clear
                </Button>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Face Clusters Preview */}
      {clusters && clusters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Face Clusters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {clusters.slice(0, 10).map((cluster) => (
                <div
                  key={cluster.id}
                  className="p-3 border rounded-md text-center hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    // Could trigger search with cluster representative face
                    if (cluster.representative_face_id) {
                      setSearchType('existing');
                      setFaceId(cluster.representative_face_id);
                    }
                  }}
                >
                  <div className="font-medium text-sm">
                    {cluster.name || `Cluster ${cluster.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cluster.face_count} faces
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Search Results ({searchResults.length})
              </span>
              <Badge variant="secondary">
                Threshold: {similarityThreshold[0]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((result, index) => (
                <Card 
                  key={`${result.face_id}-${index}`}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    onResultSelect ? 'hover:ring-2 hover:ring-primary' : ''
                  }`}
                  onClick={() => onResultSelect?.(result)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant={result.is_claimed ? "default" : "secondary"}>
                          {result.is_claimed ? "Claimed" : "Unclaimed"}
                        </Badge>
                        <div className="text-sm font-mono text-muted-foreground">
                          {(result.similarity * 100).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Page:</span>
                          <span>{result.page_id.slice(0, 8)}...</span>
                        </div>
                        {result.cluster_name && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Cluster:</span>
                            <span>{result.cluster_name}</span>
                          </div>
                        )}
                        {result.confidence_score && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Confidence:</span>
                            <span>{(result.confidence_score * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                      
                      {result.quality_score && (
                        <Progress 
                          value={result.quality_score * 100} 
                          className="h-2"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isSearching && searchResults.length === 0 && (searchType !== 'upload' || selectedFile) && (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-lg font-medium">Ready to Search</div>
            <div className="text-muted-foreground">
              Click "Search Faces" to find similar faces in yearbooks
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};