/**
 * React Query Configuration for Alumni Connect Mobile
 * Optimized for mobile performance with intelligent caching
 */

import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

/**
 * Enhanced QueryClient for mobile with background/foreground handling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile-optimized defaults
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Limit retries on mobile to preserve battery
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetch but be conservative on mobile
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
    },
    mutations: {
      retry: 1, // Single retry for mutations
      retryDelay: 1000,
    },
  },
});

/**
 * Focus Manager Integration for React Native
 * Manages query refetching based on app state
 */
class ReactNativeFocusManager {
  private removeListener?: () => void;

  constructor() {
    this.setupFocusManager();
  }

  private setupFocusManager() {
    const handleAppStateChange = (status: AppStateStatus) => {
      // When app becomes active, enable refetching
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    };

    this.removeListener = AppState.addEventListener('change', handleAppStateChange).remove;
    
    // Set initial focus state
    focusManager.setFocused(AppState.currentState === 'active');
  }

  public cleanup() {
    this.removeListener?.();
  }
}

// Initialize focus manager
let focusManagerInstance: ReactNativeFocusManager | null = null;

export const initializeFocusManager = () => {
  if (!focusManagerInstance) {
    focusManagerInstance = new ReactNativeFocusManager();
  }
  return focusManagerInstance;
};

export const cleanupFocusManager = () => {
  if (focusManagerInstance) {
    focusManagerInstance.cleanup();
    focusManagerInstance = null;
  }
};

/**
 * Mobile-specific query keys factory
 * Consistent with web app but with mobile context
 */
export const queryKeys = {
  // User & Profile
  profile: (userId?: string) => ['profile', userId] as const,
  currentUser: () => ['profile', 'current'] as const,
  
  // Yearbooks
  yearbooks: () => ['yearbooks'] as const,
  yearbook: (yearbookId: string) => ['yearbooks', yearbookId] as const,
  yearbookPages: (yearbookId: string) => ['yearbooks', yearbookId, 'pages'] as const,
  
  // Social Feed
  feed: () => ['feed'] as const,
  feedPage: (page: number) => ['feed', 'page', page] as const,
  post: (postId: string) => ['posts', postId] as const,
  
  // Network & Friends
  network: () => ['network'] as const,
  friends: () => ['friends'] as const,
  friendRequests: () => ['friend-requests'] as const,
  
  // Events
  events: () => ['events'] as const,
  event: (eventId: string) => ['events', eventId] as const,
  userEvents: () => ['events', 'user'] as const,
  
  // Messages
  messages: () => ['messages'] as const,
  messageThread: (threadId: string) => ['messages', threadId] as const,
  
  // Business Directory  
  businesses: () => ['businesses'] as const,
  business: (businessId: string) => ['businesses', businessId] as const,
  
  // Premium Features
  subscription: () => ['subscription'] as const,
  alumniPerks: () => ['alumni-perks'] as const,
} as const;

/**
 * Optimized query helpers for mobile
 */
export const queryHelpers = {
  /**
   * Prefetch critical data for offline capability
   */
  prefetchEssentials: async () => {
    const promises = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.currentUser(),
        staleTime: 1000 * 60 * 30, // 30 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.feed(),
        staleTime: 1000 * 60 * 10, // 10 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.network(),
        staleTime: 1000 * 60 * 15, // 15 minutes
      }),
    ];

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  },

  /**
   * Clear sensitive data on logout
   */
  clearUserData: () => {
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return ['profile', 'feed', 'messages', 'friends', 'subscription'].includes(key as string);
      },
    });
  },

  /**
   * Invalidate data that needs refresh
   */
  refreshCriticalData: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
    queryClient.invalidateQueries({ queryKey: queryKeys.messages() });
  },
};

export default queryClient;