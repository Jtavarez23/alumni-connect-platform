// Refactored Business Hooks using Generic CRUD Pattern
// This demonstrates how to use the new generic CRUD system

import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGenericCrud, createQueryKeys, supabaseOperations } from './useGenericCrud';
import type {
  Business,
  BusinessFilters,
  CreateBusinessPayload,
  ClaimBusinessPayload,
  BusinessClaim
} from '@/types/business';

// Extended operations specific to business logic
const businessOperations = {
  // Use base Supabase operations
  ...supabaseOperations.createFetcher<Business>('businesses'),

  // Override search to include full-text search on business-specific fields
  async searchItems(query: string): Promise<Business[]> {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        owner:profiles!owner_id (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching businesses:', error);
      throw error;
    }

    return (data || []).map(business => ({
      ...business,
      owner_name: business.owner
        ? `${business.owner.first_name} ${business.owner.last_name}`
        : null,
      owner_avatar: business.owner?.avatar_url,
    }));
  },

  // Enhanced fetch with owner information
  async fetchItem(id: string): Promise<Business> {
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
      .eq('id', id)
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
    };
  },

  // Custom RPC for fetching with filters
  async fetchItems(filters: BusinessFilters = {}, limit: number, offset: number) {
    const { data, error } = await supabase.rpc('get_businesses', {
      p_limit: limit,
      p_offset: offset,
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

    return data;
  },
};

// Business-specific query keys
const businessQueryKeys = createQueryKeys('business');
const extendedQueryKeys = {
  ...businessQueryKeys,
  categories: () => ['business', 'categories'] as const,
  userBusinesses: (userId?: string) => ['business', 'user', userId] as const,
  claims: (businessId?: string) => ['business', 'claims', businessId] as const,
};

// Create the generic CRUD hook instance for businesses
const useBusinessCrud = useGenericCrud<Business, BusinessFilters, CreateBusinessPayload, Partial<Business>>(
  businessOperations,
  {
    entityName: 'Business',
    queryKeys: businessQueryKeys,
    defaultLimit: 20,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }
);

// Export the standardized hooks
export const useBusinesses = useBusinessCrud.useList;
export const useBusiness = useBusinessCrud.useItem;
export const useBusinessSearch = useBusinessCrud.useSearch;
export const useCreateBusiness = useBusinessCrud.useCreate;
export const useUpdateBusiness = useBusinessCrud.useUpdate;
export const useDeleteBusiness = useBusinessCrud.useDelete;

// Custom business-specific hooks that don't fit the generic pattern
export function useBusinessCategories() {
  return useMemo(() =>
    useQuery({
      queryKey: extendedQueryKeys.categories(),
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
    })
  , []);
}

export function useUserBusinesses(userId?: string) {
  return useMemo(() =>
    useQuery({
      queryKey: extendedQueryKeys.userBusinesses(userId),
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
    })
  , [userId]);
}

export function useBusinessClaims(businessId?: string) {
  return useMemo(() =>
    useQuery({
      queryKey: extendedQueryKeys.claims(businessId),
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
    })
  , [businessId]);
}

// Business claiming mutations
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
      queryClient.setQueryData(businessQueryKeys.item(business_id), (old: Business | undefined) => {
        if (!old) return old;
        return {
          ...old,
          has_claimed: true
        };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: extendedQueryKeys.claims(business_id) });
      queryClient.invalidateQueries({ queryKey: extendedQueryKeys.userBusinesses() });

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
      queryClient.invalidateQueries({ queryKey: extendedQueryKeys.claims() });
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.item(updatedClaim.business_id) });
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: extendedQueryKeys.userBusinesses() });

      toast.success(`Claim ${updatedClaim.status} successfully`);
    },
    onError: (error: any) => {
      console.error('Approve claim error:', error);
      toast.error(error.message || 'Failed to update claim');
    },
  });
}

// Export cache utilities for external use
export const businessCache = useBusinessCrud.cache;

// Migration note: This file demonstrates the refactored approach.
// To complete the migration:
// 1. Update imports across the app to use this file instead of useBusiness.ts
// 2. Test all business-related functionality
// 3. Remove the old useBusiness.ts file
// 4. Apply similar patterns to other entity hooks (useEvents, useJobs, etc.)