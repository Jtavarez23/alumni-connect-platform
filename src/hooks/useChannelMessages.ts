import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChannelMessage } from './useClassChannels';

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (channelId && user) {
      loadMessages();
      subscribeToMessages();
    }
  }, [channelId, user]);

  const loadMessages = async () => {
    if (!channelId) return;

    try {
      const { data, error } = await supabase
        .from('channel_messages')
        .select(`
          *,
          sender:profiles!sender_id(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          reply_to:channel_messages!reply_to_id(
            id,
            content,
            sender:profiles!sender_id(
              first_name,
              last_name
            )
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data as ChannelMessage[]) || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!channelId) return;

    const channel = supabase
      .channel(`channel_messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!channelId || !user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content: content.trim(),
          reply_to_id: replyToId || null,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Get current message to update reactions
      const { data: message, error: fetchError } = await supabase
        .from('channel_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      const reactions = (message.reactions as Record<string, string[]>) || {};
      const userReactions = reactions[emoji] || [];
      
      let newReactions;
      if (userReactions.includes(user.id)) {
        // Remove reaction
        newReactions = {
          ...reactions,
          [emoji]: userReactions.filter((id: string) => id !== user.id),
        };
        if (newReactions[emoji].length === 0) {
          delete newReactions[emoji];
        }
      } else {
        // Add reaction
        newReactions = {
          ...reactions,
          [emoji]: [...userReactions, user.id],
        };
      }

      const { error } = await supabase
        .from('channel_messages')
        .update({ reactions: newReactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    addReaction,
    refreshMessages: loadMessages,
  };
}