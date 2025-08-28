import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolHistory } from './useSchoolHistory';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type SchoolRow = Database['public']['Tables']['schools']['Row'];

export interface AccessibleSchool extends SchoolRow {
  access_type: 'current' | 'alumni' | 'partner';
  years_attended?: string;
}

export const useMultiSchoolAccess = () => {
  const { user } = useAuth();
  const { schoolHistory } = useSchoolHistory();
  const { toast } = useToast();
  const [accessibleSchools, setAccessibleSchools] = useState<AccessibleSchool[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAccessibleSchools = async () => {
    if (!user || schoolHistory.length === 0) return;
    
    setLoading(true);
    try {
      // Get user's schools
      const userSchoolIds = schoolHistory.map(sh => sh.school_id);
      
      // Fetch user's schools
      const { data: userSchools, error: userSchoolsError } = await supabase
        .from('schools')
        .select('*')
        .in('id', userSchoolIds);

      if (userSchoolsError) throw userSchoolsError;

      // Get partner schools through partnerships
      const { data: partnerships, error: partnershipsError } = await supabase
        .from('school_partnerships')
        .select(`
          *,
          school_1:schools!school_partnerships_school_1_id_fkey(*),
          school_2:schools!school_partnerships_school_2_id_fkey(*)
        `)
        .or(`school_1_id.in.(${userSchoolIds.join(',')}),school_2_id.in.(${userSchoolIds.join(',')})`)
        .eq('status', 'active');

      if (partnershipsError) throw partnershipsError;

      // Process accessible schools
      const accessible: AccessibleSchool[] = [];

      // Add user's schools
      userSchools?.forEach(school => {
        const history = schoolHistory.find(sh => sh.school_id === school.id);
        const currentYear = new Date().getFullYear();
        const isCurrentStudent = history && (!history.end_year || history.end_year >= currentYear);
        
        accessible.push({
          ...school,
          access_type: isCurrentStudent ? 'current' : 'alumni',
          years_attended: history ? `${history.start_year}-${history.end_year || 'present'}` : undefined
        });
      });

      // Add partner schools
      partnerships?.forEach(partnership => {
        const isSchool1User = userSchoolIds.includes(partnership.school_1_id!);
        const partnerSchool = isSchool1User ? partnership.school_2 : partnership.school_1;
        
        if (partnerSchool && !accessible.find(s => s.id === partnerSchool.id)) {
          accessible.push({
            ...partnerSchool,
            access_type: 'partner'
          });
        }
      });

      setAccessibleSchools(accessible);
    } catch (error: any) {
      toast({
        title: "Error fetching accessible schools",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSchoolsByType = (type: 'current' | 'alumni' | 'partner') => {
    return accessibleSchools.filter(school => school.access_type === type);
  };

  const canAccessSchool = (schoolId: string) => {
    return accessibleSchools.some(school => school.id === schoolId);
  };

  const getAccessType = (schoolId: string) => {
    return accessibleSchools.find(school => school.id === schoolId)?.access_type;
  };

  useEffect(() => {
    fetchAccessibleSchools();
  }, [user, schoolHistory]);

  return {
    accessibleSchools,
    loading,
    getSchoolsByType,
    canAccessSchool,
    getAccessType,
    refetch: fetchAccessibleSchools
  };
};