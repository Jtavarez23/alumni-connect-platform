import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Clock, Book, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PartyRoom {
  id: string;
  name: string;
  description: string;
  host_id: string;
  current_page: number;
  max_participants: number;
  created_at: string;
  yearbook_edition: {
    title: string;
    year: number;
    school: {
      name: string;
    };
  };
  host: {
    first_name: string;
    last_name: string;
  };
  participants: {
    count: number;
  }[];
}

interface PartyRoomBrowserProps {
  onJoinRoom: (roomId: string) => void;
}

export function PartyRoomBrowser({ onJoinRoom }: PartyRoomBrowserProps) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<PartyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const fetchActiveRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("yearbook_party_rooms")
        .select(`
          *,
          yearbook_edition:yearbook_editions(
            title,
            year,
            school:schools(name)
          ),
          host:profiles!yearbook_party_rooms_host_id_fkey(
            first_name,
            last_name
          ),
          participants:yearbook_party_participants(count)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Error fetching party rooms:", error);
      toast.error("Failed to load party rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;

    setJoiningRoom(roomId);
    try {
      const { error } = await supabase
        .from("yearbook_party_participants")
        .insert({
          room_id: roomId,
          user_id: user.id
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You're already in this party room");
        } else {
          throw error;
        }
      } else {
        toast.success("Joined party room!");
        onJoinRoom(roomId);
      }
    } catch (error) {
      console.error("Error joining party room:", error);
      toast.error("Failed to join party room");
    } finally {
      setJoiningRoom(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Active Party Rooms</h3>
        <p className="text-muted-foreground">
          Be the first to create a yearbook party and browse memories together!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <Card key={room.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{room.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Book className="h-4 w-4" />
                  {room.yearbook_edition?.title} - {room.yearbook_edition?.school?.name}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {room.participants?.[0]?.count || 0}/{room.max_participants}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {room.description && (
              <p className="text-sm text-muted-foreground mb-3">{room.description}</p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDistanceToNow(new Date(room.created_at), { addSuffix: true })}
                </span>
                <span>
                  Host: {room.host?.first_name} {room.host?.last_name}
                </span>
              </div>
              
              <Button
                onClick={() => handleJoinRoom(room.id)}
                disabled={joiningRoom === room.id}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {joiningRoom === room.id ? "Joining..." : "Join Party"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}