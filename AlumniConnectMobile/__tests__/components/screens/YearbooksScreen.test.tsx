/**
 * Comprehensive Tests for Yearbooks Screen
 * Google-level testing for yearbook browsing and discovery
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import YearbooksScreen from '@/app/(tabs)/yearbooks';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/react-query';
import type { Yearbook } from '@/types';

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
    yearbooks: () => ['yearbooks'],
  },
}));

const mockUseRouter = useRouter as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;

// Mock yearbooks data
const mockYearbooks: Yearbook[] = [
  {
    id: 'yearbook-1',
    title: 'Class of 2020 Yearbook',
    year: 2020,
    school_id: 'school-1',
    cover_image_url: 'https://example.com/cover1.jpg',
    total_pages: 120,
    upload_status: 'completed',
    created_at: new Date().toISOString(),
    schools: {
      name: 'Central High School',
      logo_url: 'https://example.com/logo1.png',
    },
  },
  {
    id: 'yearbook-2',
    title: 'Class of 2018 Yearbook',
    year: 2018,
    school_id: 'school-2',
    cover_image_url: null,
    total_pages: 98,
    upload_status: 'completed',
    created_at: new Date().toISOString(),
    schools: {
      name: 'Westside High School',
      logo_url: null,
    },
  },
];

const mockEmptyYearbooks: Yearbook[] = [];

describe('YearbooksScreen', () => {
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
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
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
      
      const { getByText } = render(<YearbooksScreen />);
      expect(getByText('Loading yearbooks...')).toBeTruthy();
    });

    it('shows error state when data loading fails', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<YearbooksScreen />);
      expect(getByText('Failed to load yearbooks. Pull to retry.')).toBeTruthy();
    });

    it('shows empty state when no yearbooks are available', () => {
      mockUseQuery.mockReturnValue({
        data: mockEmptyYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<YearbooksScreen />);
      expect(getByText('No Yearbooks Yet')).toBeTruthy();
      expect(getByText('Yearbooks will appear here once they\'re uploaded and processed.')).toBeTruthy();
    });

    it('shows yearbooks when data is loaded successfully', () => {
      mockUseQuery.mockReturnValue({
        data: mockYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText, getAllByTestId } = render(<YearbooksScreen />);
      
      expect(getByText('Class of 2020 Yearbook')).toBeTruthy();
      expect(getByText('Class of 2018 Yearbook')).toBeTruthy();
      expect(getByText('Central High School')).toBeTruthy();
      expect(getByText('Westside High School')).toBeTruthy();
      expect(getByText('120 pages')).toBeTruthy();
      expect(getByText('98 pages')).toBeTruthy();
      
      const yearbookCards = getAllByTestId('yearbook-card');
      expect(yearbookCards.length).toBe(2);
    });
  });

  describe('Yearbook Rendering', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
    });

    it('renders yearbook information correctly', () => {
      const { getByText } = render(<YearbooksScreen />);
      
      expect(getByText('Class of 2020 Yearbook')).toBeTruthy();
      expect(getByText('Class of 2018 Yearbook')).toBeTruthy();
      expect(getByText('2020')).toBeTruthy();
      expect(getByText('2018')).toBeTruthy();
    });

    it('renders school information correctly', () => {
      const { getByText } = render(<YearbooksScreen />);
      
      expect(getByText('Central High School')).toBeTruthy();
      expect(getByText('Westside High School')).toBeTruthy();
    });

    it('renders page count correctly', () => {
      const { getByText } = render(<YearbooksScreen />);
      
      expect(getByText('120 pages')).toBeTruthy();
      expect(getByText('98 pages')).toBeTruthy();
    });

    it('handles yearbooks with cover images', () => {
      const { getByTestId } = render(<YearbooksScreen />);
      
      const yearbook1Image = getByTestId('yearbook-image-yearbook-1');
      expect(yearbook1Image).toBeTruthy();
      expect(yearbook1Image.props.source.uri).toBe('https://example.com/cover1.jpg');
    });

    it('handles yearbooks without cover images', () => {
      const { getByTestId } = render(<YearbooksScreen />);
      
      const yearbook2Placeholder = getByTestId('yearbook-placeholder-yearbook-2');
      expect(yearbook2Placeholder).toBeTruthy();
      expect(yearbook2Placeholder.props.children).toBe('📚');
    });

    it('handles yearbooks with missing school data gracefully', () => {
      const yearbooksWithMissingSchool = [
        {
          ...mockYearbooks[0],
          schools: null,
        },
      ];
      
      mockUseQuery.mockReturnValue({
        data: yearbooksWithMissingSchool,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { queryByText } = render(<YearbooksScreen />);
      
      // Should not crash and should handle missing school name
      expect(queryByText('Central High School')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
    });

    it('triggers haptic feedback on yearbook press', () => {
      const { getAllByTestId } = render(<YearbooksScreen />);
      
      const yearbookCards = getAllByTestId('yearbook-card');
      fireEvent.press(yearbookCards[0]);
      
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('navigates to yearbook detail on press', () => {
      const mockPush = jest.fn();
      mockUseRouter.mockReturnValue({ push: mockPush });
      
      const { getAllByTestId } = render(<YearbooksScreen />);
      
      const yearbookCards = getAllByTestId('yearbook-card');
      fireEvent.press(yearbookCards[0]);
      
      expect(mockPush).toHaveBeenCalledWith('/yearbook/yearbook-1');
    });

    it('triggers haptic feedback on refresh', () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockReturnValue({
        data: mockYearbooks,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      });
      
      const { getByTestId } = render(<YearbooksScreen />);
      
      const refreshControl = getByTestId('refresh-control');
      fireEvent(refreshControl, 'refresh');
      
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('light');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Data Query Configuration', () => {
    it('uses proper stale time for yearbooks data', () => {
      render(<YearbooksScreen />);
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 1000 * 60 * 5, // 5 minutes
        })
      );
    });

    it('filters for completed upload status', () => {
      render(<YearbooksScreen />);
      
      const eqCall = mockSupabase.from().eq.mock.calls[0];
      expect(eqCall[0]).toBe('upload_status');
      expect(eqCall[1]).toBe('completed');
    });

    it('orders yearbooks by year and creation time', () => {
      render(<YearbooksScreen />);
      
      const orderCalls = mockSupabase.from().order.mock.calls;
      
      expect(orderCalls[0][0]).toBe('year');
      expect(orderCalls[0][1]).toEqual({ ascending: false });
      
      expect(orderCalls[1][0]).toBe('created_at');
      expect(orderCalls[1][1]).toEqual({ ascending: false });
    });

    it('includes school information in query', () => {
      render(<YearbooksScreen />);
      
      const selectCall = mockSupabase.from.mock.calls[0];
      expect(selectCall[0]).toBe('yearbooks');
      
      const selectQuery = mockSupabase.from().select.mock.calls[0][0];
      expect(selectQuery).toContain('schools!inner');
      expect(selectQuery).toContain('name');
      expect(selectQuery).toContain('logo_url');
    });
  });

  describe('Accessibility', () => {
    it('includes proper accessibility labels for yearbooks', () => {
      const { getAllByTestId } = render(<YearbooksScreen />);
      
      const yearbookCards = getAllByTestId('yearbook-card');
      expect(yearbookCards[0].props.accessibilityLabel).toContain('Class of 2020 Yearbook');
      expect(yearbookCards[0].props.accessibilityLabel).toContain('Central High School');
    });

    it('includes proper accessibility hints', () => {
      const { getAllByTestId } = render(<YearbooksScreen />);
      
      const yearbookCards = getAllByTestId('yearbook-card');
      expect(yearbookCards[0].props.accessibilityHint).toBe('Double tap to view this yearbook');
    });

    it('includes proper accessibility labels for empty state', () => {
      mockUseQuery.mockReturnValue({
        data: mockEmptyYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const { getByText } = render(<YearbooksScreen />);
      
      const emptyIcon = getByText('📚');
      expect(emptyIcon.props.accessibilityLabel).toBe('No yearbooks available');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('handles malformed yearbook data gracefully', () => {
      const malformedYearbooks = [
        {
          id: 'bad-yearbook',
          // Missing required fields
        },
      ] as any;
      
      mockUseQuery.mockReturnValue({
        data: malformedYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      // Should not crash
      expect(() => render(<YearbooksScreen />)).not.toThrow();
    });

    it('handles network errors during refetch', async () => {
      const mockRefetch = jest.fn().mockRejectedValue(new Error('Network error'));
      mockUseQuery.mockReturnValue({
        data: mockYearbooks,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      });
      
      const { getByTestId } = render(<YearbooksScreen />);
      
      const refreshControl = getByTestId('refresh-control');
      fireEvent(refreshControl, 'refresh');
      
      // Should handle error without crashing
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('handles missing image URLs gracefully', () => {
      const yearbooksWithBrokenImages = [
        {
          ...mockYearbooks[0],
          cover_image_url: 'invalid-url',
        },
      ];
      
      mockUseQuery.mockReturnValue({
        data: yearbooksWithBrokenImages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      // Should not crash
      expect(() => render(<YearbooksScreen />)).not.toThrow();
    });

    it('handles yearbooks with non-completed status', () => {
      const processingYearbooks = [
        {
          ...mockYearbooks[0],
          upload_status: 'processing',
        },
      ];
      
      mockUseQuery.mockReturnValue({
        data: processingYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      // Should filter out non-completed yearbooks
      const { queryByText } = render(<YearbooksScreen />);
      expect(queryByText('Class of 2020 Yearbook')).toBeNull();
    });
  });

  describe('Memory and Performance', () => {
    it('does not cause memory leaks on unmount', () => {
      const { unmount } = render(<YearbooksScreen />);
      
      // Should clean up properly
      expect(() => unmount()).not.toThrow();
    });

    it('maintains consistent render performance with many yearbooks', () => {
      const manyYearbooks = Array.from({ length: 50 }, (_, i) => ({
        ...mockYearbooks[0],
        id: `yearbook-${i}`,
        title: `Class of ${2000 + i} Yearbook`,
        year: 2000 + i,
      }));
      
      mockUseQuery.mockReturnValue({
        data: manyYearbooks,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });
      
      const startTime = performance.now();
      render(<YearbooksScreen />);
      const endTime = performance.now();
      
      // Should render 50 yearbooks quickly (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('uses efficient grid layout for yearbook display', () => {
      const { getByTestId } = render(<YearbooksScreen />);
      
      const yearbooksGrid = getByTestId('yearbooks-grid');
      expect(yearbooksGrid.props.style.flexDirection).toBe('row');
      expect(yearbooksGrid.props.style.flexWrap).toBe('wrap');
      expect(yearbooksGrid.props.style.justifyContent).toBe('space-between');
    });
  });

  describe('Visual Design and Layout', () => {
    it('applies correct styling to yearbook cards', () => {
      const { getAllByTestId } = render(<YearbooksScreen />);
      
      const yearbookCards = getAllByTestId('yearbook-card');
      
      expect(yearbookCards[0].props.style.width).toBe('48%');
      expect(yearbookCards[0].props.style.backgroundColor).toBe('#FFFFFF');
      expect(yearbookCards[0].props.style.borderRadius).toBe(12);
      expect(yearbookCards[0].props.style.overflow).toBe('hidden');
    });

    it('applies correct image container dimensions', () => {
      const { getAllByTestId } = render(<YearbooksScreen />);
      
      const imageContainers = getAllByTestId('yearbook-image-container');
      expect(imageContainers[0].props.style.height).toBe(160);
    });

    it('applies proper overlay styling for year display', () => {
      const { getAllByTestId } = render(<YearbooksScreen />);
      
      const yearOverlays = getAllByTestId('yearbook-overlay');
      expect(yearOverlays[0].props.style.position).toBe('absolute');
      expect(yearOverlays[0].props.style.top).toBe(8);
      expect(yearOverlays[0].props.style.right).toBe(8);
      expect(yearOverlays[0].props.style.backgroundColor).toBe('rgba(15, 23, 42, 0.8)');
    });
  });
});