import { useAuth } from '@/contexts/AuthContext';
import { useSchoolHistory } from './useSchoolHistory';

export const useSubscription = () => {
  const { profile } = useAuth();
  const { schoolHistory } = useSchoolHistory();

  const isFreeTier = profile?.subscription_status === 'free' || !profile?.subscription_status;
  const isPremium = profile?.subscription_status === 'premium';

  const FREE_SCHOOL_LIMIT = 2;

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

  return {
    isFreeTier,
    isPremium,
    canAddSchool,
    getSchoolsRemaining,
    shouldShowUpgradePrompt,
    FREE_SCHOOL_LIMIT
  };
};