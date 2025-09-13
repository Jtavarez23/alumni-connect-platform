// Shared messaging utilities
import { format, isToday, isYesterday } from 'date-fns';
import { UserProfile, Message } from './types';
import { SUPPORTED_FILE_TYPES } from './constants';

/**
 * Generate initials from user's name
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Format message timestamp for display
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMM d');
  }
}

/**
 * Format conversation date for display
 */
export function formatConversationDate(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return 'Today';
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMMM d, yyyy');
  }
}

/**
 * Get display name for user
 */
export function getDisplayName(user: UserProfile): string {
  return `${user.first_name} ${user.last_name}`.trim();
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  const supportedTypes = [
    ...SUPPORTED_FILE_TYPES.IMAGES,
    ...SUPPORTED_FILE_TYPES.DOCUMENTS
  ];
  return supportedTypes.includes(file.type);
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_FILE_TYPES.IMAGES.includes(file.type);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Generate unique ID for temporary items
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Group messages by date for display
 */
export function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: { [key: string]: Message[] } = {};

  messages.forEach(message => {
    const dateKey = formatConversationDate(message.created_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });

  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages
  }));
}

/**
 * Check if two messages should be grouped together (same sender, close in time)
 */
export function shouldGroupMessages(current: Message, previous: Message | null): boolean {
  if (!previous) return false;
  if (current.sender_id !== previous.sender_id) return false;

  const currentTime = new Date(current.created_at).getTime();
  const previousTime = new Date(previous.created_at).getTime();
  const timeDiff = currentTime - previousTime;

  // Group messages sent within 5 minutes of each other
  return timeDiff < 5 * 60 * 1000;
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Sanitize message text for display
 */
export function sanitizeMessageText(text: string): string {
  // Basic XSS prevention - strip HTML tags
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Check if user is online (based on last activity)
 */
export function isUserOnline(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;

  const now = Date.now();
  const lastActive = new Date(lastActiveAt).getTime();
  const fiveMinutesAgo = now - (5 * 60 * 1000);

  return lastActive > fiveMinutesAgo;
}

/**
 * Create optimistic message for immediate UI feedback
 */
export function createOptimisticMessage(
  text: string,
  senderId: string,
  conversationId: string,
  media?: { urls: string[] }
): Message {
  return {
    id: generateTempId(),
    conversation_id: conversationId,
    sender_id: senderId,
    text,
    media,
    created_at: new Date().toISOString(),
  };
}

/**
 * Calculate scroll position for auto-scroll behavior
 */
export function shouldAutoScroll(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  threshold: number = 100
): boolean {
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  return distanceFromBottom < threshold;
}