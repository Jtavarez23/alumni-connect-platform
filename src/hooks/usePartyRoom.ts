import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PartyRoomParticipant {
  id: string;
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
  profile: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface PartyRoomData {
  id: string;
  name: string;
  description: string;
  host_id: string;
  current_page: number;
  max_participants: number;
  yearbook_edition_id: string;
  yearbook_edition: {
    title: string;
    year: number;
    school: {
      name: string;
    };
  };
}

export function usePartyRoom(roomId: string | null) {
  const { user } = useAuth();
  const [room, setRoom] = useState<PartyRoomData | null>(null);
  const [participants, setParticipants] = useState<PartyRoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);

  // Fetch room data
  const fetchRoomData = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const { data: roomData, error: roomError } = await supabase
        .from("yearbook_party_rooms")
        .select(`
          *,
          yearbook_edition:yearbook_editions(
            title,
            year,
            school:schools(name)
          )
        `)
        .eq("id", roomId)
        .single();

      if (roomError) throw roomError;

      setRoom(roomData);
      setIsHost(roomData.host_id === user?.id);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("yearbook_party_participants")
        .select(`
          *,
          profile:profiles(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq("room_id", roomId);

      if (participantsError) throw participantsError;

      setParticipants(participantsData || []);
    } catch (error) {
      console.error("Error fetching room data:", error);
      toast.error("Failed to load party room");
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id]);

  // Update current page (host only)
  const updateCurrentPage = useCallback(async (page: number) => {
    if (!roomId || !isHost) return;

    try {
      const { error } = await supabase
        .from("yearbook_party_rooms")
        .update({ current_page: page })
        .eq("id", roomId);

      if (error) throw error;

      setRoom(prev => prev ? { ...prev, current_page: page } : null);
    } catch (error) {
      console.error("Error updating page:", error);
      toast.error("Failed to update page");
    }
  }, [roomId, isHost]);

  // Update user presence
  const updatePresence = useCallback(async () => {
    if (!roomId || !user) return;

    try {
      await supabase
        .from("yearbook_party_participants")
        .update({ 
          last_seen_at: new Date().toISOString(),
          is_online: true
        })
        .eq("room_id", roomId)
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  }, [roomId, user]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!roomId || !user) return;

    try {
      await supabase
        .from("yearbook_party_participants")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", user.id);

      toast.success("Left party room");
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error("Failed to leave room");
    }
  }, [roomId, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!roomId) return;

    fetchRoomData();

    // Subscribe to room updates
    const roomChannel = supabase
      .channel(`room_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "yearbook_party_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "yearbook_party_participants",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // Refetch participants when they change
          fetchRoomData();
        }
      )
      .subscribe();

    // Update presence every 30 seconds
    const presenceInterval = setInterval(updatePresence, 30000);
    updatePresence(); // Initial presence update

    return () => {
      supabase.removeChannel(roomChannel);
      clearInterval(presenceInterval);
    };
  }, [roomId, fetchRoomData, updatePresence]);

  return {
    room,
    participants,
    loading,
    isHost,
    updateCurrentPage,
    leaveRoom
  };
}