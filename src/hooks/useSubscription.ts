import { useAuth } from '@/contexts/AuthContext';
import { useSchoolHistory } from './useSchoolHistory';

export const useSubscription = () => {
  const { profile } = useAuth();
  const { schoolHistory } = useSchoolHistory();

  const isFreeTier = profile?.subscription_status === 'free' || !profile?.subscription_status;
  const isPremium = profile?.subscription_status === 'premium';

  const FREE_SCHOOL_LIMIT = 1;

  const canAddSchool = () => {
    if (isPremium) return true;
    return schoolHistory.length < FREE_SCHOOL_LIMIT;
  };

  const getSchoolsRemaining = () => {
    if (isPremium) return Infinity;
    return Math.max(0, FREE_SCHOOL_LIMIT - schoolHistory.length);
  };

  const shouldShowUpgradePrompt = () => {
    return isFreeTier && schoolHistory.length >= FREE_SCHOOL_LIMIT;
  };

  // Networking restrictions for free users
  const getNetworkableSchools = () => {
    if (isPremium) return schoolHistory;
    // Free users can only network within their first (primary) school
    return schoolHistory.slice(0, 1);
  };

  const canNetworkWithUser = (otherUser: any) => {
    if (isPremium) return true;
    
    // Free users can only network with people from same school and overlapping years
    const userSchool = schoolHistory[0]; // Primary school for free users
    if (!userSchool) return false;

    // Check if other user has same school
    const hasSharedSchool = otherUser.school_id === userSchool.school_id ||
      otherUser.school_history?.some((sh: any) => sh.school_id === userSchool.school_id);
    
    if (!hasSharedSchool) return false;

    // Check for overlapping years (same graduation year or within range)
    const userGradYear = userSchool.end_year || new Date().getFullYear();
    const otherGradYear = otherUser.graduation_year;
    
    if (!otherGradYear) return false;
    
    // Allow networking within same graduation year only for free users
    return Math.abs(userGradYear - otherGradYear) <= 0;
  };

  const getYearRangeForNetworking = () => {
    if (isPremium) return null; // No restrictions
    
    const userSchool = schoolHistory[0];
    if (!userSchool) return null;
    
    const gradYear = userSchool.end_year || new Date().getFullYear();
    return { minYear: gradYear, maxYear: gradYear };
  };

  return {
    isFreeTier,
    isPremium,
    canAddSchool,
    getSchoolsRemaining,
    shouldShowUpgradePrompt,
    getNetworkableSchools,
    canNetworkWithUser,
    getYearRangeForNetworking,
    FREE_SCHOOL_LIMIT
  };
};