import { useAuth } from '@/contexts/AuthContext';
import { useSchoolHistory } from './useSchoolHistory';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchQuota {
  searches_used: number;
  search_limit: number;
  earned_searches: number;
}

export const useSubscription = () => {
  const { profile, user } = useAuth();
  const { schoolHistory } = useSchoolHistory();
  const [searchQuota, setSearchQuota] = useState<SearchQuota | null>(null);

  // Use new subscription_tier field
  const isFreeTier = profile?.subscription_tier === 'free' || !profile?.subscription_tier;
  const isPremium = profile?.subscription_tier === 'premium';
  const isEnterprise = profile?.subscription_tier === 'enterprise';

  const FREE_SCHOOL_LIMIT = 1;
  const FREE_DAILY_SEARCHES = 3;
  const FREE_MESSAGE_LIMIT = 5; // Pending message requests at once
  const FREE_SUGGESTION_LIMIT = 5; // Per week

  // Fetch current search quota
  useEffect(() => {
    const fetchSearchQuota = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('search_quotas')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching search quota:', error);
        return;
      }
      
      if (data) {
        setSearchQuota({
          searches_used: data.searches_used,
          search_limit: data.search_limit,
          earned_searches: data.earned_searches
        });
      } else {
        // Create initial quota if it doesn't exist
        const initialLimit = isPremium ? 999999 : FREE_DAILY_SEARCHES;
        const { data: newQuota, error: createError } = await supabase
          .from('search_quotas')
          .insert({
            user_id: user.id,
            searches_used: 0,
            search_limit: initialLimit,
            earned_searches: 0
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating search quota:', createError);
        } else {
          setSearchQuota({
            searches_used: 0,
            search_limit: initialLimit,
            earned_searches: 0
          });
        }
      }
    };
    
    fetchSearchQuota();
  }, [user, isPremium]);

  const canAddSchool = () => {
    if (isPremium || isEnterprise) return true;
    return schoolHistory.length < FREE_SCHOOL_LIMIT;
  };

  const getSchoolsRemaining = () => {
    if (isPremium || isEnterprise) return Infinity;
    return Math.max(0, FREE_SCHOOL_LIMIT - schoolHistory.length);
  };

  const shouldShowUpgradePrompt = () => {
    return isFreeTier && schoolHistory.length >= FREE_SCHOOL_LIMIT;
  };

  // Networking restrictions for free users
  // Search quota functions
  const canSearch = () => {
    if (isPremium || isEnterprise) return true;
    if (!searchQuota) return false;
    return (searchQuota.searches_used + searchQuota.earned_searches) < searchQuota.search_limit;
  };
  
  const getSearchesRemaining = () => {
    if (isPremium || isEnterprise) return Infinity;
    if (!searchQuota) return 0;
    return Math.max(0, searchQuota.search_limit - searchQuota.searches_used + searchQuota.earned_searches);
  };
  
  const useSearch = async () => {
    if (!canSearch() || !user) return false;
    
    const { error } = await supabase.rpc('increment_search_usage', {
      p_user_id: user.id
    });
    
    if (!error) {
      setSearchQuota(prev => prev ? {
        ...prev,
        searches_used: prev.searches_used + 1
      } : null);
      return true;
    }
    return false;
  };

  // Messaging restrictions
  const canSendMessage = async (recipientId: string) => {
    if (isPremium || isEnterprise) return true;
    
    const { data } = await supabase.rpc('can_user_message', {
      sender_id: user?.id,
      recipient_id: recipientId
    });
    
    return data;
  };

  const getNetworkableSchools = () => {
    if (isPremium || isEnterprise) return schoolHistory;
    // Free users can only network within their first (primary) school
    return schoolHistory.slice(0, 1);
  };

  const canNetworkWithUser = (otherUser: any) => {
    if (isPremium || isEnterprise) return true;
    
    // Free users can only network with people from same school and overlapping years
    const userSchool = schoolHistory[0]; // Primary school for free users
    if (!userSchool) return false;

    // Check if other user has same school in their education history
    const hasSharedSchool = otherUser.user_education?.some((ue: any) => 
      ue.school_id === userSchool.school_id &&
      ue.start_year <= userSchool.end_year &&
      ue.end_year >= userSchool.start_year
    );
    
    return hasSharedSchool;
  };
  
  // Profile view tracking (premium feature)
  const trackProfileView = async (viewedUserId: string, context: string = 'direct') => {
    if (!isPremium && !isEnterprise) return; // Only track for premium users
    
    await supabase
      .from('profile_views')
      .insert({
        viewer_id: user?.id,
        viewed_id: viewedUserId,
        view_context: context
      });
  };
  
  // Suggestion limits
  const canSuggestClassmate = async () => {
    if (isPremium || isEnterprise) return true;
    
    const { count } = await supabase
      .from('classmate_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('suggester_id', user?.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
    return (count || 0) < FREE_SUGGESTION_LIMIT;
  };

  const getYearRangeForNetworking = () => {
    if (isPremium || isEnterprise) return null; // No restrictions
    
    const userSchool = schoolHistory[0];
    if (!userSchool) return null;
    
    // Free users can see people from their specific years only
    return { 
      minYear: userSchool.start_year, 
      maxYear: userSchool.end_year || new Date().getFullYear()
    };
  };
  
  // Feature access checks
  const hasFeatureAccess = (feature: string) => {
    const premiumFeatures = [
      'unlimited_schools',
      'unlimited_searches', 
      'unlimited_messaging',
      'profile_analytics',
      'all_years_networking',
      'verified_social_links',
      'unlimited_suggestions',
      'export_contacts',
      'event_creation',
      'premium_badge'
    ];
    
    const enterpriseFeatures = [
      ...premiumFeatures,
      'bulk_yearbook_upload',
      'analytics_dashboard',
      'custom_branding',
      'api_access'
    ];
    
    if (isEnterprise) return enterpriseFeatures.includes(feature);
    if (isPremium) return premiumFeatures.includes(feature);
    return false;
  };

  return {
    // Subscription status
    isFreeTier,
    isPremium,
    isEnterprise,
    hasFeatureAccess,
    
    // School limitations
    canAddSchool,
    getSchoolsRemaining,
    shouldShowUpgradePrompt,
    FREE_SCHOOL_LIMIT,
    
    // Search functionality
    canSearch,
    getSearchesRemaining,
    useSearch,
    searchQuota,
    
    // Messaging 
    canSendMessage,
    
    // Networking
    getNetworkableSchools,
    canNetworkWithUser,
    getYearRangeForNetworking,
    
    // Premium features
    trackProfileView,
    
    // Suggestions
    canSuggestClassmate,
    
    // Constants
    FREE_DAILY_SEARCHES,
    FREE_MESSAGE_LIMIT,
    FREE_SUGGESTION_LIMIT
  };
};

// Create the RPC function for incrementing search usage
// This should be added to your Supabase migration
/* 
CREATE OR REPLACE FUNCTION increment_search_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO search_quotas (user_id, date, searches_used, search_limit)
  VALUES (p_user_id, CURRENT_DATE, 1, 3)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    searches_used = search_quotas.searches_used + 1,
    last_search_at = now();
END;
$$;
*/