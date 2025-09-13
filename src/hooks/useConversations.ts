import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ConversationWithProfile {
  id: string;
  created_by?: string;
  is_group: boolean;
  title?: string;
  last_message_at: string;
  other_user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  participants?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  }[];
  unread_count: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
      subscribeToConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      // First get conversation IDs where user is a participant
      const { data: membershipData, error: membershipError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;
      if (!membershipData || membershipData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = membershipData.map(m => m.conversation_id);

      // Get conversations where user is a participant
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          created_by,
          is_group,
          title,
          last_message_at,
          conversation_members:conversation_members(
            user:profiles(id, first_name, last_name, avatar_url)
          )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Transform data to include participant info and unread count
      const conversationsWithProfiles = await Promise.all(
        (conversationsData || []).map(async (conv: any) => {
          // Count unread messages
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          if (conv.is_group) {
            // Group conversation
            return {
              id: conv.id,
              created_by: conv.created_by,
              is_group: true,
              title: conv.title,
              last_message_at: conv.last_message_at,
              participants: conv.conversation_members.map((cp: any) => cp.user),
              unread_count: count || 0,
            };
          } else {
            // 1:1 conversation - find the other participant
            const otherParticipant = conv.conversation_members
              .map((cp: any) => cp.user)
              .find((p: any) => p.id !== user.id);

            return {
              id: conv.id,
              created_by: conv.created_by,
              is_group: false,
              last_message_at: conv.last_message_at,
              other_user: otherParticipant,
              participants: conv.conversation_members.map((cp: any) => cp.user),
              unread_count: count || 0,
            };
          }
        })
      );

      setConversations(conversationsWithProfiles);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConversations = () => {
    if (!user) return;

    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unread_count, 0);
  };

  return {
    conversations,
    loading,
    getTotalUnreadCount,
    refreshConversations: loadConversations,
  };
}