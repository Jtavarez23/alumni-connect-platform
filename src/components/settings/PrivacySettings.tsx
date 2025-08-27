import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Users, MessageCircle, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PrivacySettingsProps {
  onSettingsChange?: () => void;
}

const PrivacySettings = ({ onSettingsChange }: PrivacySettingsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    show_in_search: true,
    allow_friend_requests: true,
    allow_messages: true,
    allow_tags: true,
    show_graduation_year: true,
    show_school: true,
    privacy_level: 'friends' as 'public' | 'friends' | 'private'
  });

  useEffect(() => {
    if (profile) {
      setSettings({
        show_in_search: profile.show_in_search ?? true,
        allow_friend_requests: profile.allow_friend_requests ?? true,
        allow_messages: profile.allow_messages ?? true,
        allow_tags: profile.allow_tags ?? true,
        show_graduation_year: profile.show_graduation_year ?? true,
        show_school: profile.show_school ?? true,
        privacy_level: (profile.privacy_level as 'public' | 'friends' | 'private') ?? 'friends'
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
      });
      
      onSettingsChange?.();
    } catch (error) {
      toast({
        title: "Error updating settings",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const privacyOptions = [
    { value: 'public', label: 'Public', description: 'Everyone can see your profile' },
    { value: 'friends', label: 'Friends Only', description: 'Only your connections can see your profile' },
    { value: 'private', label: 'Private', description: 'Very limited profile visibility' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control who can see your information and interact with you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Privacy Level */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Profile Visibility</Label>
          <div className="space-y-2">
            {privacyOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={option.value}
                  name="privacy_level"
                  value={option.value}
                  checked={settings.privacy_level === option.value}
                  onChange={(e) => setSettings({...settings, privacy_level: e.target.value as any})}
                  className="text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="font-medium">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Privacy Controls */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Detailed Controls</Label>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="show_in_search">Show in search results</Label>
                <p className="text-sm text-muted-foreground">Allow others to find you when searching</p>
              </div>
            </div>
            <Switch
              id="show_in_search"
              checked={settings.show_in_search}
              onCheckedChange={(checked) => setSettings({...settings, show_in_search: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="allow_friend_requests">Allow friend requests</Label>
                <p className="text-sm text-muted-foreground">Let others send you connection requests</p>
              </div>
            </div>
            <Switch
              id="allow_friend_requests"
              checked={settings.allow_friend_requests}
              onCheckedChange={(checked) => setSettings({...settings, allow_friend_requests: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="allow_messages">Allow messages</Label>
                <p className="text-sm text-muted-foreground">Let connections send you messages</p>
              </div>
            </div>
            <Switch
              id="allow_messages"
              checked={settings.allow_messages}
              onCheckedChange={(checked) => setSettings({...settings, allow_messages: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="allow_tags">Allow photo tags</Label>
                <p className="text-sm text-muted-foreground">Let others tag you in yearbook photos</p>
              </div>
            </div>
            <Switch
              id="allow_tags"
              checked={settings.allow_tags}
              onCheckedChange={(checked) => setSettings({...settings, allow_tags: checked})}
            />
          </div>
        </div>

        {/* Profile Information Visibility */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Profile Information</Label>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show_graduation_year">Show graduation year</Label>
              <p className="text-sm text-muted-foreground">Display your graduation year on your profile</p>
            </div>
            <Switch
              id="show_graduation_year"
              checked={settings.show_graduation_year}
              onCheckedChange={(checked) => setSettings({...settings, show_graduation_year: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show_school">Show school information</Label>
              <p className="text-sm text-muted-foreground">Display your school on your profile</p>
            </div>
            <Switch
              id="show_school"
              checked={settings.show_school}
              onCheckedChange={(checked) => setSettings({...settings, show_school: checked})}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Privacy Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PrivacySettings;