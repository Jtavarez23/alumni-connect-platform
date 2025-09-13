// Alumni Connect - Yearbook Hooks
// Implements AC-ARCH-004 data fetching hooks for yearbook functionality

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  Yearbook, 
  YearbookPage, 
  Claim, 
  SafetyQueue,
  UUID,
  ApiResponse,
  RpcStartYearbookProcessing,
  RpcSubmitClaim
} from '@/types/alumni-connect';

// Hook to get a single yearbook with pages
export function useYearbook(yearbookId: UUID) {
  return useQuery({
    queryKey: ['yearbook', yearbookId],
    queryFn: async () => {
      const { data: yearbook, error } = await supabase
        .from('yearbooks')
        .select(`
          *,
          school:schools(id, name, location),
          pages:yearbook_pages(
            id,
            page_number,
            tile_manifest,
            image_path,
            ocr_text:page_names_ocr(id, text, bbox),
            faces:page_faces(id, bbox, claimed_by)
          )
        `)
        .eq('id', yearbookId)
        .single();

      if (error) throw error;
      return yearbook as Yearbook & {
        school: any;
        pages: YearbookPage[];
      };
    },
    enabled: !!yearbookId,
  });
}

// Hook to get yearbook pages for a specific yearbook
export function useYearbookPages(yearbookId: UUID) {
  return useQuery({
    queryKey: ['yearbook-pages', yearbookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yearbook_pages')
        .select(`
          *,
          ocr_text:page_names_ocr(id, text, bbox),
          faces:page_faces(id, bbox, claimed_by)
        `)
        .eq('yearbook_id', yearbookId)
        .order('page_number');

      if (error) throw error;
      return data as YearbookPage[];
    },
    enabled: !!yearbookId,
  });
}

// Hook to start yearbook processing
export function useStartYearbookProcessing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (yearbookId: UUID) => {
      const { data, error } = await supabase
        .rpc('start_yearbook_processing', { p_yearbook_id: yearbookId });

      if (error) throw error;
      return data as ApiResponse;
    },
    onSuccess: (data, yearbookId) => {
      if (data.success) {
        // Invalidate yearbook queries to refresh status
        queryClient.invalidateQueries({ queryKey: ['yearbook', yearbookId] });
        queryClient.invalidateQueries({ queryKey: ['safety-queue'] });
      }
    },
  });
}

// Hook to submit a claim
export function useSubmitClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (args: { pageFaceId?: UUID; pageNameId?: UUID }) => {
      const { data, error } = await supabase
        .rpc('submit_claim', {
          p_page_face_id: args.pageFaceId,
          p_page_name_id: args.pageNameId,
        });

      if (error) throw error;
      return data as ApiResponse<Claim>;
    },
    onSuccess: () => {
      // Invalidate claims and notifications
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook to get user's claims
export function useUserClaims(userId?: UUID) {
  return useQuery({
    queryKey: ['claims', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          face:page_faces(
            id,
            bbox,
            page:yearbook_pages(
              id,
              page_number,
              yearbook:yearbooks(id, title, school:schools(name))
            )
          ),
          name:page_names_ocr(
            id,
            text,
            page:yearbook_pages(
              id,
              page_number,
              yearbook:yearbooks(id, title, school:schools(name))
            )
          )
        `)
        .eq('user_id', userId || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Claim[];
    },
    enabled: !!userId,
  });
}

// Hook to get pending claims (for moderators)
export function usePendingClaims() {
  return useQuery({
    queryKey: ['claims', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          user:profiles!user_id(id, first_name, last_name, avatar_url),
          face:page_faces(
            id,
            bbox,
            page:yearbook_pages(
              id,
              page_number,
              yearbook:yearbooks(id, title, school:schools(name))
            )
          ),
          name:page_names_ocr(
            id,
            text,
            page:yearbook_pages(
              id,
              page_number,
              yearbook:yearbooks(id, title, school:schools(name))
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Claim[];
    },
  });
}

// Hook to approve a claim (moderators only)
export function useApproveClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (claimId: UUID) => {
      const { data, error } = await supabase
        .rpc('approve_claim', { p_claim_id: claimId });

      if (error) throw error;
      return data as ApiResponse<{ status: 'approved' }>;
    },
    onSuccess: () => {
      // Invalidate all claims queries
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook to reject a claim (moderators only)
export function useRejectClaim() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ claimId, reason }: { claimId: UUID; reason?: string }) => {
      const { data, error } = await supabase
        .rpc('reject_claim', { 
          p_claim_id: claimId,
          p_reason: reason 
        });

      if (error) throw error;
      return data as ApiResponse<{ status: 'rejected' }>;
    },
    onSuccess: () => {
      // Invalidate all claims queries
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook to upload yearbook
export function useUploadYearbook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      file,
      schoolId,
      classYearId,
      title
    }: {
      file: File;
      schoolId: UUID;
      classYearId?: UUID;
      title?: string;
    }) => {
      // First upload the file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('yearbooks-originals')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Then create yearbook record
      const { data: yearbook, error: yearbookError } = await supabase
        .from('yearbooks')
        .insert({
          school_id: schoolId,
          class_year_id: classYearId,
          title,
          storage_path: uploadData.path,
          visibility: 'alumni_only', // Auto-set per master docs
          status: 'pending',
        })
        .select()
        .single();

      if (yearbookError) throw yearbookError;

      // Start processing
      const { error: processError } = await supabase
        .rpc('start_yearbook_processing', { p_yearbook_id: yearbook.id });

      if (processError) throw processError;

      return yearbook as Yearbook;
    },
    onSuccess: () => {
      // Invalidate yearbooks queries
      queryClient.invalidateQueries({ queryKey: ['yearbooks'] });
    },
  });
}

// Hook to get safety queue (for moderators)
export function useSafetyQueue() {
  return useQuery({
    queryKey: ['safety-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_queue')
        .select(`
          *,
          yearbook:yearbooks(
            id,
            title,
            school:schools(name),
            uploader:profiles!uploaded_by(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SafetyQueue[];
    },
  });
}

// Hook to update safety queue status (for moderators)
export function useUpdateSafetyStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      safetyId,
      status,
      findings
    }: {
      safetyId: UUID;
      status: 'clean' | 'flagged' | 'quarantined';
      findings?: any;
    }) => {
      const { data, error } = await supabase
        .from('safety_queue')
        .update({
          status,
          findings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', safetyId)
        .select()
        .single();

      if (error) throw error;

      // Also update the yearbook status
      const { error: yearbookError } = await supabase
        .from('yearbooks')
        .update({ status })
        .eq('id', data.yearbook_id);

      if (yearbookError) throw yearbookError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-queue'] });
      queryClient.invalidateQueries({ queryKey: ['yearbooks'] });
    },
  });
}