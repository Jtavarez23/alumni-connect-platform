import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload } from "lucide-react";
import SchoolSelector from "./SchoolSelector";
import { useToast } from "@/hooks/use-toast";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const ProfileEditDialog = ({ open, onOpenChange, onComplete }: ProfileEditDialogProps) => {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    bio: profile?.bio || "",
    school_id: profile?.school_id || "",
    graduation_year: profile?.graduation_year || new Date().getFullYear(),
    avatar_url: profile?.avatar_url || ""
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
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
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

          {/* School Selection */}
          <div>
            <Label>School</Label>
            <SchoolSelector
              selectedSchoolId={formData.school_id}
              onSchoolSelect={(schoolId) => setFormData({...formData, school_id: schoolId})}
            />
          </div>
          
          {/* Graduation Year */}
          <div>
            <Label htmlFor="graduation_year">Graduation Year</Label>
            <Input
              id="graduation_year"
              type="number"
              value={formData.graduation_year}
              onChange={(e) => setFormData({...formData, graduation_year: parseInt(e.target.value)})}
              min={1950}
              max={new Date().getFullYear() + 10}
            />
          </div>

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