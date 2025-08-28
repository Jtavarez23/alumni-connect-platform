import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SchoolAlumniStats {
  schoolId: string;
  schoolName: string;
  currentAlumniCount: number;
  recentConnections24h: number;
  recentConnections7d: number;
  recentConnections30d: number;
  totalNetworkSize: number;
  growthPercentage: number;
}

export const useSchoolAlumniStats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<SchoolAlumniStats[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlumniStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's schools
      const { data: schoolHistory } = await supabase
        .from('school_history')
        .select('school_id, school:schools(id, name)')
        .eq('user_id', user.id);

      if (!schoolHistory) {
        setStats([]);
        return;
      }

      const schoolStats = await Promise.all(
        schoolHistory.map(async (sh) => {
          const schoolId = sh.school_id;
          const schoolName = sh.school?.name || 'Unknown School';

          // Get current alumni count (accepted friendships from this school)
          const { data: schoolProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('school_id', schoolId);

          const schoolProfileIds = schoolProfiles?.map(p => p.id) || [];
          
          const { count: currentAlumniCount } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .in('addressee_id', schoolProfileIds);

          // Get recent connections (last 24 hours)
          const { count: recent24h } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          // Get recent connections (last 7 days)
          const { count: recent7d } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          // Get recent connections (last 30 days)
          const { count: recent30d } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          // Calculate growth percentage (comparing last 30 days vs previous 30 days)
          const { count: previous30d } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .gte('updated_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
            .lt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          const growthPercentage = previous30d > 0 
            ? ((recent30d - previous30d) / previous30d) * 100 
            : recent30d > 0 ? 100 : 0;

          return {
            schoolId,
            schoolName,
            currentAlumniCount: currentAlumniCount || 0,
            recentConnections24h: recent24h || 0,
            recentConnections7d: recent7d || 0,
            recentConnections30d: recent30d || 0,
            totalNetworkSize: currentAlumniCount || 0,
            growthPercentage: Math.round(growthPercentage)
          };
        })
      );

      setStats(schoolStats);
    } catch (error: any) {
      toast({
        title: "Error fetching alumni statistics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatsForSchool = (schoolId: string): SchoolAlumniStats | undefined => {
    return stats.find(s => s.schoolId === schoolId);
  };

  const getTotalNetworkSize = (): number => {
    return stats.reduce((total, school) => total + school.totalNetworkSize, 0);
  };

  const getRecentActivityAcrossSchools = (timeframe: '24h' | '7d' | '30d'): number => {
    const key = `recentConnections${timeframe}` as keyof SchoolAlumniStats;
    return stats.reduce((total, school) => total + (school[key] as number), 0);
  };

  // Set up real-time subscription for friendship changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('alumni-stats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          // Refetch stats when friendships change
          fetchAlumniStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    fetchAlumniStats();
  }, [user]);

  return {
    stats,
    loading,
    getStatsForSchool,
    getTotalNetworkSize,
    getRecentActivityAcrossSchools,
    refetch: fetchAlumniStats
  };
};