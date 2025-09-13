import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Send, Paperclip, Image, X, Smile } from 'lucide-react';
import { useRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';
import { extractUrlsFromText } from '@/hooks/useLinkSafety';

interface MessageInputProps {
  conversationId: string;
  onTypingChange?: (isTyping: boolean) => void;
}

interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'file';
  preview?: string;
}

export function MessageInput({ conversationId, onTypingChange }: MessageInputProps) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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
    }, 1000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        continue;
      }

      const attachment: Attachment = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: file.type.startsWith('image/') ? 'image' : 'file',
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
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const uploadAttachment = async (attachment: Attachment): Promise<string | null> => {
    try {
      const fileExt = attachment.file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `message-attachments/${conversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, attachment.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload attachment",
        variant: "destructive",
      });
      return null;
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !user || sending) return;

    // Rate limiting check using comprehensive system
    const rateLimitResult = await checkRateLimit('MESSAGES');
    if (!rateLimitResult.allowed) {
      toast({
        title: "Slow down",
        description: rateLimitResult.message || "Please wait a moment before sending another message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      // Check URLs for safety before sending
      const urlsInMessage = extractUrlsFromText(message);
      if (urlsInMessage.length > 0) {
        const { data: safetyCheck, error: safetyError } = await supabase.rpc('check_urls_safe', {
          p_urls: urlsInMessage
        });
        
        if (!safetyError && safetyCheck) {
          const unsafeUrls = safetyCheck.filter((result: any) => !result.is_safe);
          if (unsafeUrls.length > 0) {
            toast({
              title: "Unsafe content detected",
              description: "Your message contains links that may be unsafe. Please remove them before sending.",
              variant: "destructive",
            });
            setSending(false);
            return;
          }
        }
      }

      // Upload attachments
      const attachmentUrls: string[] = [];
      for (const attachment of attachments) {
        const url = await uploadAttachment(attachment);
        if (url) {
          attachmentUrls.push(url);
        }
      }

      // Send message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: message.trim(),
          media: attachmentUrls.length > 0 ? { urls: attachmentUrls } : null,
        });

      if (error) throw error;

      // Clear input and attachments
      setMessage('');
      setAttachments([]);
      setIsTyping(false);
      onTypingChange?.(false);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Simple emoji picker with common emojis
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '🎉', '🔥', '💯', '🤔', '😍', '😭', '👀', '✨', '🙌', '💪', '🎯'];

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
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="relative">
              {attachment.type === 'image' && attachment.preview ? (
                <div className="relative">
                  <img
                    src={attachment.preview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative bg-muted rounded border p-2 text-xs">
                  <Paperclip className="h-3 w-3 mb-1" />
                  <div className="truncate max-w-[60px]">
                    {attachment.file.name}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="absolute bottom-full left-0 mb-2 bg-popover border rounded-lg shadow-lg p-3 z-10"
          >
            <div className="grid grid-cols-8 gap-1 max-w-[200px]">
              {commonEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addEmoji(emoji)}
                  className="w-6 h-6 flex items-center justify-center text-sm hover:bg-accent rounded transition-colors"
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
            disabled={sending}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sending}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={sending}
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={sendMessage}
            disabled={(!message.trim() && attachments.length === 0) || sending}
            size="sm"
            title="Send message"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}