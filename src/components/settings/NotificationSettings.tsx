import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Smartphone, Users, MessageCircle, Tag, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NotificationSettingsProps {
  onSettingsChange?: () => void;
}

const NotificationSettings = ({ onSettingsChange }: NotificationSettingsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    // Specific notification types (could be extended in the future)
    notify_friend_requests: true,
    notify_messages: true,
    notify_tags: true,
    notify_mentions: true
  });

  useEffect(() => {
    if (profile) {
      setSettings({
        email_notifications: profile.email_notifications ?? true,
        push_notifications: profile.push_notifications ?? true,
        notify_friend_requests: true,
        notify_messages: true,
        notify_tags: true,
        notify_mentions: true
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email_notifications: settings.email_notifications,
          push_notifications: settings.push_notifications
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified about activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Notification Methods */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Notification Methods</Label>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="email_notifications">Email notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              id="email_notifications"
              checked={settings.email_notifications}
              onCheckedChange={(checked) => setSettings({...settings, email_notifications: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="push_notifications">Push notifications</Label>
                <p className="text-sm text-muted-foreground">Receive in-app notifications</p>
              </div>
            </div>
            <Switch
              id="push_notifications"
              checked={settings.push_notifications}
              onCheckedChange={(checked) => setSettings({...settings, push_notifications: checked})}
            />
          </div>
        </div>

        {/* Specific Notification Types */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">What to notify me about</Label>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="notify_friend_requests">Friend requests</Label>
                <p className="text-sm text-muted-foreground">When someone wants to connect with you</p>
              </div>
            </div>
            <Switch
              id="notify_friend_requests"
              checked={settings.notify_friend_requests}
              onCheckedChange={(checked) => setSettings({...settings, notify_friend_requests: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="notify_messages">New messages</Label>
                <p className="text-sm text-muted-foreground">When you receive a new message</p>
              </div>
            </div>
            <Switch
              id="notify_messages"
              checked={settings.notify_messages}
              onCheckedChange={(checked) => setSettings({...settings, notify_messages: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="notify_tags">Photo tags</Label>
                <p className="text-sm text-muted-foreground">When someone tags you in a yearbook photo</p>
              </div>
            </div>
            <Switch
              id="notify_tags"
              checked={settings.notify_tags}
              onCheckedChange={(checked) => setSettings({...settings, notify_tags: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="notify_mentions">Mentions and activity</Label>
                <p className="text-sm text-muted-foreground">When someone mentions you or likes your content</p>
              </div>
            </div>
            <Switch
              id="notify_mentions"
              checked={settings.notify_mentions}
              onCheckedChange={(checked) => setSettings({...settings, notify_mentions: checked})}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Notification Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You can always change these settings later</li>
              <li>• Email notifications are sent for important updates</li>
              <li>• Push notifications appear instantly in the app</li>
              <li>• We'll never spam you or share your preferences</li>
            </ul>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Notification Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;