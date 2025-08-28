import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AvatarUpload from "@/components/ui/avatar-upload";
import MultiSchoolSelector from "./MultiSchoolSelector";
import { useToast } from "@/hooks/use-toast";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const ProfileEditDialog = ({ open, onOpenChange, onComplete }: ProfileEditDialogProps) => {
  const { profile, updateProfile, uploadAvatar } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
    instagram_url: profile?.instagram_url || "",
    facebook_url: profile?.facebook_url || "",
    linkedin_url: profile?.linkedin_url || ""
  });

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name) {
      toast({
        title: "Please fill in required fields",
        description: "First and last name are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await updateProfile(formData);
      toast({
        title: "Profile updated successfully!",
        description: "Your changes have been saved.",
      });
      onComplete();
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const avatarUrl = await uploadAvatar(file);
      setFormData({...formData, avatar_url: avatarUrl});
    } catch (error) {
      // Error is already handled in uploadAvatar
    }
  };

  const getInitials = () => {
    return `${formData.first_name?.[0] || ""}${formData.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="flex justify-center">
            <AvatarUpload
              currentImageUrl={formData.avatar_url}
              fallbackText={getInitials()}
              onImageUploaded={handleAvatarUpload}
              size="md"
            />
          </div>
          
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                placeholder="Enter your last name"
              />
            </div>
          </div>
          
          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Tell us a bit about yourself..."
              rows={3}
            />
          </div>

          {/* Social Media Links */}
          <div>
            <Label className="text-base font-semibold">Social Media</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Your social media links will only be visible to people in your network
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({...formData, instagram_url: e.target.value})}
                  placeholder="https://instagram.com/username"
                  type="url"
                />
              </div>
              <div>
                <Label htmlFor="facebook_url">Facebook</Label>
                <Input
                  id="facebook_url"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData({...formData, facebook_url: e.target.value})}
                  placeholder="https://facebook.com/username"
                  type="url"
                />
              </div>
              <div>
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                  placeholder="https://linkedin.com/in/username"
                  type="url"
                />
              </div>
            </div>
          </div>

          {/* Multi-School Education History */}
          <MultiSchoolSelector onSchoolHistoryChange={onComplete} />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;