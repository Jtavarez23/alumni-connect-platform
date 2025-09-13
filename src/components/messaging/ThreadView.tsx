import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { MessageInput } from './MessageInput';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text?: string;
  media?: any;
  created_at: string;
  read_at?: string;
}

interface Conversation {
  id: string;
  created_by?: string;
  is_group: boolean;
  title?: string;
  participants?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  }[];
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (threadId) {
      loadConversation();
      loadMessages();
      const messageChannel = subscribeToMessages();
      const typingChannel = subscribeToTyping();
      
      return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(typingChannel);
      };
    }
  }, [threadId]);

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          created_by,
          is_group,
          title,
          conversation_members:conversation_members(
            user:profiles(id, first_name, last_name, avatar_url)
          )
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;
      
      // Transform the data to match expected format
      const conversationData = {
        ...data,
        participants: data.conversation_members?.map((member: any) => member.user) || []
      };
      
      setConversation(conversationData);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      markMessagesAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', threadId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          if (newMessage.sender_id !== user?.id) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return channel;
  };

  const subscribeToTyping = () => {
    const channel = supabase
      .channel(`typing:${threadId}`)
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const state = channel.presenceState();
          const typingUsers = Object.values(state)
            .flat()
            .filter((presence: any) => presence.typing && presence.user_id !== user?.id)
            .map((presence: any) => presence.user);
          
          setTypingUsers(typingUsers);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user?.id,
            user: user,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return channel;
  };

  const sendTypingIndicator = async (isTyping: boolean) => {
    const channel = supabase.channel(`typing:${threadId}`);
    await channel.track({
      user_id: user?.id,
      user: user,
      typing: isTyping,
      online_at: new Date().toISOString(),
    });
  };

  const getMessageDate = (date: string) => {
    if (isToday(new Date(date))) {
      return 'Today';
    } else if (isYesterday(new Date(date))) {
      return 'Yesterday';
    } else {
      return format(new Date(date), 'MMMM d, yyyy');
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={conversation.is_group ? undefined : conversation.participants?.[0]?.avatar_url} />
          <AvatarFallback className="text-xs">
            {conversation.is_group 
              ? 'G' 
              : getInitials(conversation.participants?.[0]?.first_name || '', conversation.participants?.[0]?.last_name || '')
            }
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-medium">
            {conversation.is_group 
              ? conversation.title || 'Group Chat'
              : `${conversation.participants?.[0]?.first_name} ${conversation.participants?.[0]?.last_name}`
            }
          </h3>
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{typingUsers.map(u => u.first_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing</span>
              <div className="flex space-x-0.5">
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message, index) => {
            const showDate = index === 0 || 
              getMessageDate(message.created_at) !== getMessageDate(messages[index - 1].created_at);
            
            return (
              <React.Fragment key={message.id}>
                {showDate && (
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="text-xs">
                      {getMessageDate(message.created_at)}
                    </Badge>
                  </div>
                )}
                <div className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] space-y-1">
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {/* Media attachments */}
                      {message.media?.urls && message.media.urls.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {message.media.urls.map((url: string, index: number) => {
                            const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                            return isImage ? (
                              <img
                                key={index}
                                src={url}
                                alt="Attachment"
                                className="max-w-full max-h-60 rounded cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ) : (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 p-2 rounded bg-background/20 hover:bg-background/30 transition-colors text-xs"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                File attachment
                              </a>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Text content */}
                      {message.text && <p className="text-sm">{message.text}</p>}
                      
                      {/* Timestamp */}
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {format(new Date(message.created_at), 'HH:mm')}
                      </p>
                    </div>
                    {message.sender_id === user?.id && message.read_at && (
                      <div className="flex justify-end">
                        <span className="text-xs text-muted-foreground">
                          Read {formatDistanceToNow(new Date(message.read_at), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4">
        <MessageInput 
          conversationId={threadId!}
          onTypingChange={sendTypingIndicator}
        />
      </div>
    </div>
  );
}