import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SchoolPhoto {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  photo_url: string;
  category: string;
  uploaded_by?: string;
  upload_date: string;
  academic_year?: string;
  is_featured: boolean;
}

export function useSchoolPhotos(schoolId: string) {
  const [photos, setPhotos] = useState<SchoolPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("school_photos")
        .select("*")
        .eq("school_id", schoolId)
        .order("upload_date", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error("Error fetching photos:", err);
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      fetchPhotos();
    }
  }, [schoolId]);

  const uploadPhoto = async (
    file: File,
    metadata: {
      title: string;
      description?: string;
      category: string;
      academic_year?: string;
    }
  ) => {
    try {
      setUploading(true);
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${schoolId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("school-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("school-photos")
        .getPublicUrl(filePath);

      // Insert photo record
      const { data, error } = await supabase
        .from("school_photos")
        .insert({
          school_id: schoolId,
          photo_url: publicUrl,
          ...metadata,
        })
        .select()
        .single();

      if (error) throw error;

      setPhotos(prev => [data, ...prev]);
      toast.success("Photo uploaded successfully");
      return data;
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo");
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from("school_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success("Photo deleted successfully");
    } catch (err) {
      console.error("Error deleting photo:", err);
      toast.error("Failed to delete photo");
    }
  };

  const updatePhoto = async (photoId: string, updates: Partial<SchoolPhoto>) => {
    try {
      const { error } = await supabase
        .from("school_photos")
        .update(updates)
        .eq("id", photoId);

      if (error) throw error;

      setPhotos(prev => 
        prev.map(p => p.id === photoId ? { ...p, ...updates } : p)
      );
      toast.success("Photo updated successfully");
    } catch (err) {
      console.error("Error updating photo:", err);
      toast.error("Failed to update photo");
    }
  };

  return {
    photos,
    loading,
    uploading,
    uploadPhoto,
    deletePhoto,
    updatePhoto,
    refetch: fetchPhotos
  };
}