import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePartyRoom } from "@/hooks/usePartyRoom";
import { YearbookViewer } from "./YearbookViewer";
import { Users, Crown, LogOut, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  school_id: string;
  cover_image_url?: string;
  page_count: number;
  upload_status: string;
  created_at: string;
  uploaded_by?: string;
  school: {
    name: string;
  };
  schools?: {
    name: string;
  };
}

interface PartyYearbookViewerProps {
  roomId: string;
  onLeave: () => void;
}

export function PartyYearbookViewer({ roomId, onLeave }: PartyYearbookViewerProps) {
  const { user } = useAuth();
  const { room, participants, loading, isHost, updateCurrentPage, leaveRoom } = usePartyRoom(roomId);
  const [yearbook, setYearbook] = useState<YearbookEdition | null>(null);
  const [showYearbook, setShowYearbook] = useState(true);

  useEffect(() => {
    if (room?.yearbook_edition_id) {
      fetchYearbook();
    }
  }, [room?.yearbook_edition_id]);

  const fetchYearbook = async () => {
    if (!room?.yearbook_edition_id) return;

    try {
      const { data, error } = await supabase
        .from("yearbook_editions")
        .select(`
          *,
          school:schools(name)
        `)
        .eq("id", room.yearbook_edition_id)
        .single();

      if (error) throw error;
      setYearbook(data);
    } catch (error) {
      console.error("Error fetching yearbook:", error);
      toast.error("Failed to load yearbook");
    }
  };

  const handleLeave = async () => {
    await leaveRoom();
    onLeave();
  };

  const handlePageChange = (page: number) => {
    if (isHost) {
      updateCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!room || !yearbook) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Room not found or access denied</p>
        <Button onClick={onLeave} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Party Room Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {room.name}
                {isHost && <Badge variant="secondary">Host</Badge>}
              </CardTitle>
              <CardDescription>
                {room.yearbook_edition?.title} - {room.yearbook_edition?.school?.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setShowYearbook(!showYearbook)}
              >
                {showYearbook ? "Show Participants" : "Show Yearbook"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLeave}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave Party
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {!showYearbook && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.profile?.avatar_url} />
                      <AvatarFallback>
                        {participant.profile?.first_name?.[0]}
                        {participant.profile?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {participant.profile?.first_name} {participant.profile?.last_name}
                        {participant.user_id === room.host_id && (
                          <Crown className="h-3 w-3 inline ml-1 text-yellow-500" />
                        )}
                      </p>
                      <div className="flex items-center gap-1">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            participant.is_online ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {participant.is_online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Yearbook Viewer */}
      {showYearbook && (
        <div className="space-y-4">
          {!isHost && room.current_page && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                The host is viewing page {room.current_page}
              </p>
            </div>
          )}
          
          <YearbookViewer
            yearbook={{
              ...yearbook,
              cover_image_url: yearbook.cover_image_url || '',
              schools: {
                name: yearbook.school?.name || '',
                type: 'high_school',
                location: {}
              }
            }}
            onBack={onLeave}
          />
        </div>
      )}
    </div>
  );
}