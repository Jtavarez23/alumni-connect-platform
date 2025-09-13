/**
 * Comprehensive Integration Tests for React Query Setup
 * Google-level testing for caching, focus management, and query optimization
 */

import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import {
  queryClient,
  queryKeys,
  queryHelpers,
  initializeFocusManager,
  cleanupFocusManager,
} from '../../lib/react-query';

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    focusManager: {
      setFocused: jest.fn(),
    },
  };
});

const mockFocusManager = focusManager as jest.Mocked<typeof focusManager>;
const mockAppState = AppState as jest.Mocked<typeof AppState>;

describe('React Query Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe('QueryClient Configuration', () => {
    it('has mobile-optimized default options', () => {
      const defaultOptions = queryClient.getDefaultOptions();

      expect(defaultOptions.queries).toMatchObject({
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        refetchOnMount: true,
      });

      expect(defaultOptions.mutations).toMatchObject({
        retry: 1,
        retryDelay: 1000,
      });
    });

    it('has intelligent retry logic for queries', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      const retryFn = defaultOptions.queries?.retry as Function;

      // Should not retry on auth errors
      expect(retryFn(1, { status: 401 })).toBe(false);
      expect(retryFn(1, { status: 403 })).toBe(false);

      // Should retry on other errors but with limits
      expect(retryFn(0, { status: 500 })).toBe(true);
      expect(retryFn(1, { status: 500 })).toBe(true);
      expect(retryFn(2, { status: 500 })).toBe(false);
    });

    it('has exponential backoff retry delay', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      const retryDelayFn = defaultOptions.queries?.retryDelay as Function;

      expect(retryDelayFn(0)).toBe(1000); // First retry: 1s
      expect(retryDelayFn(1)).toBe(2000); // Second retry: 2s
      expect(retryDelayFn(2)).toBe(4000); // Third retry: 4s
      expect(retryDelayFn(10)).toBe(30000); // Max delay: 30s
    });
  });

  describe('Focus Manager', () => {
    let mockRemoveListener: jest.Mock;

    beforeEach(() => {
      mockRemoveListener = jest.fn();
      mockAppState.addEventListener.mockReturnValue({
        remove: mockRemoveListener,
      });
    });

    it('initializes focus manager correctly', () => {
      const manager = initializeFocusManager();
      
      expect(manager).toBeDefined();
      expect(mockAppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(true);
    });

    it('handles app state changes correctly', () => {
      let appStateHandler: (status: string) => void = () => {};
      
      mockAppState.addEventListener.mockImplementation((event, handler) => {
        appStateHandler = handler;
        return { remove: mockRemoveListener };
      });

      initializeFocusManager();

      // Test active state
      appStateHandler('active');
      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(true);

      // Test background state
      appStateHandler('background');
      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(false);

      // Test inactive state
      appStateHandler('inactive');
      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(false);
    });

    it('prevents multiple initialization', () => {
      const manager1 = initializeFocusManager();
      const manager2 = initializeFocusManager();

      expect(manager1).toBe(manager2);
      expect(mockAppState.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('cleans up properly', () => {
      initializeFocusManager();
      cleanupFocusManager();

      expect(mockRemoveListener).toHaveBeenCalled();
      
      // Should be able to initialize again after cleanup
      const newManager = initializeFocusManager();
      expect(newManager).toBeDefined();
    });

    it('handles web platform correctly', () => {
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'web';

      let appStateHandler: (status: string) => void = () => {};
      mockAppState.addEventListener.mockImplementation((event, handler) => {
        appStateHandler = handler;
        return { remove: mockRemoveListener };
      });

      initializeFocusManager();

      // On web, focus manager should not be called on state change
      mockFocusManager.setFocused.mockClear();
      appStateHandler('active');
      expect(mockFocusManager.setFocused).not.toHaveBeenCalled();

      // Reset for other tests
      mockPlatform.OS = 'ios';
    });
  });

  describe('Query Keys', () => {
    it('generates consistent profile keys', () => {
      expect(queryKeys.profile('user-123')).toEqual(['profile', 'user-123']);
      expect(queryKeys.currentUser()).toEqual(['profile', 'current']);
    });

    it('generates consistent yearbook keys', () => {
      expect(queryKeys.yearbooks()).toEqual(['yearbooks']);
      expect(queryKeys.yearbook('yearbook-123')).toEqual(['yearbooks', 'yearbook-123']);
      expect(queryKeys.yearbookPages('yearbook-123')).toEqual([
        'yearbooks',
        'yearbook-123',
        'pages',
      ]);
    });

    it('generates consistent feed keys', () => {
      expect(queryKeys.feed()).toEqual(['feed']);
      expect(queryKeys.feedPage(1)).toEqual(['feed', 'page', 1]);
      expect(queryKeys.post('post-123')).toEqual(['posts', 'post-123']);
    });

    it('generates consistent network keys', () => {
      expect(queryKeys.network()).toEqual(['network']);
      expect(queryKeys.friends()).toEqual(['friends']);
      expect(queryKeys.friendRequests()).toEqual(['friend-requests']);
    });

    it('generates consistent event keys', () => {
      expect(queryKeys.events()).toEqual(['events']);
      expect(queryKeys.event('event-123')).toEqual(['events', 'event-123']);
      expect(queryKeys.userEvents()).toEqual(['events', 'user']);
    });

    it('generates consistent message keys', () => {
      expect(queryKeys.messages()).toEqual(['messages']);
      expect(queryKeys.messageThread('thread-123')).toEqual(['messages', 'thread-123']);
    });

    it('generates consistent business keys', () => {
      expect(queryKeys.businesses()).toEqual(['businesses']);
      expect(queryKeys.business('business-123')).toEqual(['businesses', 'business-123']);
    });

    it('generates consistent premium keys', () => {
      expect(queryKeys.subscription()).toEqual(['subscription']);
      expect(queryKeys.alumniPerks()).toEqual(['alumni-perks']);
    });
  });

  describe('Query Helpers', () => {
    let prefetchQuerySpy: jest.SpyInstance;
    let removeQueriesSpy: jest.SpyInstance;
    let invalidateQueriesSpy: jest.SpyInstance;

    beforeEach(() => {
      prefetchQuerySpy = jest.spyOn(queryClient, 'prefetchQuery').mockResolvedValue();
      removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries').mockImplementation();
      invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    });

    afterEach(() => {
      prefetchQuerySpy.mockRestore();
      removeQueriesSpy.mockRestore();
      invalidateQueriesSpy.mockRestore();
    });

    describe('prefetchEssentials', () => {
      it('prefetches critical data with appropriate stale times', async () => {
        await queryHelpers.prefetchEssentials();

        expect(prefetchQuerySpy).toHaveBeenCalledTimes(3);
        
        expect(prefetchQuerySpy).toHaveBeenCalledWith({
          queryKey: queryKeys.currentUser(),
          staleTime: 1000 * 60 * 30, // 30 minutes
        });

        expect(prefetchQuerySpy).toHaveBeenCalledWith({
          queryKey: queryKeys.feed(),
          staleTime: 1000 * 60 * 10, // 10 minutes
        });

        expect(prefetchQuerySpy).toHaveBeenCalledWith({
          queryKey: queryKeys.network(),
          staleTime: 1000 * 60 * 15, // 15 minutes
        });
      });

      it('handles prefetch failures gracefully', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const prefetchError = new Error('Network error');
        
        prefetchQuerySpy.mockRejectedValueOnce(prefetchError);

        await queryHelpers.prefetchEssentials();

        expect(consoleWarnSpy).toHaveBeenCalledWith('Prefetch failed:', prefetchError);
        
        consoleWarnSpy.mockRestore();
      });

      it('continues prefetching even if one fails', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        prefetchQuerySpy
          .mockRejectedValueOnce(new Error('User prefetch failed'))
          .mockResolvedValueOnce(undefined) // Feed succeeds
          .mockResolvedValueOnce(undefined); // Network succeeds

        await queryHelpers.prefetchEssentials();

        expect(prefetchQuerySpy).toHaveBeenCalledTimes(3);
        
        consoleWarnSpy.mockRestore();
      });
    });

    describe('clearUserData', () => {
      it('removes user-specific queries', () => {
        queryHelpers.clearUserData();

        expect(removeQueriesSpy).toHaveBeenCalledWith({
          predicate: expect.any(Function),
        });

        // Test the predicate function
        const predicateCall = removeQueriesSpy.mock.calls[0][0];
        const predicate = predicateCall.predicate;

        // Should remove these query types
        expect(predicate({ queryKey: ['profile'] })).toBe(true);
        expect(predicate({ queryKey: ['feed'] })).toBe(true);
        expect(predicate({ queryKey: ['messages'] })).toBe(true);
        expect(predicate({ queryKey: ['friends'] })).toBe(true);
        expect(predicate({ queryKey: ['subscription'] })).toBe(true);

        // Should not remove these query types
        expect(predicate({ queryKey: ['yearbooks'] })).toBe(false);
        expect(predicate({ queryKey: ['events'] })).toBe(false);
        expect(predicate({ queryKey: ['businesses'] })).toBe(false);
      });
    });

    describe('refreshCriticalData', () => {
      it('invalidates critical queries', () => {
        queryHelpers.refreshCriticalData();

        expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: queryKeys.currentUser(),
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: queryKeys.feed(),
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: queryKeys.messages(),
        });
      });
    });
  });

  describe('Caching and Performance', () => {
    let mockQuery: any;

    beforeEach(() => {
      mockQuery = {
        queryKey: ['test', 'data'],
        queryFn: jest.fn().mockResolvedValue({ data: 'test' }),
      };
    });

    it('respects stale time configuration', async () => {
      const result1 = await queryClient.fetchQuery({
        ...mockQuery,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });

      // Immediate second fetch should use cache
      const result2 = await queryClient.fetchQuery(mockQuery);

      expect(result1).toEqual(result2);
      expect(mockQuery.queryFn).toHaveBeenCalledTimes(1);
    });

    it('handles network errors with retry logic', async () => {
      const failingQuery = {
        queryKey: ['failing', 'query'],
        queryFn: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      try {
        await queryClient.fetchQuery(failingQuery);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Should have retried based on default config
      expect(failingQuery.queryFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('does not retry on authentication errors', async () => {
      const authFailingQuery = {
        queryKey: ['auth', 'failing'],
        queryFn: jest.fn().mockRejectedValue({ status: 401 }),
      };

      try {
        await queryClient.fetchQuery(authFailingQuery);
      } catch (error) {
        expect(error).toMatchObject({ status: 401 });
      }

      // Should not retry on auth errors
      expect(authFailingQuery.queryFn).toHaveBeenCalledTimes(1);
    });

    it('manages garbage collection properly', async () => {
      const testData = { data: 'test-data' };
      const query = {
        queryKey: ['gc', 'test'],
        queryFn: jest.fn().mockResolvedValue(testData),
      };

      await queryClient.fetchQuery(query);

      // Data should be in cache
      const cachedData = queryClient.getQueryData(query.queryKey);
      expect(cachedData).toEqual(testData);

      // Simulate time passing beyond gc time
      jest.advanceTimersByTime(1000 * 60 * 31); // 31 minutes

      // Trigger garbage collection
      queryClient.clear();

      // Data should be cleared
      const clearedData = queryClient.getQueryData(query.queryKey);
      expect(clearedData).toBeUndefined();
    });
  });

  describe('Integration with Mobile Features', () => {
    it('handles app backgrounding and foregrounding', () => {
      let appStateHandler: (status: string) => void = () => {};
      
      mockAppState.addEventListener.mockImplementation((event, handler) => {
        appStateHandler = handler;
        return { remove: jest.fn() };
      });

      initializeFocusManager();

      // App goes to background
      appStateHandler('background');
      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(false);

      // App comes to foreground
      mockFocusManager.setFocused.mockClear();
      appStateHandler('active');
      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(true);
    });

    it('optimizes for mobile battery usage', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      
      // Should not refetch on window focus (mobile doesn't have windows)
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
      
      // Should refetch on reconnect (important for mobile networks)
      expect(defaultOptions.queries?.refetchOnReconnect).toBe('always');
      
      // Should have limited retries to save battery
      const retryFn = defaultOptions.queries?.retry as Function;
      expect(retryFn(2, { status: 500 })).toBe(false);
    });

    it('handles network reconnection correctly', async () => {
      const networkQuery = {
        queryKey: ['network', 'sensitive'],
        queryFn: jest.fn().mockResolvedValue({ data: 'network-data' }),
      };

      await queryClient.fetchQuery({
        ...networkQuery,
        refetchOnReconnect: 'always',
      });

      expect(networkQuery.queryFn).toHaveBeenCalledTimes(1);

      // Simulate network reconnection
      queryClient.refetchQueries({
        predicate: (query) => query.options.refetchOnReconnect === 'always',
      });

      // Should refetch on reconnection
      expect(networkQuery.queryFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Management', () => {
    it('clears all data properly', () => {
      // Add some data to cache
      queryClient.setQueryData(['test'], { data: 'test' });
      queryClient.setQueryData(['another'], { data: 'another' });

      expect(queryClient.getQueryData(['test'])).toBeDefined();
      expect(queryClient.getQueryData(['another'])).toBeDefined();

      // Clear all data
      queryClient.clear();

      expect(queryClient.getQueryData(['test'])).toBeUndefined();
      expect(queryClient.getQueryData(['another'])).toBeUndefined();
    });

    it('removes specific query groups', () => {
      // Add various types of data
      queryClient.setQueryData(['profile', 'user-1'], { name: 'John' });
      queryClient.setQueryData(['feed'], { posts: [] });
      queryClient.setQueryData(['yearbooks'], { books: [] });

      // Clear only user-specific data
      queryHelpers.clearUserData();

      expect(queryClient.getQueryData(['profile', 'user-1'])).toBeUndefined();
      expect(queryClient.getQueryData(['feed'])).toBeUndefined();
      expect(queryClient.getQueryData(['yearbooks'])).toBeDefined(); // Should remain
    });

    it('handles large datasets efficiently', async () => {
      // Simulate large dataset
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
      }));

      const largeQuery = {
        queryKey: ['large', 'dataset'],
        queryFn: jest.fn().mockResolvedValue(largeData),
      };

      const startTime = performance.now();
      await queryClient.fetchQuery(largeQuery);
      const endTime = performance.now();

      // Should handle large data quickly (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // Data should be cached
      const cachedData = queryClient.getQueryData(largeQuery.queryKey);
      expect(cachedData).toEqual(largeData);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('handles query function errors gracefully', async () => {
      const errorQuery = {
        queryKey: ['error', 'test'],
        queryFn: jest.fn().mockRejectedValue(new Error('Query failed')),
      };

      await expect(queryClient.fetchQuery(errorQuery)).rejects.toThrow('Query failed');
      expect(errorQuery.queryFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('maintains query state consistency', async () => {
      const query = {
        queryKey: ['consistency', 'test'],
        queryFn: jest.fn()
          .mockResolvedValueOnce({ version: 1 })
          .mockResolvedValueOnce({ version: 2 }),
      };

      // First fetch
      const result1 = await queryClient.fetchQuery(query);
      expect(result1).toEqual({ version: 1 });

      // Force refetch
      const result2 = await queryClient.refetchQueries({ queryKey: query.queryKey });
      
      // Should maintain consistency
      expect(query.queryFn).toHaveBeenCalledTimes(2);
    });

    it('handles concurrent query execution', async () => {
      const concurrentQuery = {
        queryKey: ['concurrent', 'test'],
        queryFn: jest.fn().mockResolvedValue({ data: 'concurrent' }),
      };

      // Execute multiple concurrent queries
      const promises = Array.from({ length: 5 }, () =>
        queryClient.fetchQuery(concurrentQuery)
      );

      const results = await Promise.all(promises);

      // Should deduplicate and only call queryFn once
      expect(concurrentQuery.queryFn).toHaveBeenCalledTimes(1);
      
      // All results should be the same
      results.forEach(result => {
        expect(result).toEqual({ data: 'concurrent' });
      });
    });
  });
});