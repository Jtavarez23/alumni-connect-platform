import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type SchoolHistoryRow = Database['public']['Tables']['school_history']['Row'];
type SchoolRow = Database['public']['Tables']['schools']['Row'];

export interface SchoolHistory extends Omit<SchoolHistoryRow, 'user_id' | 'created_at' | 'updated_at'> {
  school?: Pick<SchoolRow, 'id' | 'name' | 'type' | 'location' | 'verified'>;
}

export const useSchoolHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schoolHistory, setSchoolHistory] = useState<SchoolHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchoolHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_history')
        .select(`
          *,
          school:schools(id, name, type, location, verified)
        `)
        .eq('user_id', user.id)
        .order('start_year', { ascending: false });

      if (error) throw error;
      setSchoolHistory((data || []) as SchoolHistory[]);
    } catch (error: any) {
      toast({
        title: "Error fetching school history",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addSchoolHistory = async (schoolData: Omit<SchoolHistory, 'id' | 'school'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('school_history')
        .insert({
          ...schoolData,
          user_id: user.id
        })
        .select(`
          *,
          school:schools(id, name, type, location, verified)
        `)
        .single();

      if (error) throw error;
      
      setSchoolHistory(prev => [data as SchoolHistory, ...prev]);
      toast({
        title: "School added successfully",
        description: `Added ${data.school?.name} to your education history`
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error adding school",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSchoolHistory = async (id: string, updates: Partial<SchoolHistory>) => {
    try {
      const { data, error } = await supabase
        .from('school_history')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          school:schools(id, name, type, location, verified)
        `)
        .single();

      if (error) throw error;
      
      setSchoolHistory(prev => 
        prev.map(item => item.id === id ? data as SchoolHistory : item)
      );
      
      toast({
        title: "School history updated",
        description: "Your education history has been updated"
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating school history",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteSchoolHistory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('school_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSchoolHistory(prev => prev.filter(item => item.id !== id));
      toast({
        title: "School removed",
        description: "School has been removed from your history"
      });
    } catch (error: any) {
      toast({
        title: "Error removing school",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const getPrimarySchool = () => {
    return schoolHistory.find(sh => sh.is_primary) || schoolHistory[0];
  };

  const getCurrentSchools = () => {
    const currentYear = new Date().getFullYear();
    return schoolHistory.filter(sh => 
      !sh.end_year || sh.end_year >= currentYear
    );
  };

  useEffect(() => {
    fetchSchoolHistory();
  }, [user]);

  return {
    schoolHistory,
    loading,
    addSchoolHistory,
    updateSchoolHistory,
    deleteSchoolHistory,
    getPrimarySchool,
    getCurrentSchools,
    refetch: fetchSchoolHistory
  };
};