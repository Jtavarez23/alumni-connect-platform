import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPresence {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  online_at: string;
  status?: 'online' | 'away' | 'busy';
  current_page?: string;
}

export function usePresence(channelName: string = 'main') {
  const { user } = useAuth();
  const [presences, setPresences] = useState<Record<string, UserPresence[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(channelName);

    // Track current user presence
    const trackPresence = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        const userStatus: UserPresence = {
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          online_at: new Date().toISOString(),
          status: 'online',
          current_page: window.location.pathname
        };

        await channel.track(userStatus);
      }
    };

    // Subscribe to presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState() as Record<string, UserPresence[]>;
        setPresences(newState);
        setLoading(false);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // User joined
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // User left
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence();
        }
      });

    // Update presence when page changes
    const handlePageChange = () => {
      trackPresence();
    };

    window.addEventListener('beforeunload', handlePageChange);

    return () => {
      window.removeEventListener('beforeunload', handlePageChange);
      supabase.removeChannel(channel);
    };
  }, [user?.id, channelName]);

  const getOnlineUsers = (): UserPresence[] => {
    return Object.values(presences).flat().filter(p => p.user_id !== user?.id);
  };

  const getUsersOnPage = (page: string): UserPresence[] => {
    return getOnlineUsers().filter(p => p.current_page === page);
  };

  const isUserOnline = (userId: string): boolean => {
    return getOnlineUsers().some(p => p.user_id === userId);
  };

  return {
    presences,
    onlineUsers: getOnlineUsers(),
    getUsersOnPage,
    isUserOnline,
    loading
  };
}