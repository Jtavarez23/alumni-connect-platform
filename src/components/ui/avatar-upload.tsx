import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentImageUrl?: string;
  fallbackText: string;
  onImageUploaded: (file: File) => Promise<void>;
  size?: "sm" | "md" | "lg";
}

const AvatarUpload = ({ 
  currentImageUrl, 
  fallbackText, 
  onImageUploaded, 
  size = "md" 
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32"
  };

  const buttonSizeClasses = {
    sm: "h-6 w-6 -bottom-1 -right-1",
    md: "h-8 w-8 -bottom-2 -right-2",
    lg: "h-10 w-10 -bottom-2 -right-2"
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Call the upload handler
      await onImageUploaded(file);
      
      toast({
        title: "Image uploaded successfully",
        description: "Your profile picture has been updated"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={currentImageUrl} />
        <AvatarFallback className={size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg"}>
          {fallbackText}
        </AvatarFallback>
      </Avatar>
      
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleFileSelect}
        disabled={uploading}
        className={`absolute ${buttonSizeClasses[size]} rounded-full p-0`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;