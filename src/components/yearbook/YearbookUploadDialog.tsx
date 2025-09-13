import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { formatSchoolType } from "@/lib/utils/schoolUtils";

interface YearbookUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface School {
  id: string;
  name: string;
  type: string;
}

export function YearbookUploadDialog({ open, onClose, onSuccess }: YearbookUploadDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    year: new Date().getFullYear(),
    school_id: "",
    description: "",
    cover_image: null as File | null,
  });

  const fetchSchools = async () => {
    setSchoolsLoading(true);
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, type")
        .eq("submission_status", "approved")
        .order("name");

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast.error("Failed to load schools");
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to upload yearbooks");
      return;
    }

    if (!formData.school_id || !formData.year) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      let cover_image_url = null;

      // Upload cover image if provided
      if (formData.cover_image) {
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(formData.cover_image.type)) {
          throw new Error('Please upload a valid image file (JPEG, PNG, or WebP)');
        }
        
        // Validate file size (5MB limit)
        if (formData.cover_image.size > 5 * 1024 * 1024) {
          throw new Error('Image file must be less than 5MB');
        }
        
        const fileExt = formData.cover_image.name.split('.').pop();
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('yearbook-covers')
          .upload(fileName, formData.cover_image, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        
        const { data: { publicUrl } } = supabase.storage
          .from('yearbook-covers')
          .getPublicUrl(fileName);
        
        cover_image_url = publicUrl;
      }

      // Create yearbook
      const { error } = await supabase
        .from("yearbooks")
        .insert({
          title: formData.title,
          year: formData.year,
          school_id: formData.school_id,
          cover_image_url,
          upload_status: "completed",
          page_count: 0,
          uploaded_by: user.id
        });

      if (error) {
        console.error('Yearbook insert error:', error);
        if (error.code === '23505') { // Unique violation
          throw new Error(`A yearbook for this school and year (${formData.year}) already exists. Please choose a different year or contact support if you need to replace it.`);
        }
        throw error;
      }

      toast.success("Yearbook uploaded successfully!");
      onSuccess();
      setFormData({
        title: "",
        year: new Date().getFullYear(),
        school_id: "",
        description: "",
        cover_image: null,
      });
    } catch (error: any) {
      console.error("Error uploading yearbook:", error);
      const errorMessage = error.message || "Failed to upload yearbook";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Yearbook
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Class of 2024 Yearbook"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="year">Graduation Year *</Label>
            <Input
              id="year"
              type="number"
              min="1900"
              max="2030"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label htmlFor="school">School *</Label>
            <Select
              value={formData.school_id}
              onValueChange={(value) => setFormData({ ...formData, school_id: value })}
              onOpenChange={(isOpen) => {
                if (isOpen && schools.length === 0) {
                  fetchSchools();
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a school" />
              </SelectTrigger>
              <SelectContent>
                {schoolsLoading && (
                  <SelectItem value="loading" disabled>
                    Loading schools...
                  </SelectItem>
                )}
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name} ({formatSchoolType(school.type)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="cover">Cover Image</Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFormData({ ...formData, cover_image: file });
              }}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description or notes about this yearbook"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}