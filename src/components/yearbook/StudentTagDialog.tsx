import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Check, X, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  school_id: string;
  graduation_year: number | null;
}

interface StudentTagDialogProps {
  open: boolean;
  onClose: () => void;
  yearbookEntryId: string;
  studentName: string;
  onTagged?: () => void;
}

export function StudentTagDialog({ 
  open, 
  onClose, 
  yearbookEntryId, 
  studentName,
  onTagged 
}: StudentTagDialogProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagging, setTagging] = useState(false);

  useEffect(() => {
    if (open && searchTerm.length >= 2) {
      searchProfiles();
    } else {
      setProfiles([]);
    }
  }, [searchTerm, open]);

  const searchProfiles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, school_id, graduation_year")
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error searching profiles:", error);
      toast.error("Failed to search profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleTagSelf = async () => {
    if (!user) return;
    
    setTagging(true);
    try {
      const { error } = await supabase
        .from("student_tags")
        .insert({
          yearbook_entry_id: yearbookEntryId,
          tagged_profile_id: user.id,
          tagged_by_id: user.id,
          verification_status: 'verified' // Self-tags are auto-verified
        });

      if (error) throw error;
      
      toast.success("You've been tagged in this yearbook entry!");
      onTagged?.();
      onClose();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("You're already tagged in this entry");
      } else {
        console.error("Error tagging self:", error);
        toast.error("Failed to tag yourself");
      }
    } finally {
      setTagging(false);
    }
  };

  const handleTagOther = async (profileId: string) => {
    if (!user) return;
    
    setTagging(true);
    try {
      const { error } = await supabase
        .from("student_tags")
        .insert({
          yearbook_entry_id: yearbookEntryId,
          tagged_profile_id: profileId,
          tagged_by_id: user.id,
          verification_status: 'pending' // Requires verification from tagged user
        });

      if (error) throw error;
      
      toast.success("Tag suggestion sent! They'll be notified to verify.");
      onTagged?.();
      onClose();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("This person is already tagged in this entry");
      } else {
        console.error("Error tagging other:", error);
        toast.error("Failed to send tag suggestion");
      }
    } finally {
      setTagging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tag "{studentName}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Self-tag option */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">
              Is this you in the yearbook?
            </p>
            <Button 
              onClick={handleTagSelf}
              disabled={tagging}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              This is me
            </Button>
          </div>

          {/* Search for others */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Or search for someone else:
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search results */}
          {loading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && profiles.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleTagOther(profile.id)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {profile.first_name || ''} {profile.last_name || ''}
                    </p>
                    {profile.graduation_year && (
                      <Badge variant="secondary" className="text-xs">
                        Class of {profile.graduation_year}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && searchTerm.length >= 2 && profiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No profiles found matching "{searchTerm}"
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}