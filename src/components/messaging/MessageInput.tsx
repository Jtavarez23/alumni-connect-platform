import React, { useState, useRef, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useRateLimit } from '@/lib/rate-limiting';
import { extractUrlsFromText } from '@/hooks/useLinkSafety';
import { messagingService } from '@/lib/messaging/service';
import { Attachment } from '@/lib/messaging/types';
import {
  MESSAGE_LIMITS,
  COMMON_EMOJIS,
  ERROR_MESSAGES
} from '@/lib/messaging/constants';
import {
  generateTempId,
  isSupportedFileType,
  isImageFile
} from '@/lib/messaging/utils';
import { AttachmentPreview } from './shared/AttachmentPreview';

interface MessageInputProps {
  conversationId: string;
  onTypingChange?: (isTyping: boolean) => void;
  onMessageSent?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput = memo<MessageInputProps>(({
  conversationId,
  onTypingChange,
  onMessageSent,
  disabled = false,
  placeholder = "Type a message..."
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkRateLimit } = useRateLimit();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Enforce character limit
    if (value.length > MESSAGE_LIMITS.MAX_MESSAGE_LENGTH) {
      toast({
        title: 'Message too long',
        description: `Messages cannot exceed ${MESSAGE_LIMITS.MAX_MESSAGE_LENGTH} characters`,
        variant: 'destructive',
      });
      return;
    }

    setMessage(value);

    // Typing indicator logic
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTypingChange?.(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingChange?.(false);
    }, MESSAGE_LIMITS.TYPING_TIMEOUT);
  }, [isTyping, onTypingChange, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    // Check attachment limit
    if (attachments.length + files.length > MESSAGE_LIMITS.MAX_ATTACHMENTS) {
      toast({
        title: 'Too many attachments',
        description: ERROR_MESSAGES.MAX_ATTACHMENTS_EXCEEDED,
        variant: 'destructive',
      });
      return;
    }

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > MESSAGE_LIMITS.MAX_ATTACHMENT_SIZE) {
        toast({
          title: 'File too large',
          description: ERROR_MESSAGES.FILE_TOO_LARGE,
          variant: 'destructive',
        });
        continue;
      }

      // Check file type
      if (!isSupportedFileType(file)) {
        toast({
          title: 'Unsupported file type',
          description: ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE,
          variant: 'destructive',
        });
        continue;
      }

      const attachment: Attachment = {
        id: generateTempId(),
        file,
        type: isImageFile(file) ? 'image' : 'file',
      };

      if (attachment.type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => prev.map(a =>
            a.id === attachment.id ? { ...a, preview: e.target?.result as string } : a
          ));
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  }, [attachments.length, toast]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAttachmentProgress = useCallback((id: string, progress: number) => {
    setAttachments(prev => prev.map(a =>
      a.id === id ? { ...a, uploadProgress: progress } : a
    ));
  }, []);

  const sendMessage = useCallback(async () => {
    if ((!message.trim() && attachments.length === 0) || !user || sending || disabled) {
      return;
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit('MESSAGES');
    if (!rateLimitResult.allowed) {
      toast({
        title: 'Slow down',
        description: rateLimitResult.message || ERROR_MESSAGES.RATE_LIMITED,
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      // Check URLs for safety before sending
      const urlsInMessage = extractUrlsFromText(message);
      if (urlsInMessage.length > 0) {
        // URL safety check implementation would go here
        // For now, we'll proceed without blocking
      }

      // Upload attachments with progress tracking
      const attachmentUrls: string[] = [];
      for (const attachment of attachments) {
        try {
          const url = await messagingService.uploadAttachment(
            attachment,
            conversationId,
            (progress) => updateAttachmentProgress(attachment.id, progress)
          );
          if (url) {
            attachmentUrls.push(url);
          }
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${attachment.file.name}`,
            variant: 'destructive',
          });
        }
      }

      // Send message via service
      await messagingService.sendMessage(
        conversationId,
        user.id,
        message.trim(),
        attachmentUrls
      );

      // Clear input and attachments
      setMessage('');
      setAttachments([]);
      setIsTyping(false);
      onTypingChange?.(false);
      onMessageSent?.();

      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully',
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: ERROR_MESSAGES.SEND_FAILED,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }, [
    message,
    attachments,
    user,
    sending,
    disabled,
    conversationId,
    checkRateLimit,
    onTypingChange,
    onMessageSent,
    updateAttachmentProgress,
    toast
  ]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const addEmoji = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // Close emoji picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Attachments preview using shared component */}
      <AttachmentPreview
        attachments={attachments}
        onRemove={removeAttachment}
      />

      {/* Input area */}
      <div className="relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-full left-0 mb-2 bg-popover border rounded-lg shadow-lg p-3 z-10"
          >
            <div className="grid grid-cols-8 gap-1 max-w-[200px]">
              {COMMON_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addEmoji(emoji)}
                  className="w-6 h-6 flex items-center justify-center text-sm hover:bg-accent rounded transition-colors"
                  title={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || disabled}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={sending || disabled}
              className="pr-10"
              maxLength={MESSAGE_LIMITS.MAX_MESSAGE_LENGTH}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={sending || disabled}
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={sendMessage}
            disabled={(!message.trim() && attachments.length === 0) || sending || disabled}
            size="sm"
            title="Send message"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';