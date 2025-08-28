import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AlumniActivity {
  id: string;
  type: 'new_connection' | 'profile_update' | 'school_join';
  userId: string;
  userName: string;
  userAvatar?: string;
  schoolId?: string;
  schoolName?: string;
  timestamp: string;
  message: string;
}

export const useAlumniActivity = (schoolId?: string) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<AlumniActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentActivity = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get recent friendship acceptances
      const { data: recentFriendships } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          updated_at,
          requester:profiles!friendships_requester_id_fkey(id, first_name, last_name, avatar_url, school_id),
          addressee:profiles!friendships_addressee_id_fkey(id, first_name, last_name, avatar_url, school_id)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(20);

      // Get school information for filtering
      const { data: schools } = await supabase
        .from('schools')
        .select('id, name');

      const schoolsMap = new Map(schools?.map(s => [s.id, s.name]) || []);

      const activityList: AlumniActivity[] = [];

      recentFriendships?.forEach(friendship => {
        // Determine the other person in the friendship
        const otherPerson = friendship.requester?.id === user.id 
          ? friendship.addressee 
          : friendship.requester;

        if (!otherPerson) return;

        // Filter by school if specified
        if (schoolId && otherPerson.school_id !== schoolId) return;

        const schoolName = otherPerson.school_id 
          ? schoolsMap.get(otherPerson.school_id) 
          : undefined;

        activityList.push({
          id: friendship.id,
          type: 'new_connection',
          userId: otherPerson.id,
          userName: `${otherPerson.first_name} ${otherPerson.last_name}`.trim(),
          userAvatar: otherPerson.avatar_url || undefined,
          schoolId: otherPerson.school_id || undefined,
          schoolName,
          timestamp: friendship.updated_at,
          message: `Connected with ${otherPerson.first_name} ${otherPerson.last_name}${schoolName ? ` from ${schoolName}` : ''}`
        });
      });

      // Sort by timestamp (most recent first)
      activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(activityList);
    } catch (error) {
      console.error('Error fetching alumni activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityCount = (timeframe: '24h' | '7d' | '30d'): number => {
    const cutoffTime = new Date();
    
    switch (timeframe) {
      case '24h':
        cutoffTime.setHours(cutoffTime.getHours() - 24);
        break;
      case '7d':
        cutoffTime.setDate(cutoffTime.getDate() - 7);
        break;
      case '30d':
        cutoffTime.setDate(cutoffTime.getDate() - 30);
        break;
    }

    return activities.filter(activity => 
      new Date(activity.timestamp) >= cutoffTime
    ).length;
  };

  // Real-time subscription for new activities
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('alumni-activity-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships',
          filter: `status=eq.accepted`
        },
        () => {
          fetchRecentActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, schoolId]);

  useEffect(() => {
    fetchRecentActivity();
  }, [user, schoolId]);

  return {
    activities,
    loading,
    getActivityCount,
    refetch: fetchRecentActivity
  };
};