// Business Directory Hooks
// React Query hooks for Business CRUD and management

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Business, 
  BusinessFilters, 
  BusinessesResponse,
  CreateBusinessPayload,
  BusinessClaim,
  ClaimBusinessPayload
} from '@/types/business';

// =============================================
// QUERY HOOKS
// =============================================

export function useBusinesses(filters: BusinessFilters = {}, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['businesses', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_businesses', {
        p_limit: limit,
        p_offset: pageParam * limit,
        p_category: filters.category,
        p_location: filters.location,
        p_search: filters.search,
        p_verified_only: filters.verified_only || false,
        p_with_perks: filters.with_perks || false
      });

      if (error) {
        console.error('Error fetching businesses:', error);
        throw error;
      }

      return data as BusinessesResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.has_more ? allPages.length : undefined;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBusiness(businessId: string) {
  return useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          owner:profiles!owner_id (
            first_name,
            last_name,
            avatar_url
          ),
          claims:business_claims!business_id (
            id,
            status,
            user_id
          )
        `)
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('Error fetching business:', error);
        throw error;
      }

      // Check if current user owns or has claimed this business
      const currentUser = (await supabase.auth.getUser()).data.user;
      const isOwner = currentUser && data.owner_id === currentUser.id;
      const userClaim = currentUser ? 
        data.claims?.find((claim: any) => claim.user_id === currentUser.id) : 
        null;

      return {
        ...data,
        owner_name: data.owner ? `${data.owner.first_name} ${data.owner.last_name}` : null,
        owner_avatar: data.owner?.avatar_url,
        is_owner: isOwner,
        has_claimed: !!userClaim
      } as Business;
    },
    enabled: !!businessId,
  });
}

export function useUserBusinesses(userId?: string) {
  return useQuery({
    queryKey: ['user-businesses', userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      // Get businesses owned by user
      const { data: ownedBusinesses, error: ownedError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', targetUserId)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Get businesses user has claimed
      const { data: claimedBusinesses, error: claimedError } = await supabase
        .from('business_claims')
        .select(`
          *,
          business:businesses (*)
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'approved');

      if (claimedError) throw claimedError;

      return {
        owned: ownedBusinesses || [],
        claimed: claimedBusinesses?.map(claim => claim.business).filter(Boolean) || []
      };
    },
    enabled: true,
  });
}

export function useBusinessClaims(businessId?: string) {
  return useQuery({
    queryKey: ['business-claims', businessId],
    queryFn: async () => {
      const query = supabase
        .from('business_claims')
        .select(`
          *,
          user:profiles!user_id (
            first_name,
            last_name,
            avatar_url
          ),
          business:businesses!business_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (businessId) {
        query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching business claims:', error);
        throw error;
      }

      return data as BusinessClaim[];
    },
    enabled: !!businessId,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessData: CreateBusinessPayload) => {
      const { data, error } = await supabase.rpc('create_business', {
        p_name: businessData.name,
        p_description: businessData.description,
        p_category: businessData.category,
        p_website: businessData.website,
        p_location: businessData.location,
        p_perk: businessData.perk,
        p_perk_url: businessData.perk_url
      });

      if (error) {
        console.error('Error creating business:', error);
        throw error;
      }

      return data as Business;
    },
    onSuccess: (newBusiness) => {
      // Invalidate and refetch businesses
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      
      // Add to cache
      queryClient.setQueryData(['business', newBusiness.id], newBusiness);
      
      toast.success('Business listing created successfully!');
    },
    onError: (error: any) => {
      console.error('Create business error:', error);
      toast.error(error.message || 'Failed to create business listing');
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, updates }: { businessId: string; updates: Partial<Business> }) => {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Error updating business:', error);
        throw error;
      }

      return data as Business;
    },
    onSuccess: (updatedBusiness) => {
      // Update cache
      queryClient.setQueryData(['business', updatedBusiness.id], updatedBusiness);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      
      toast.success('Business updated successfully!');
    },
    onError: (error: any) => {
      console.error('Update business error:', error);
      toast.error(error.message || 'Failed to update business');
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);

      if (error) {
        console.error('Error deleting business:', error);
        throw error;
      }

      return businessId;
    },
    onSuccess: (businessId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['business', businessId] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      
      toast.success('Business deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete business error:', error);
      toast.error(error.message || 'Failed to delete business');
    },
  });
}

export function useClaimBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimData: ClaimBusinessPayload) => {
      const { data, error } = await supabase.rpc('claim_business', {
        p_business_id: claimData.business_id,
        p_evidence_type: claimData.evidence_type,
        p_evidence_data: claimData.evidence_data ? JSON.stringify(claimData.evidence_data) : '{}'
      });

      if (error) {
        console.error('Error claiming business:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (result, { business_id }) => {
      // Update business cache to show claim pending
      queryClient.setQueryData(['business', business_id], (old: Business | undefined) => {
        if (!old) return old;
        return {
          ...old,
          has_claimed: true
        };
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['business-claims', business_id] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      
      toast.success('Business claim submitted for review!');
    },
    onError: (error: any) => {
      console.error('Claim business error:', error);
      toast.error(error.message || 'Failed to submit business claim');
    },
  });
}

export function useApproveClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ claimId, approve, notes }: { claimId: string; approve: boolean; notes?: string }) => {
      const { data, error } = await supabase
        .from('business_claims')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', claimId)
        .select()
        .single();

      if (error) {
        console.error('Error updating claim:', error);
        throw error;
      }

      // If approved, update business ownership
      if (approve) {
        const { error: businessError } = await supabase
          .from('businesses')
          .update({ owner_id: data.user_id })
          .eq('id', data.business_id);

        if (businessError) {
          console.error('Error updating business ownership:', businessError);
          throw businessError;
        }
      }

      return data;
    },
    onSuccess: (updatedClaim) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['business-claims'] });
      queryClient.invalidateQueries({ queryKey: ['business', updatedClaim.business_id] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      
      toast.success(`Claim ${updatedClaim.status} successfully`);
    },
    onError: (error: any) => {
      console.error('Approve claim error:', error);
      toast.error(error.message || 'Failed to update claim');
    },
  });
}

// =============================================
// UTILITY HOOKS
// =============================================

export function useBusinessSearch(query: string) {
  return useQuery({
    queryKey: ['businesses-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .textSearch('search', query)
        .limit(10);

      if (error) {
        console.error('Error searching businesses:', error);
        throw error;
      }

      return data as Business[];
    },
    enabled: query.length > 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useBusinessCategories() {
  return useQuery({
    queryKey: ['business-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('category')
        .not('category', 'is', null)
        .order('category');

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      // Get unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category))].filter(Boolean);
      return uniqueCategories;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}