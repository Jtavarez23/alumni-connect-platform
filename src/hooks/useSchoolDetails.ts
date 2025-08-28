import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SchoolDetails {
  id: string;
  name: string;
  slug: string;
  type: string;
  founding_year?: number;
  banner_image_url?: string;
  description?: string;
  principal_name?: string;
  total_students?: number;
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
  mascot?: string;
  school_colors?: string[];
  website_url?: string;
  phone_number?: string;
}

export function useSchoolDetails(slug: string) {
  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchoolDetails() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("schools")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setSchool({
            id: data.id,
            name: data.name,
            slug: data.slug,
            type: data.type,
            founding_year: data.founding_year,
            banner_image_url: data.banner_image_url,
            description: data.description,
            principal_name: data.principal_name,
            total_students: data.total_students,
            location: typeof data.location === 'object' && data.location !== null ? data.location as any : {},
            mascot: data.mascot,
            school_colors: data.school_colors,
            website_url: data.website_url,
            phone_number: data.phone_number,
          });
        }
      } catch (err) {
        console.error("Error fetching school details:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch school details");
        toast.error("Failed to load school details");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchSchoolDetails();
    }
  }, [slug]);

  const updateSchoolDetails = async (updates: Partial<SchoolDetails>) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update(updates)
        .eq("slug", slug);

      if (error) throw error;

      setSchool(prev => prev ? { ...prev, ...updates } : null);
      toast.success("School details updated successfully");
    } catch (err) {
      console.error("Error updating school:", err);
      toast.error("Failed to update school details");
    }
  };

  return {
    school,
    loading,
    error,
    updateSchoolDetails,
    refetch: () => {
      if (slug) {
        // Re-trigger the effect by updating a dependency
        setError(null);
      }
    }
  };
}