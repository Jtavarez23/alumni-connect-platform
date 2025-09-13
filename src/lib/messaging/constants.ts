// Messaging system constants
export const MESSAGE_LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS: 5,
  TYPING_TIMEOUT: 1000, // 1 second
  MESSAGE_BATCH_SIZE: 50,
  VIRTUAL_SCROLL_THRESHOLD: 100,
} as const;

export const UI_CONSTANTS = {
  AVATAR_SIZE: {
    small: 'h-8 w-8',
    medium: 'h-10 w-10',
    large: 'h-12 w-12',
  },
  TOUCH_TARGET_SIZE: 44, // Minimum touch target size in px
  ANIMATION_DURATION: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
} as const;

export const SUBSCRIPTION_CHANNELS = {
  MESSAGES: (conversationId: string) => `messages:${conversationId}`,
  TYPING: (conversationId: string) => `typing:${conversationId}`,
  CONVERSATIONS: 'conversations',
  PRESENCE: (conversationId: string) => `presence:${conversationId}`,
} as const;

export const MESSAGE_STATUSES = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

export const ATTACHMENT_TYPES = {
  IMAGE: 'image',
  FILE: 'file',
} as const;

export const SUPPORTED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
} as const;

export const ERROR_MESSAGES = {
  LOAD_FAILED: 'Failed to load messages',
  SEND_FAILED: 'Failed to send message',
  UPLOAD_FAILED: 'Failed to upload attachment',
  CONNECTION_FAILED: 'Connection failed',
  PERMISSION_DENIED: 'Permission denied',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
  MAX_ATTACHMENTS_EXCEEDED: 'Maximum 5 attachments allowed',
} as const;

export const COMMON_EMOJIS = [
  '😊', '😂', '❤️', '👍', '👎', '🎉', '🔥', '💯',
  '🤔', '😍', '😭', '👀', '✨', '🙌', '💪', '🎯',
  '🤝', '🎓', '📚', '✅', '❗', '💡', '⭐', '🚀'
] as const;