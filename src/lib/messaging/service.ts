// Centralized messaging service with caching and optimization
import { supabase } from '@/integrations/supabase/client';
import {
  Message,
  Conversation,
  ConversationWithProfile,
  UserProfile,
  Attachment
} from './types';
import { MESSAGE_LIMITS } from './constants';

class MessagingService {
  private messageCache = new Map<string, Message[]>();
  private conversationCache = new Map<string, ConversationWithProfile>();
  private subscriptions = new Map<string, any>();

  /**
   * Load messages with caching and pagination
   */
  async loadMessages(
    conversationId: string,
    limit: number = MESSAGE_LIMITS.MESSAGE_BATCH_SIZE,
    offset: number = 0,
    useCache: boolean = true
  ): Promise<Message[]> {
    const cacheKey = `${conversationId}_${offset}_${limit}`;

    if (useCache && this.messageCache.has(cacheKey)) {
      return this.messageCache.get(cacheKey)!;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const messages = data || [];
      if (useCache) {
        this.messageCache.set(cacheKey, messages);
      }

      return messages;
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  }

  /**
   * Send message with optimistic updates
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    text?: string,
    attachments?: string[]
  ): Promise<Message> {
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        text: text?.trim(),
        media: attachments?.length ? { urls: attachments } : null,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // Update cache
      this.invalidateMessageCache(conversationId);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Upload attachment with progress tracking
   */
  async uploadAttachment(
    attachment: Attachment,
    conversationId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const fileExt = attachment.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `message-attachments/${conversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, attachment.file, {
          onUploadProgress: (progress) => {
            if (onProgress && progress.total) {
              const percentage = (progress.loaded / progress.total) * 100;
              onProgress(percentage);
            }
          }
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  /**
   * Load conversations with caching
   */
  async loadConversations(userId: string, useCache: boolean = true): Promise<ConversationWithProfile[]> {
    const cacheKey = `conversations_${userId}`;

    if (useCache && this.conversationCache.has(cacheKey)) {
      return [this.conversationCache.get(cacheKey)!];
    }

    try {
      // Get conversation IDs where user is a participant
      const { data: membershipData, error: membershipError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId);

      if (membershipError) throw membershipError;
      if (!membershipData?.length) return [];

      const conversationIds = membershipData.map(m => m.conversation_id);

      // Batch load conversations with participants
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

      // Get unread counts in batch
      const unreadCounts = await this.getUnreadCounts(conversationIds, userId);

      const conversations = (conversationsData || []).map((conv: any) => {
        const unreadCount = unreadCounts.get(conv.id) || 0;

        if (conv.is_group) {
          return {
            id: conv.id,
            created_by: conv.created_by,
            is_group: true,
            title: conv.title,
            last_message_at: conv.last_message_at,
            participants: conv.conversation_members?.map((cp: any) => cp.user) || [],
            unread_count: unreadCount,
          } as ConversationWithProfile;
        } else {
          const otherParticipant = conv.conversation_members
            ?.map((cp: any) => cp.user)
            .find((p: any) => p.id !== userId);

          return {
            id: conv.id,
            created_by: conv.created_by,
            is_group: false,
            last_message_at: conv.last_message_at,
            other_user: otherParticipant,
            participants: conv.conversation_members?.map((cp: any) => cp.user) || [],
            unread_count: unreadCount,
          } as ConversationWithProfile;
        }
      });

      return conversations;
    } catch (error) {
      console.error('Error loading conversations:', error);
      throw error;
    }
  }

  /**
   * Get unread message counts in batch for better performance
   */
  private async getUnreadCounts(conversationIds: string[], userId: string): Promise<Map<string, number>> {
    const unreadCounts = new Map<string, number>();

    try {
      // Use a single query to get all unread counts
      const { data, error } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (error) throw error;

      // Count messages per conversation
      data?.forEach(message => {
        const count = unreadCounts.get(message.conversation_id) || 0;
        unreadCounts.set(message.conversation_id, count + 1);
      });

    } catch (error) {
      console.error('Error getting unread counts:', error);
    }

    return unreadCounts;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Subscribe to message updates for a conversation
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void,
    onError?: (error: any) => void
  ): () => void {
    const channelKey = `messages_${conversationId}`;

    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe();
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          try {
            const newMessage = payload.new as Message;
            onMessage(newMessage);
            this.invalidateMessageCache(conversationId);
          } catch (error) {
            onError?.(error);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelKey, channel);

    return () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelKey);
    };
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(
    conversationId: string,
    userId: string,
    onTypingChange: (typingUsers: UserProfile[]) => void
  ): () => void {
    const channelKey = `typing_${conversationId}`;

    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe();
    }

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const state = channel.presenceState();
          const typingUsers = Object.values(state)
            .flat()
            .filter((presence: any) => presence.typing && presence.user_id !== userId)
            .map((presence: any) => presence.user);

          onTypingChange(typingUsers);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    this.subscriptions.set(channelKey, channel);

    return () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelKey);
    };
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const channelKey = `typing_${conversationId}`;
    const channel = this.subscriptions.get(channelKey);

    if (channel) {
      await channel.track({
        user_id: userId,
        typing: isTyping,
        online_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Create or get direct conversation
   */
  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<string> {
    try {
      // Try to find existing conversation
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('is_group', false)
        .or(`and(participant_1_id.eq.${userId1},participant_2_id.eq.${userId2}),and(participant_1_id.eq.${userId2},participant_2_id.eq.${userId1})`)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingConversation) {
        return existingConversation.id;
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: userId1,
          participant_2_id: userId2,
          is_group: false,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      this.invalidateConversationCache(userId1);
      this.invalidateConversationCache(userId2);

      return newConversation.id;
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
      throw error;
    }
  }

  /**
   * Cache invalidation helpers
   */
  private invalidateMessageCache(conversationId: string): void {
    for (const key of this.messageCache.keys()) {
      if (key.startsWith(`${conversationId}_`)) {
        this.messageCache.delete(key);
      }
    }
  }

  private invalidateConversationCache(userId: string): void {
    this.conversationCache.delete(`conversations_${userId}`);
  }

  /**
   * Clear all caches (useful for logout or major state changes)
   */
  clearAllCaches(): void {
    this.messageCache.clear();
    this.conversationCache.clear();
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    for (const channel of this.subscriptions.values()) {
      supabase.removeChannel(channel);
    }
    this.subscriptions.clear();
    this.clearAllCaches();
  }
}

// Export singleton instance
export const messagingService = new MessagingService();