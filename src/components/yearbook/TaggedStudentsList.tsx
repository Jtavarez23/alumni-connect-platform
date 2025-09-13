import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, MessageCircle, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TaggedStudent {
  id: string;
  verification_status: string;
  tagged_profile: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    graduation_year: number | null;
  };
  tagged_by: {
    first_name: string;
    last_name: string;
  };
}

interface TaggedStudentsListProps {
  yearbookEntryId: string;
  onTagUpdate?: () => void;
}

export function TaggedStudentsList({ yearbookEntryId, onTagUpdate }: TaggedStudentsListProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<TaggedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, [yearbookEntryId]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("student_tags")
        .select(`
          id,
          verification_status,
          tagged_profile:profiles!tagged_profile_id (
            id,
            first_name,
            last_name,
            avatar_url,
            graduation_year
          ),
          tagged_by:profiles!tagged_by_id (
            first_name,
            last_name
          )
        `)
        .eq("yearbook_entry_id", yearbookEntryId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTag = async (tagId: string, approve: boolean) => {
    if (!user) return;
    
    setUpdating(tagId);
    try {
      const { error } = await supabase
        .from("student_tags")
        .update({
          verification_status: approve ? 'verified' : 'rejected'
        })
        .eq("id", tagId);

      if (error) throw error;
      
      toast.success(approve ? "Tag verified!" : "Tag rejected");
      fetchTags();
      onTagUpdate?.();
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error("Failed to update tag");
    } finally {
      setUpdating(null);
    }
  };

  const sendFriendRequest = async (profileId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: profileId,
          status: 'pending'
        });

      if (error) throw error;
      toast.success("Friend request sent!");
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("You've already sent a friend request to this person");
      } else {
        console.error("Error sending friend request:", error);
        toast.error("Failed to send friend request");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Tagged Students:</p>
      {tags.map((tag) => (
        <div key={tag.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
          <Avatar className="w-8 h-8">
            <AvatarImage src={tag.tagged_profile.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {tag.tagged_profile.first_name?.[0]}{tag.tagged_profile.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {tag.tagged_profile.first_name || ''} {tag.tagged_profile.last_name || ''}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant={
                  tag.verification_status === 'verified' ? 'default' :
                  tag.verification_status === 'rejected' ? 'destructive' : 'secondary'
                }
                className="text-xs"
              >
                {tag.verification_status}
              </Badge>
              {tag.tagged_profile.graduation_year && (
                <Badge variant="outline" className="text-xs">
                  Class of {tag.tagged_profile.graduation_year}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Show verification buttons for pending tags if user is the tagged person */}
            {tag.verification_status === 'pending' && 
             tag.tagged_profile.id === user?.id && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleVerifyTag(tag.id, true)}
                  disabled={updating === tag.id}
                  className="h-7 px-2"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleVerifyTag(tag.id, false)}
                  disabled={updating === tag.id}
                  className="h-7 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            )}

            {/* Show connect button for verified tags if not self */}
            {tag.verification_status === 'verified' && 
             tag.tagged_profile.id !== user?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => sendFriendRequest(tag.tagged_profile.id)}
                className="h-7 px-2"
              >
                <UserPlus className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}