// Alumni Connect - Face Recognition Hooks
// Implements AI-powered face search and recognition functionality

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  UUID,
  ApiResponse
} from '@/types/alumni-connect';

// Types for face recognition
export interface FaceSearchResult {
  face_id: UUID;
  page_id: UUID;
  yearbook_id: UUID;
  similarity: number;
  confidence_score?: number;
  quality_score?: number;
  bbox: number[];
  cluster_id?: UUID;
  cluster_name?: string;
  is_claimed: boolean;
}

export interface FaceCluster {
  id: UUID;
  name?: string;
  confidence_score?: number;
  face_count: number;
  representative_face_id?: UUID;
  created_at: string;
  updated_at: string;
}

export interface FaceModel {
  id: UUID;
  name: string;
  version: string;
  embedding_size: number;
  provider: string;
  model_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaceMatch {
  id: UUID;
  face_a_id: UUID;
  face_b_id: UUID;
  similarity_score: number;
  model_id?: UUID;
  is_verified: boolean;
  verified_by?: UUID;
  verified_at?: string;
  created_at: string;
}

// Hook to upload an image and perform face search
export function useFaceImageSearch() {
  return useMutation({
    mutationFn: async ({ 
      imageFile, 
      similarityThreshold = 0.75,
      maxResults = 20 
    }: {
      imageFile: File;
      similarityThreshold?: number;
      maxResults?: number;
    }) => {
      // First, upload image to temporary storage
      const fileName = `face-search/${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-uploads')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Call face detection and embedding generation API
      const { data, error } = await supabase
        .rpc('generate_face_embedding_from_image', {
          p_image_path: uploadData.path,
          p_similarity_threshold: similarityThreshold,
          p_max_results: maxResults
        });

      if (error) throw error;

      // Clean up temp file
      await supabase.storage
        .from('temp-uploads')
        .remove([fileName]);

      return data as FaceSearchResult[];
    },
  });
}

// Hook to search for similar faces using an existing face ID
export function useFaceSimilaritySearch() {
  return useMutation({
    mutationFn: async ({ 
      faceId, 
      similarityThreshold = 0.75,
      maxResults = 20 
    }: {
      faceId: UUID;
      similarityThreshold?: number;
      maxResults?: number;
    }) => {
      const { data, error } = await supabase
        .rpc('advanced_face_search', {
          query_face_id: faceId,
          similarity_threshold: similarityThreshold,
          max_results: maxResults
        });

      if (error) throw error;
      return data as FaceSearchResult[];
    },
  });
}

// Hook to search using user's profile photo
export function useProfilePhotoFaceSearch() {
  return useMutation({
    mutationFn: async ({ 
      userId, 
      similarityThreshold = 0.75,
      maxResults = 20 
    }: {
      userId: UUID;
      similarityThreshold?: number;
      maxResults?: number;
    }) => {
      const { data, error } = await supabase
        .rpc('advanced_face_search', {
          user_id: userId,
          similarity_threshold: similarityThreshold,
          max_results: maxResults
        });

      if (error) throw error;
      return data as FaceSearchResult[];
    },
  });
}

// Hook to get face embedding statistics
export function useFaceEmbeddingStats() {
  return useQuery({
    queryKey: ['face-embedding-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_face_embedding_stats');

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// Hook to get all face models
export function useFaceModels() {
  return useQuery({
    queryKey: ['face-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('face_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FaceModel[];
    },
  });
}

// Hook to get face clusters
export function useFaceClusters(limit = 50) {
  return useQuery({
    queryKey: ['face-clusters', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('face_clusters')
        .select('*')
        .order('face_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as FaceCluster[];
    },
  });
}

// Hook to get face cluster details with faces
export function useFaceClusterDetails(clusterId: UUID) {
  return useQuery({
    queryKey: ['face-cluster', clusterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('face_clusters')
        .select(`
          *,
          faces:page_faces(
            id,
            bbox,
            confidence_score,
            face_quality_score,
            claimed_by,
            page:yearbook_pages(
              id,
              page_number,
              yearbook:yearbooks(id, title, school:schools(name))
            )
          )
        `)
        .eq('id', clusterId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clusterId,
  });
}

// Hook to update face clusters
export function useUpdateFaceClusters() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      similarityThreshold = 0.85,
      minClusterSize = 2 
    }: {
      similarityThreshold?: number;
      minClusterSize?: number;
    }) => {
      const { data, error } = await supabase
        .rpc('update_face_clusters', {
          similarity_threshold: similarityThreshold,
          min_cluster_size: minClusterSize
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['face-embedding-stats'] });
    },
  });
}

// Hook to compute face similarities in batches
export function useComputeFaceSimilarities() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      batchSize = 1000,
      similarityThreshold = 0.7 
    }: {
      batchSize?: number;
      similarityThreshold?: number;
    }) => {
      const { data, error } = await supabase
        .rpc('batch_compute_face_similarities', {
          batch_size: batchSize,
          similarity_threshold: similarityThreshold
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-matches'] });
      queryClient.invalidateQueries({ queryKey: ['face-embedding-stats'] });
    },
  });
}

// Hook to get face matches for a specific face
export function useFaceMatches(faceId?: UUID) {
  return useQuery({
    queryKey: ['face-matches', faceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('face_matches')
        .select(`
          *,
          face_a:page_faces!face_a_id(
            id,
            bbox,
            page:yearbook_pages(
              id,
              page_number,
              yearbook:yearbooks(id, title, school:schools(name))
            )
          ),
          face_b:page_faces!face_b_id(
            id,
            bbox,
            page:yearbook_pages(
              id,
              page_number,
              yearbook:yearbooks(id, title, school:schools(name))
            )
          )
        `)
        .or(`face_a_id.eq.${faceId},face_b_id.eq.${faceId}`)
        .order('similarity_score', { ascending: false });

      if (error) throw error;
      return data as FaceMatch[];
    },
    enabled: !!faceId,
  });
}

// Hook to verify a face match
export function useVerifyFaceMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      matchId, 
      isVerified 
    }: {
      matchId: UUID;
      isVerified: boolean;
    }) => {
      const { data, error } = await supabase
        .from('face_matches')
        .update({
          is_verified: isVerified,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: isVerified ? new Date().toISOString() : null,
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['face-matches'] });
      if (data.face_a_id) {
        queryClient.invalidateQueries({ queryKey: ['face-matches', data.face_a_id] });
      }
      if (data.face_b_id) {
        queryClient.invalidateQueries({ queryKey: ['face-matches', data.face_b_id] });
      }
    },
  });
}

// Hook to get user's face search history
export function useFaceSearchHistory(userId?: UUID) {
  return useQuery({
    queryKey: ['face-search-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('face_search_history')
        .select('*')
        .eq('user_id', userId || '')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Hook to record face search
export function useRecordFaceSearch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      userId,
      queryType,
      queryMetadata,
      resultsCount,
      searchDurationMs
    }: {
      userId: UUID;
      queryType: 'upload' | 'existing_face' | 'user_photo';
      queryMetadata: any;
      resultsCount: number;
      searchDurationMs: number;
    }) => {
      const { data, error } = await supabase
        .from('face_search_history')
        .insert({
          user_id: userId,
          query_type: queryType,
          query_metadata: queryMetadata,
          results_count: resultsCount,
          search_duration_ms: searchDurationMs,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['face-search-history', variables.userId] 
      });
    },
  });
}

// Hook to get faces from a specific page
export function usePageFaces(pageId?: UUID) {
  return useQuery({
    queryKey: ['page-faces', pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_faces')
        .select(`
          *,
          cluster:face_clusters(id, name, face_count),
          matches:face_matches!face_a_id(similarity_score),
          page:yearbook_pages(
            id,
            page_number,
            yearbook:yearbooks(id, title, school:schools(name))
          )
        `)
        .eq('page_id', pageId || '')
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!pageId,
  });
}

// Hook to update face embedding
export function useUpdateFaceEmbedding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      faceId, 
      embedding,
      modelId,
      confidenceScore,
      qualityScore 
    }: {
      faceId: UUID;
      embedding: number[];
      modelId?: UUID;
      confidenceScore?: number;
      qualityScore?: number;
    }) => {
      const { data, error } = await supabase
        .from('page_faces')
        .update({
          embedding: `[${embedding.join(',')}]`,
          model_id: modelId,
          confidence_score: confidenceScore,
          face_quality_score: qualityScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', faceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['page-faces', data.page_id] });
      queryClient.invalidateQueries({ queryKey: ['face-embedding-stats'] });
    },
  });
}