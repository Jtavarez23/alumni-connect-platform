import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AvatarUpload from "@/components/ui/avatar-upload";
import { Search } from "lucide-react";
import SchoolSelector from "./SchoolSelector";
import { useToast } from "@/hooks/use-toast";

interface ProfileSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const ProfileSetupDialog = ({ open, onOpenChange, onComplete }: ProfileSetupDialogProps) => {
  const { profile, updateProfile, uploadAvatar } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    bio: profile?.bio || "",
    school_id: profile?.school_id || "",
    graduation_year: profile?.graduation_year || new Date().getFullYear(),
    avatar_url: profile?.avatar_url || ""
  });

  const handleNext = () => {
    if (step === 1 && (!formData.first_name || !formData.last_name)) {
      toast({
        title: "Please fill in required fields",
        description: "First and last name are required",
        variant: "destructive"
      });
      return;
    }
    if (step === 2 && !formData.school_id) {
      toast({
        title: "Please select a school",
        description: "School selection is required to continue",
        variant: "destructive"
      });
      return;
    }
    setStep(step + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateProfile(formData);
      toast({
        title: "Profile updated successfully!",
        description: "Your profile has been completed.",
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
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Let's set up your profile to connect with your classmates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {num}
                </div>
                {num < 3 && (
                  <div className={`w-12 h-0.5 ${
                    step > num ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Tell us about yourself
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center mb-6">
                  <AvatarUpload
                    currentImageUrl={formData.avatar_url}
                    fallbackText={getInitials()}
                    onImageUploaded={handleAvatarUpload}
                    size="md"
                  />
                </div>
                
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
                
                <div>
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: School Selection */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>
                  Select your school and graduation year
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SchoolSelector
                  selectedSchoolId={formData.school_id}
                  onSchoolSelect={(schoolId) => setFormData({...formData, school_id: schoolId})}
                />
                
                <div>
                  <Label htmlFor="graduation_year">Graduation Year *</Label>
                  <Input
                    id="graduation_year"
                    type="number"
                    value={formData.graduation_year}
                    onChange={(e) => setFormData({...formData, graduation_year: parseInt(e.target.value)})}
                    min={1950}
                    max={new Date().getFullYear() + 10}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Profile</CardTitle>
                <CardDescription>
                  Make sure everything looks correct
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                  <AvatarUpload
                    currentImageUrl={formData.avatar_url}
                    fallbackText={getInitials()}
                    onImageUploaded={handleAvatarUpload}
                    size="sm"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formData.first_name} {formData.last_name}
                    </h3>
                    <p className="text-muted-foreground">Class of {formData.graduation_year}</p>
                  </div>
                </div>
                
                {formData.bio && (
                  <div>
                    <Label>Bio</Label>
                    <p className="text-sm text-muted-foreground mt-1">{formData.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              Previous
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? "Saving..." : "Complete Profile"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSetupDialog;