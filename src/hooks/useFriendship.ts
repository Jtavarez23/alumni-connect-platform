import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFriendship = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !targetUserId || user.id === targetUserId) {
      setIsConnected(user?.id === targetUserId);
      setLoading(false);
      return;
    }

    const checkFriendship = async () => {
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('status')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .or(`requester_id.eq.${targetUserId},addressee_id.eq.${targetUserId}`)
          .eq('status', 'accepted')
          .limit(1);

        if (error) throw error;
        setIsConnected(data && data.length > 0);
      } catch (error) {
        console.error('Error checking friendship:', error);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    checkFriendship();
  }, [user?.id, targetUserId]);

  return { isConnected, loading };
};