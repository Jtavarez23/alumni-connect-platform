import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SchoolClub {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  category: string;
  founded_year?: number;
  advisor_name?: string;
  meeting_schedule?: string;
  contact_info?: string;
  logo_url?: string;
  is_active: boolean;
  member_count: number;
  created_by?: string;
}

export function useSchoolClubs(schoolId: string) {
  const [clubs, setClubs] = useState<SchoolClub[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("school_clubs")
        .select("*")
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      setClubs(data || []);
    } catch (err) {
      console.error("Error fetching clubs:", err);
      toast.error("Failed to load clubs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      fetchClubs();
    }
  }, [schoolId]);

  const createClub = async (clubData: Omit<SchoolClub, 'id' | 'school_id' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from("school_clubs")
        .insert({
          school_id: schoolId,
          ...clubData,
        })
        .select()
        .single();

      if (error) throw error;

      setClubs(prev => [...prev, data]);
      toast.success("Club created successfully");
      return data;
    } catch (err) {
      console.error("Error creating club:", err);
      toast.error("Failed to create club");
      throw err;
    }
  };

  const updateClub = async (clubId: string, updates: Partial<SchoolClub>) => {
    try {
      const { error } = await supabase
        .from("school_clubs")
        .update(updates)
        .eq("id", clubId);

      if (error) throw error;

      setClubs(prev => 
        prev.map(c => c.id === clubId ? { ...c, ...updates } : c)
      );
      toast.success("Club updated successfully");
    } catch (err) {
      console.error("Error updating club:", err);
      toast.error("Failed to update club");
    }
  };

  const deleteClub = async (clubId: string) => {
    try {
      const { error } = await supabase
        .from("school_clubs")
        .delete()
        .eq("id", clubId);

      if (error) throw error;

      setClubs(prev => prev.filter(c => c.id !== clubId));
      toast.success("Club deleted successfully");
    } catch (err) {
      console.error("Error deleting club:", err);
      toast.error("Failed to delete club");
    }
  };

  const getClubsByCategory = (category: string) => {
    return clubs.filter(club => club.category === category && club.is_active);
  };

  const searchClubs = (query: string) => {
    return clubs.filter(club => 
      club.name.toLowerCase().includes(query.toLowerCase()) ||
      club.description?.toLowerCase().includes(query.toLowerCase())
    );
  };

  return {
    clubs,
    loading,
    createClub,
    updateClub,
    deleteClub,
    getClubsByCategory,
    searchClubs,
    refetch: fetchClubs
  };
}