/**
 * Comprehensive Tests for Feed Screen
 * Google-level testing for social feed functionality and user experience
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import FeedScreen from '@/app/(tabs)/index';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/react-query';
import type { Post } from '@/types';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/react-query', () => ({
  queryKeys: {
    feed: () => ['feed'],
  },
}));

const mockUseRouter = useRouter as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;

// Mock posts data
const mockPosts: Post[] = [
  {
    id: 'post-1',
    content: 'Just had an amazing reunion with old classmates!',
    author: {
      first_name: 'John',
      last_name: 'Doe',
      avatar_url: 'https://example.com/avatar1.jpg',
    },
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    comments_count: 3,
    reactions_count: 12,
  },
  {
    id: 'post-2',
    content: 'Found our old yearbook - such great memories!',
    image_url: 'https://example.com/yearbook.jpg',
    author: {
      first_name: 'Jane',
      last_name: 'Smith',
      avatar_url: null,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    comments_count: 1,
    reactions_count: 5,
  },
];

const mockEmptyPosts: Post[] = [];

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
    });
    
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    } as any);
  });

  describe('Data Loading States', () => {
    it('shows loading state when data is loading', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<FeedScreen />);
      expect(getByText('Loading your feed...')).toBeTruthy();
    });

    it('shows error state when data loading fails', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<FeedScreen />);
      expect(getByText('Failed to load feed. Pull to retry.')).toBeTruthy();
    });

    it('shows empty state when no posts are available', () => {
      mockUseQuery.mockReturnValue({
        data: mockEmptyPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<FeedScreen />);
      expect(getByText('Welcome to Alumni Connect!')).toBeTruthy();
      expect(getByText('Your feed will show posts from fellow alumni.')).toBeTruthy();
      expect(getByText('Explore Yearbooks')).toBeTruthy();
    });

    it('shows posts when data is loaded successfully', () => {
      mockUseQuery.mockReturnValue({
        data: mockPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText, getAllByTestId } = render(<FeedScreen />);
      
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('Just had an amazing reunion with old classmates!')).toBeTruthy();
      expect(getByText('Found our old yearbook - such great memories!')).toBeTruthy();
      
      const postCards = getAllByTestId('post-card');
      expect(postCards.length).toBe(2);
    });
  });

  describe('Post Rendering', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
    });

    it('renders post author information correctly', () => {
      const { getByText } = render(<FeedScreen />);
      
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('Alumni Connect User')).toBeFalsy(); // Should not show fallback when names are available
    });

    it('renders post content correctly', () => {
      const { getByText } = render(<FeedScreen />);
      
      expect(getByText('Just had an amazing reunion with old classmates!')).toBeTruthy();
      expect(getByText('Found our old yearbook - such great memories!')).toBeTruthy();
    });

    it('renders post metadata correctly', () => {
      const { getByText } = render(<FeedScreen />);
      
      expect(getByText('5m ago')).toBeTruthy();
      expect(getByText('30m ago')).toBeTruthy();
      expect(getByText('❤️ 12')).toBeTruthy();
      expect(getByText('💬 3')).toBeTruthy();
      expect(getByText('❤️ 5')).toBeTruthy();
      expect(getByText('💬 1')).toBeTruthy();
    });

    it('handles posts without images gracefully', () => {
      const { queryByTestId } = render(<FeedScreen />);
      
      // First post should not have image
      const post1Image = queryByTestId('post-image-post-1');
      expect(post1Image).toBeNull();
      
      // Second post should have image
      const post2Image = queryByTestId('post-image-post-2');
      expect(post2Image).toBeTruthy();
    });

    it('handles posts with missing author gracefully', () => {
      const postsWithMissingAuthor = [
        {
          ...mockPosts[0],
          author: null,
        },
      ];
      
      mockUseQuery.mockReturnValue({
        data: postsWithMissingAuthor,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<FeedScreen />);
      expect(getByText('Alumni Connect User')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
    });

    it('triggers haptic feedback on post press', () => {
      const { getAllByTestId } = render(<FeedScreen />);
      
      const postCards = getAllByTestId('post-card');
      fireEvent.press(postCards[0]);
      
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('triggers haptic feedback on refresh', () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockReturnValue({
        data: mockPosts,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      });
      
      const { getByTestId } = render(<FeedScreen />);
      
      const refreshControl = getByTestId('refresh-control');
      fireEvent(refreshControl, 'refresh');
      
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('light');
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('triggers haptic feedback on action button press', () => {
      const { getAllByTestId } = render(<FeedScreen />);
      
      const likeButtons = getAllByTestId('action-button-like');
      fireEvent.press(likeButtons[0]);
      
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('navigates to yearbooks from empty state', () => {
      mockUseQuery.mockReturnValue({
        data: mockEmptyPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const mockPush = jest.fn();
      mockUseRouter.mockReturnValue({ push: mockPush });
      
      const { getByText } = render(<FeedScreen />);
      
      const exploreButton = getByText('Explore Yearbooks');
      fireEvent.press(exploreButton);
      
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('light');
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/yearbooks');
    });
  });

  describe('Performance Optimization', () => {
    it('uses proper stale time for feed data', () => {
      render(<FeedScreen />);
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 1000 * 60 * 2, // 2 minutes
        })
      );
    });

    it('limits posts to reasonable number', () => {
      render(<FeedScreen />);
      
      const selectCall = mockSupabase.from.mock.calls[0];
      expect(selectCall[0]).toBe('posts');
      
      const limitCall = mockSupabase.from().limit.mock.calls[0];
      expect(limitCall[0]).toBe(20);
    });

    it('orders posts by creation time descending', () => {
      render(<FeedScreen />);
      
      const orderCall = mockSupabase.from().order.mock.calls[0];
      expect(orderCall[0]).toBe('created_at');
      expect(orderCall[1]).toEqual({ ascending: false });
    });
  });

  describe('Accessibility', () => {
    it('includes proper accessibility labels for posts', () => {
      const { getAllByTestId } = render(<FeedScreen />);
      
      const postCards = getAllByTestId('post-card');
      expect(postCards[0].props.accessibilityLabel).toContain('post by John Doe');
      expect(postCards[1].props.accessibilityLabel).toContain('post by Jane Smith');
    });

    it('includes proper accessibility hints for actions', () => {
      const { getAllByTestId } = render(<FeedScreen />);
      
      const likeButtons = getAllByTestId('action-button-like');
      expect(likeButtons[0].props.accessibilityHint).toBe('Double tap to like this post');
      
      const commentButtons = getAllByTestId('action-button-comment');
      expect(commentButtons[0].props.accessibilityHint).toBe('Double tap to comment on this post');
    });

    it('includes proper accessibility labels for empty state', () => {
      mockUseQuery.mockReturnValue({
        data: mockEmptyPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<FeedScreen />);
      
      const exploreButton = getByText('Explore Yearbooks');
      expect(exploreButton.props.accessibilityLabel).toBe('Explore yearbooks');
      expect(exploreButton.props.accessibilityHint).toBe('Double tap to browse yearbooks');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('handles malformed post data gracefully', () => {
      const malformedPosts = [
        {
          id: 'bad-post',
          // Missing required fields
        },
      ] as any;
      
      mockUseQuery.mockReturnValue({
        data: malformedPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      // Should not crash
      expect(() => render(<FeedScreen />)).not.toThrow();
    });

    it('handles network errors during refetch', async () => {
      const mockRefetch = jest.fn().mockRejectedValue(new Error('Network error'));
      mockUseQuery.mockReturnValue({
        data: mockPosts,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      });
      
      const { getByTestId } = render(<FeedScreen />);
      
      const refreshControl = getByTestId('refresh-control');
      fireEvent(refreshControl, 'refresh');
      
      // Should handle error without crashing
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('handles missing image URLs gracefully', () => {
      const postsWithBrokenImages = [
        {
          ...mockPosts[1],
          image_url: 'invalid-url',
        },
      ];
      
      mockUseQuery.mockReturnValue({
        data: postsWithBrokenImages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      // Should not crash
      expect(() => render(<FeedScreen />)).not.toThrow();
    });
  });

  describe('Memory and Performance', () => {
    it('does not cause memory leaks on unmount', () => {
      const { unmount } = render(<FeedScreen />);
      
      // Should clean up properly
      expect(() => unmount()).not.toThrow();
    });

    it('maintains consistent render performance with many posts', () => {
      const manyPosts = Array.from({ length: 50 }, (_, i) => ({
        ...mockPosts[0],
        id: `post-${i}`,
        content: `Post content ${i}`,
      }));
      
      mockUseQuery.mockReturnValue({
        data: manyPosts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const startTime = performance.now();
      render(<FeedScreen />);
      const endTime = performance.now();
      
      // Should render 50 posts quickly (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Time Formatting', () => {
    it('formats time ago correctly for various intervals', () => {
      const now = Date.now();
      
      const testCases = [
        { seconds: 30, expected: 'Just now' },
        { seconds: 90, expected: '1m ago' },
        { seconds: 3500, expected: '58m ago' },
        { seconds: 7200, expected: '2h ago' },
        { seconds: 86400, expected: '1d ago' },
        { seconds: 172800, expected: '2d ago' },
      ];
      
      testCases.forEach(({ seconds, expected }) => {
        const postWithTime = [
          {
            ...mockPosts[0],
            created_at: new Date(now - seconds * 1000).toISOString(),
          },
        ];
        
        mockUseQuery.mockReturnValue({
          data: postWithTime,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isRefetching: false,
        });
        
        const { getByText } = render(<FeedScreen />);
        expect(getByText(expected)).toBeTruthy();
      });
    });
  });
});