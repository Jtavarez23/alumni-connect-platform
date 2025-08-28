import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface ClassChannel {
  id: string;
  name: string;
  description?: string;
  school_id: string;
  graduation_year: number;
  channel_type: 'general' | 'memories' | 'events' | 'study_groups' | 'sports' | 'clubs';
  created_by: string;
  is_private: boolean;
  member_count: number;
  last_message_at: string;
  created_at: string;
  school?: {
    name: string;
  };
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: string;
  thread_count: number;
  reactions: Record<string, string[]>;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  reply_to?: {
    id: string;
    content: string;
    sender: {
      first_name: string;
      last_name: string;
    };
  };
}

export function useClassChannels() {
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState<ClassChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      loadChannels();
      subscribeToChannels();
    }
  }, [user, profile]);

  const loadChannels = async () => {
    if (!user || !profile?.school_id || !profile?.graduation_year) return;

    try {
      const { data, error } = await supabase
        .from('class_channels')
        .select(`
          *,
          school:schools(name)
        `)
        .eq('school_id', profile.school_id)
        .eq('graduation_year', profile.graduation_year)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setChannels((data as ClassChannel[]) || []);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChannels = () => {
    if (!user) return;

    const channel = supabase
      .channel('class_channels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_channels',
        },
        () => loadChannels()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createChannel = async (channelData: {
    name: string;
    description?: string;
    channel_type: ClassChannel['channel_type'];
    is_private?: boolean;
  }) => {
    if (!user || !profile?.school_id || !profile?.graduation_year) return;

    try {
      const { data, error } = await supabase
        .from('class_channels')
        .insert({
          ...channelData,
          school_id: profile.school_id,
          graduation_year: profile.graduation_year,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join creator to the channel
      await supabase
        .from('channel_members')
        .insert({
          channel_id: data.id,
          user_id: user.id,
          role: 'owner',
        });

      await loadChannels();
      return data;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  };

  const joinChannel = async (channelId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: user.id,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  };

  return {
    channels,
    loading,
    createChannel,
    joinChannel,
    refreshChannels: loadChannels,
  };
}