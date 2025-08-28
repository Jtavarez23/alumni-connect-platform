import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  channel_id: string;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface PartyRoomChatProps {
  roomId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function PartyRoomChat({ roomId, isOpen, onToggle }: PartyRoomChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [isOpen, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('channel_messages')
        .select(`
          *,
          sender:profiles!channel_messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('channel_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error("Failed to load chat messages");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`party-room-chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
          fetchMessages(); // Refresh to get sender info
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('channel_messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          channel_id: roomId,
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={onToggle} size="lg" className="rounded-full shadow-lg">
          <MessageCircle className="h-5 w-5 mr-2" />
          Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 h-96 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" />
              Party Chat
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex flex-col h-full">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={message.sender?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {message.sender?.first_name?.[0]}
                        {message.sender?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium truncate">
                          {message.sender?.first_name} {message.sender?.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t">
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                maxLength={500}
              />
              <Button type="submit" size="sm" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}