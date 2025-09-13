// Shared types for the messaging system
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text?: string;
  media?: {
    urls: string[];
  };
  created_at: string;
  read_at?: string;
  reply_to_id?: string;
}

export interface Conversation {
  id: string;
  participant_1_id?: string;
  participant_2_id?: string;
  created_by?: string;
  is_group: boolean;
  title?: string;
  last_message_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationWithProfile extends Conversation {
  other_user?: UserProfile;
  participants?: UserProfile[];
  unread_count: number;
  last_message?: Message;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  email?: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  role?: 'admin' | 'member';
  user?: UserProfile;
}

export interface TypingUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export interface MessagePermission {
  can_message: boolean;
  reason: string;
  expires_at?: string;
}

export interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'file';
  preview?: string;
  uploadProgress?: number;
}

// Message-related events
export type MessageEvent =
  | { type: 'MESSAGE_SENT'; payload: Message }
  | { type: 'MESSAGE_RECEIVED'; payload: Message }
  | { type: 'MESSAGE_READ'; payload: { messageId: string; readAt: string } }
  | { type: 'TYPING_START'; payload: { userId: string; conversationId: string } }
  | { type: 'TYPING_STOP'; payload: { userId: string; conversationId: string } };

// Subscription status
export type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Message states
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';