import React, { useState, useEffect, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { MessagingRestrictions } from '@/components/messaging/MessagingRestrictions';
import { useSubscription } from '@/hooks/useSubscription';
import { useOptimizedMessages } from '@/hooks/useOptimizedMessages';
import { messagingService } from '@/lib/messaging/service';
import { UserProfile } from '@/lib/messaging/types';
import { getInitials, getDisplayName } from '@/lib/messaging/utils';
import { UserAvatar, MessageBubble, LoadingSpinner, TypingIndicator } from './shared';
import { MessageInput } from './MessageInput';

interface MessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: UserProfile;
}

export const MessageDialog = memo<MessageDialogProps>(({ isOpen, onClose, otherUser }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [canMessage, setCanMessage] = useState<boolean | null>(null);

  // Use optimized messages hook
  const {
    messages,
    loading: messagesLoading,
    sending,
    typingUsers,
    startTyping,
    stopTyping,
    scrollToBottom,
  } = useOptimizedMessages({
    conversationId,
  });

  // Load or create conversation when dialog opens
  const loadOrCreateConversation = useCallback(async () => {
    if (!user || !otherUser) return;

    setLoadingConversation(true);
    try {
      const convId = await messagingService.getOrCreateDirectConversation(user.id, otherUser.id);
      setConversationId(convId);
    } catch (error) {
      console.error('Error loading/creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setLoadingConversation(false);
    }
  }, [user, otherUser, toast]);

  // Load conversation when dialog opens
  useEffect(() => {
    if (isOpen && user && otherUser) {
      loadOrCreateConversation();
    } else {
      setConversationId(null);
    }
  }, [isOpen, loadOrCreateConversation]);

  // Handle typing indicators
  const handleTypingChange = useCallback((isTyping: boolean) => {
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // Handle message sent callback
  const handleMessageSent = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <UserAvatar user={otherUser} size="small" />
            <DialogTitle className="text-lg">
              {getDisplayName(otherUser)}
            </DialogTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Show messaging restrictions for free users */}
          {!isPremium && (
            <div className="px-4 py-2 border-b">
              <MessagingRestrictions 
                recipientId={otherUser.id}
                recipientName={`${otherUser.first_name} ${otherUser.last_name}`}
                onCanMessage={setCanMessage}
              />
            </div>
          )}
          
          <ScrollArea className="flex-1 px-4">
            {loadingConversation || messagesLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner text="Loading messages..." />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground text-center">
                  <p>No messages yet.</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.sender_id === user?.id}
                  />
                ))}
                <TypingIndicator typingUsers={typingUsers} />
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            {conversationId ? (
              <MessageInput
                conversationId={conversationId}
                onTypingChange={handleTypingChange}
                onMessageSent={handleMessageSent}
                disabled={(!isPremium && canMessage === false) || sending}
                placeholder={
                  canMessage === false
                    ? "Connect first to message"
                    : "Type a message..."
                }
              />
            ) : (
              <div className="flex items-center justify-center p-4">
                <LoadingSpinner size="small" text="Setting up conversation..." />
              </div>
            )}

            {!isPremium && canMessage === false && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Send a connection request or upgrade to Premium to message anyone
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

MessageDialog.displayName = 'MessageDialog';