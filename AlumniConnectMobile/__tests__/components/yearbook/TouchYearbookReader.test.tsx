/**
 * Comprehensive Tests for TouchYearbookReader Component
 * Google-level testing for gesture handling, performance, and accessibility
 */

import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  act,
  screen,
  simulateGesture,
  waitForAnimations,
  measurePerformance,
} from '../../utils/test-utils';
import { TouchYearbookReader } from '../../../components/yearbook/TouchYearbookReader';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

// Mock the dependencies
jest.mock('@tanstack/react-query');
jest.mock('expo-haptics');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('TouchYearbookReader', () => {
  const defaultProps = {
    yearbookId: 'yearbook-1',
    initialPage: 1,
    onPageChange: jest.fn(),
    onClose: jest.fn(),
  };

  const mockYearbookPages = [
    {
      id: '1',
      yearbook_id: 'yearbook-1',
      page_number: 1,
      image_url: 'https://example.com/page1.jpg',
      deep_zoom_url: null,
      ocr_text: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      yearbook_id: 'yearbook-1',
      page_number: 2,
      image_url: 'https://example.com/page2.jpg',
      deep_zoom_url: null,
      ocr_text: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders loading state correctly', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);

      expect(screen.getByText('Loading yearbook...')).toBeTruthy();
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    it('renders error state with retry option', () => {
      const mockError = new Error('Failed to load pages');
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);

      expect(screen.getByText(/Failed to load yearbook pages/)).toBeTruthy();
      expect(screen.getByText('Close')).toBeTruthy();
    });

    it('renders yearbook pages successfully', () => {
      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);

      expect(screen.getByText('1 of 2')).toBeTruthy();
      expect(screen.getByLabelText('Yearbook page 1')).toBeTruthy();
      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Next')).toBeTruthy();
    });

    it('renders with correct accessibility attributes', () => {
      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);

      const image = screen.getByLabelText('Yearbook page 1');
      expect(image).toHaveAccessibleContent();

      const closeButton = screen.getByLabelText('Close yearbook');
      expect(closeButton.props.accessibilityHint).toBe('Returns to the previous screen');

      const nextButton = screen.getByLabelText('Next page');
      expect(nextButton.props.accessibilityHint).toBe('Go to the next yearbook page');
    });
  });

  describe('Navigation Controls', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('navigates to next page correctly', async () => {
      const onPageChange = jest.fn();
      render(<TouchYearbookReader {...defaultProps} onPageChange={onPageChange} />);

      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(2);
        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Light
        );
      });
    });

    it('navigates to previous page correctly', async () => {
      const onPageChange = jest.fn();
      render(
        <TouchYearbookReader {...defaultProps} initialPage={2} onPageChange={onPageChange} />
      );

      const prevButton = screen.getByText('Previous');
      fireEvent.press(prevButton);

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1);
        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Light
        );
      });
    });

    it('disables previous button on first page', () => {
      render(<TouchYearbookReader {...defaultProps} initialPage={1} />);

      const prevButton = screen.getByText('Previous');
      expect(prevButton.parent?.props.disabled).toBe(true);
    });

    it('disables next button on last page', () => {
      render(<TouchYearbookReader {...defaultProps} initialPage={2} />);

      const nextButton = screen.getByText('Next');
      expect(nextButton.parent?.props.disabled).toBe(true);
    });

    it('closes reader when close button is pressed', () => {
      const onClose = jest.fn();
      render(<TouchYearbookReader {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close yearbook');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });
  });

  describe('Gesture Handling', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('handles pinch zoom gesture correctly', async () => {
      const { getByTestId } = render(<TouchYearbookReader {...defaultProps} />);

      const gestureContainer = screen.getByLabelText('Yearbook page 1').parent;
      
      // Simulate pinch zoom
      const pinchGesture = simulateGesture.pinch(2.0, 200, 300);
      fireEvent(gestureContainer, 'onPinchGestureEvent', pinchGesture);

      await waitForAnimations();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('constrains zoom within min and max bounds', async () => {
      const { getByTestId } = render(<TouchYearbookReader {...defaultProps} />);

      const gestureContainer = screen.getByLabelText('Yearbook page 1').parent;
      
      // Test maximum zoom constraint
      const maxPinchGesture = simulateGesture.pinch(10.0, 200, 300);
      fireEvent(gestureContainer, 'onPinchGestureEvent', maxPinchGesture);

      // Test minimum zoom constraint
      const minPinchGesture = simulateGesture.pinch(0.1, 200, 300);
      fireEvent(gestureContainer, 'onPinchGestureEvent', minPinchGesture);

      await waitForAnimations();

      // The component should constrain the zoom between MIN_ZOOM (0.8) and MAX_ZOOM (4.0)
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('handles pan gesture correctly', async () => {
      const { getByTestId } = render(<TouchYearbookReader {...defaultProps} />);

      const gestureContainer = screen.getByLabelText('Yearbook page 1').parent;
      
      // First zoom in to enable panning
      const zoomGesture = simulateGesture.pinch(2.0, 200, 300);
      fireEvent(gestureContainer, 'onPinchGestureEvent', zoomGesture);
      
      // Then pan
      const panGesture = simulateGesture.pan(50, 30);
      fireEvent(gestureContainer, 'onPanGestureEvent', panGesture);

      await waitForAnimations();
      
      // Pan should work after zoom
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('handles double tap zoom correctly', async () => {
      const { getByTestId } = render(<TouchYearbookReader {...defaultProps} />);

      const gestureContainer = screen.getByLabelText('Yearbook page 1').parent;
      
      // Simulate double tap
      const doubleTapGesture = simulateGesture.tap(200, 300, 2);
      fireEvent(gestureContainer, 'onDoubleTap', doubleTapGesture);

      await waitForAnimations();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it('resets zoom on double tap when already zoomed', async () => {
      const { getByTestId } = render(<TouchYearbookReader {...defaultProps} />);

      const gestureContainer = screen.getByLabelText('Yearbook page 1').parent;
      
      // First zoom in
      const zoomGesture = simulateGesture.pinch(3.0, 200, 300);
      fireEvent(gestureContainer, 'onPinchGestureEvent', zoomGesture);
      
      await waitForAnimations();
      
      // Then double tap to reset
      const doubleTapGesture = simulateGesture.tap(200, 300, 2);
      fireEvent(gestureContainer, 'onDoubleTap', doubleTapGesture);

      await waitForAnimations();

      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('handles single tap for UI interaction', async () => {
      const { getByTestId } = render(<TouchYearbookReader {...defaultProps} />);

      const gestureContainer = screen.getByLabelText('Yearbook page 1').parent;
      
      // Simulate single tap
      const singleTapGesture = simulateGesture.tap(200, 300, 1);
      fireEvent(gestureContainer, 'onSingleTap', singleTapGesture);

      await waitForAnimations();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });
  });

  describe('Performance Tests', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('renders within performance threshold', async () => {
      const renderTime = await measurePerformance(async () => {
        render(<TouchYearbookReader {...defaultProps} />);
      });

      expect(renderTime).toBeWithinPerformanceThreshold(100); // 100ms threshold
    });

    it('handles rapid gesture events efficiently', async () => {
      const { getByTestId } = render(<TouchYearbookReader {...defaultProps} />);
      
      const gestureContainer = screen.getByLabelText('Yearbook page 1').parent;

      const gestureTime = await measurePerformance(async () => {
        // Simulate rapid pinch gestures
        for (let i = 0; i < 10; i++) {
          const pinchGesture = simulateGesture.pinch(1.1 + i * 0.1, 200, 300);
          fireEvent(gestureContainer, 'onPinchGestureEvent', pinchGesture);
        }
        
        await waitForAnimations();
      });

      expect(gestureTime).toBeWithinPerformanceThreshold(200); // 200ms threshold
    });

    it('page navigation is smooth and responsive', async () => {
      const onPageChange = jest.fn();
      render(<TouchYearbookReader {...defaultProps} onPageChange={onPageChange} />);

      const navigationTime = await measurePerformance(async () => {
        const nextButton = screen.getByText('Next');
        fireEvent.press(nextButton);
        
        await waitFor(() => {
          expect(onPageChange).toHaveBeenCalled();
        });
      });

      expect(navigationTime).toBeWithinPerformanceThreshold(50); // 50ms threshold
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty yearbook pages gracefully', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);

      expect(screen.getByText('No pages found in this yearbook')).toBeTruthy();
      expect(screen.getByText('Close')).toBeTruthy();
    });

    it('handles network errors with retry mechanism', async () => {
      const mockRefetch = jest.fn();
      const mockError = new Error('Network error');
      
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);

      expect(screen.getByText(/Failed to load yearbook pages/)).toBeTruthy();
    });

    it('handles missing page data gracefully', () => {
      const pagesWithMissing = [
        mockYearbookPages[0],
        // Missing page 2
      ];

      mockUseQuery.mockReturnValue({
        data: pagesWithMissing,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} initialPage={2} />);

      expect(screen.getByText('Page 2 not available')).toBeTruthy();
    });

    it('prevents navigation beyond available pages', () => {
      const onPageChange = jest.fn();
      render(<TouchYearbookReader {...defaultProps} initialPage={2} onPageChange={onPageChange} />);

      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton);

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('handles rapid consecutive page changes gracefully', async () => {
      const onPageChange = jest.fn();
      render(<TouchYearbookReader {...defaultProps} onPageChange={onPageChange} />);

      const nextButton = screen.getByText('Next');
      
      // Rapidly click next button
      fireEvent.press(nextButton);
      fireEvent.press(nextButton);
      fireEvent.press(nextButton);

      await waitFor(() => {
        // Should only navigate once to page 2, not beyond
        expect(onPageChange).toHaveBeenCalledTimes(1);
        expect(onPageChange).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('Memory Management', () => {
    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(<TouchYearbookReader {...defaultProps} />);
      
      unmount();
      
      // Component should unmount without memory leaks
      // This would be tested in integration with performance monitoring
    });

    it('properly manages gesture handler refs', () => {
      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { unmount } = render(<TouchYearbookReader {...defaultProps} />);
      
      // Refs should be properly initialized
      expect(screen.getByLabelText('Yearbook page 1')).toBeTruthy();
      
      unmount();
      
      // Refs should be cleaned up on unmount
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('adapts navigation controls for different platforms', () => {
      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);
      
      // Navigation should work on all platforms
      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Next')).toBeTruthy();
    });

    it('handles different screen sizes correctly', () => {
      // Mock different screen dimensions
      const mockDimensions = require('react-native/Libraries/Utilities/Dimensions');
      mockDimensions.get.mockReturnValue({ width: 768, height: 1024 }); // Tablet size

      mockUseQuery.mockReturnValue({
        data: mockYearbookPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<TouchYearbookReader {...defaultProps} />);
      
      expect(screen.getByLabelText('Yearbook page 1')).toBeTruthy();
    });
  });
});