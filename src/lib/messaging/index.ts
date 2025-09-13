// Export all messaging-related types, constants, and utilities
export * from './types';
export * from './constants';
export * from './utils';
export * from './service';

// Re-export commonly used items for convenience
export {
  MESSAGE_LIMITS,
  UI_CONSTANTS,
  ERROR_MESSAGES,
  COMMON_EMOJIS,
} from './constants';

export {
  getInitials,
  formatMessageTime,
  formatConversationDate,
  getDisplayName,
  isSupportedFileType,
  isImageFile,
  generateTempId,
  shouldGroupMessages,
} from './utils';

export {
  messagingService,
} from './service';