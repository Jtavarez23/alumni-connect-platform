import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CreateThenVsNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

export const CreateThenVsNowDialog = ({ open, onOpenChange, onPostCreated }: CreateThenVsNowDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [thenPhoto, setThenPhoto] = useState<File | null>(null);
  const [nowPhoto, setNowPhoto] = useState<File | null>(null);
  const [thenPreview, setThenPreview] = useState<string>("");
  const [nowPreview, setNowPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'school'>('friends');
  const { user } = useAuth();
  const { toast } = useToast();

  const handlePhotoSelect = (file: File, type: 'then' | 'now') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'then') {
        setThenPhoto(file);
        setThenPreview(preview);
      } else {
        setNowPhoto(file);
        setNowPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (file: File, filename: string) => {
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(`then-vs-now/${filename}`, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!user || !thenPhoto || !nowPhoto) {
      toast({
        title: "Error",
        description: "Please select both photos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload photos
      const thenFilename = `${user.id}-then-${Date.now()}.jpg`;
      const nowFilename = `${user.id}-now-${Date.now()}.jpg`;

      const [thenUrl, nowUrl] = await Promise.all([
        uploadPhoto(thenPhoto, thenFilename),
        uploadPhoto(nowPhoto, nowFilename)
      ]);

      // Create post
      const { error } = await supabase
        .from('then_vs_now_posts')
        .insert({
          user_id: user.id,
          then_photo_url: thenUrl,
          now_photo_url: nowUrl,
          caption: caption.trim() || null,
          visibility
        });

      if (error) throw error;

      onPostCreated();
      resetForm();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setThenPhoto(null);
    setNowPhoto(null);
    setThenPreview("");
    setNowPreview("");
    setCaption("");
    setVisibility('friends');
  };

  const PhotoUpload = ({ 
    type, 
    preview, 
    onSelect 
  }: { 
    type: 'then' | 'now'; 
    preview: string; 
    onSelect: (file: File) => void;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium capitalize">{type} Photo</Label>
      {preview ? (
        <div className="relative group">
          <img 
            src={preview} 
            alt={`${type} photo`}
            className="w-full aspect-square object-cover rounded-lg"
          />
          <button
            onClick={() => {
              if (type === 'then') {
                setThenPhoto(null);
                setThenPreview("");
              } else {
                setNowPhoto(null);
                setNowPreview("");
              }
            }}
            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to upload {type} photo
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSelect(file);
            }}
          />
        </label>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Then vs Now Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <PhotoUpload
              type="then"
              preview={thenPreview}
              onSelect={(file) => handlePhotoSelect(file, 'then')}
            />
            <PhotoUpload
              type="now"
              preview={nowPreview}
              onSelect={(file) => handlePhotoSelect(file, 'now')}
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (Optional)</Label>
            <Textarea
              id="caption"
              placeholder="Share your transformation story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {caption.length}/500 characters
            </p>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(value: 'public' | 'friends' | 'school') => setVisibility(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Everyone can see</SelectItem>
                <SelectItem value="friends">Friends - Only friends can see</SelectItem>
                <SelectItem value="school">School - Only schoolmates can see</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !thenPhoto || !nowPhoto}
            >
              {loading ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};