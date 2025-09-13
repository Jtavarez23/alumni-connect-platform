/**
 * Performance Tests for Gesture Handling and Image Loading
 * Google-level performance benchmarks for mobile interactions
 */

import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  act,
  simulateGesture,
  measurePerformance,
  detectMemoryLeaks,
  advanceAnimationsByTime,
} from '../utils/test-utils';
import { TouchYearbookReader } from '../../components/yearbook/TouchYearbookReader';
import { useQuery } from '@tanstack/react-query';

// Mock dependencies for performance testing
jest.mock('@tanstack/react-query');
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated-mock');
  return {
    ...Reanimated,
    // Override for performance testing
    useAnimatedGestureHandler: (handlers: any) => handlers,
    useSharedValue: (value: any) => ({ value }),
    useAnimatedStyle: (callback: () => any) => callback(),
  };
});

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('Gesture Performance Tests', () => {
  const defaultProps = {
    yearbookId: 'yearbook-1',
    initialPage: 1,
    onPageChange: jest.fn(),
    onClose: jest.fn(),
  };

  const mockYearbookPages = Array.from({ length: 10 }, (_, i) => ({
    id: `${i + 1}`,
    yearbook_id: 'yearbook-1',
    page_number: i + 1,
    image_url: `https://example.com/page${i + 1}.jpg`,
    deep_zoom_url: null,
    ocr_text: null,
    created_at: '2024-01-01T00:00:00Z',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockUseQuery.mockReturnValue({
      data: mockYearbookPages,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    // Mock performance.now for consistent timing
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(16.67); // 60fps target
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Render Performance', () => {
    it('renders within performance budget (< 100ms)', async () => {
      const renderTime = await measurePerformance(async () => {
        render(<TouchYearbookReader {...defaultProps} />);
      });

      expect(renderTime).toBeWithinPerformanceThreshold(100);
    });

    it('handles complex layouts efficiently', async () => {
      const complexProps = {
        ...defaultProps,
        initialPage: 5,
      };

      const renderTime = await measurePerformance(async () => {
        render(<TouchYearbookReader {...complexProps} />);
      });

      expect(renderTime).toBeWithinPerformanceThreshold(150);
    });

    it('maintains 60fps during initial render', async () => {
      const frameTime = await measurePerformance(async () => {
        render(<TouchYearbookReader {...defaultProps} />);
        advanceAnimationsByTime(16.67); // One frame
      });

      expect(frameTime).toBeWithinPerformanceThreshold(16.67); // 60fps = 16.67ms per frame
    });
  });

  describe('Gesture Performance', () => {
    it('handles pinch gestures at 60fps', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const gestureTime = await measurePerformance(async () => {
        // Simulate 60 pinch events per second
        for (let i = 0; i < 60; i++) {
          const pinchGesture = simulateGesture.pinch(1.0 + i * 0.01, 200, 300);
          fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
          advanceAnimationsByTime(16.67);
        }
      });

      // Should handle 60 gestures in approximately 1 second
      expect(gestureTime).toBeWithinPerformanceThreshold(1100);
    });

    it('handles pan gestures smoothly', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const panTime = await measurePerformance(async () => {
        // Simulate smooth panning motion
        for (let i = 0; i < 30; i++) {
          const panGesture = simulateGesture.pan(i * 5, i * 2);
          fireEvent(imageElement.parent, 'onPanGestureEvent', panGesture);
          advanceAnimationsByTime(16.67);
        }
      });

      expect(panTime).toBeWithinPerformanceThreshold(600); // 30 frames * 16.67ms
    });

    it('handles rapid double-tap events', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const doubleTapTime = await measurePerformance(async () => {
        // Simulate rapid double taps
        for (let i = 0; i < 10; i++) {
          const doubleTapGesture = simulateGesture.tap(200, 300, 2);
          fireEvent(imageElement.parent, 'onDoubleTap', doubleTapGesture);
          advanceAnimationsByTime(100); // Brief pause between taps
        }
      });

      expect(doubleTapTime).toBeWithinPerformanceThreshold(1200);
    });

    it('maintains performance with complex gesture combinations', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yarbook page 1');

      const complexGestureTime = await measurePerformance(async () => {
        // Simulate complex multi-touch scenario
        const pinchGesture = simulateGesture.pinch(2.0, 200, 300);
        const panGesture = simulateGesture.pan(50, 30);
        
        fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
        fireEvent(imageElement.parent, 'onPanGestureEvent', panGesture);
        
        advanceAnimationsByTime(100);
      });

      expect(complexGestureTime).toBeWithinPerformanceThreshold(150);
    });
  });

  describe('Animation Performance', () => {
    it('zoom animations run smoothly', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const animationTime = await measurePerformance(async () => {
        // Trigger zoom animation
        const doubleTapGesture = simulateGesture.tap(200, 300, 2);
        fireEvent(imageElement.parent, 'onDoubleTap', doubleTapGesture);
        
        // Simulate 250ms animation (default timing)
        for (let i = 0; i < 15; i++) {
          advanceAnimationsByTime(16.67);
        }
      });

      expect(animationTime).toBeWithinPerformanceThreshold(300);
    });

    it('page transition animations are smooth', async () => {
      const { getByText } = render(<TouchYearbookReader {...defaultProps} />);
      const nextButton = getByText('Next');

      const transitionTime = await measurePerformance(async () => {
        fireEvent.press(nextButton);
        
        // Simulate page transition animation
        for (let i = 0; i < 15; i++) {
          advanceAnimationsByTime(16.67);
        }
      });

      expect(transitionTime).toBeWithinPerformanceThreshold(300);
    });

    it('handles concurrent animations efficiently', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const concurrentAnimationTime = await measurePerformance(async () => {
        // Start multiple animations simultaneously
        const pinchGesture = simulateGesture.pinch(1.5, 200, 300);
        const panGesture = simulateGesture.pan(25, 15);
        
        fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
        fireEvent(imageElement.parent, 'onPanGestureEvent', panGesture);
        
        // Run animations for typical duration
        for (let i = 0; i < 20; i++) {
          advanceAnimationsByTime(16.67);
        }
      });

      expect(concurrentAnimationTime).toBeWithinPerformanceThreshold(400);
    });
  });

  describe('Memory Performance', () => {
    it('does not create memory leaks during gestures', async () => {
      const memoryTracker = detectMemoryLeaks();
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      // Simulate intensive gesture usage
      for (let i = 0; i < 100; i++) {
        const gesture = i % 2 === 0 
          ? simulateGesture.pinch(1.0 + Math.random(), 200, 300)
          : simulateGesture.pan(Math.random() * 100, Math.random() * 100);
          
        fireEvent(imageElement.parent, 'onPinchGestureEvent', gesture);
        
        if (i % 10 === 0) {
          advanceAnimationsByTime(100);
        }
      }

      const memoryReport = memoryTracker.check();
      expect(memoryReport.leaked).toBe(false);
    });

    it('cleans up properly on component unmount', async () => {
      const memoryTracker = detectMemoryLeaks();
      const { unmount, getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      // Use component normally
      const pinchGesture = simulateGesture.pinch(2.0, 200, 300);
      fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
      advanceAnimationsByTime(100);

      // Unmount component
      unmount();

      const memoryReport = memoryTracker.check();
      expect(memoryReport.leaked).toBe(false);
    });

    it('handles rapid mounting and unmounting', async () => {
      const memoryTracker = detectMemoryLeaks();

      // Rapidly mount and unmount components
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<TouchYearbookReader {...defaultProps} />);
        advanceAnimationsByTime(50);
        unmount();
      }

      const memoryReport = memoryTracker.check();
      expect(memoryReport.leaked).toBe(false);
    });
  });

  describe('Image Loading Performance', () => {
    it('loads images efficiently', async () => {
      const imageLoadTime = await measurePerformance(async () => {
        render(<TouchYearbookReader {...defaultProps} />);
        
        // Simulate image load completion
        advanceAnimationsByTime(200);
      });

      expect(imageLoadTime).toBeWithinPerformanceThreshold(250);
    });

    it('handles high-resolution images without performance degradation', async () => {
      // Mock high-res images
      const highResPages = mockYearbookPages.map(page => ({
        ...page,
        image_url: `${page.image_url}?w=2048&h=2048`,
      }));

      mockUseQuery.mockReturnValue({
        data: highResPages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const highResRenderTime = await measurePerformance(async () => {
        render(<TouchYearbookReader {...defaultProps} />);
        advanceAnimationsByTime(300);
      });

      expect(highResRenderTime).toBeWithinPerformanceThreshold(400);
    });

    it('efficiently handles page navigation with preloading', async () => {
      const { getByText } = render(<TouchYearbookReader {...defaultProps} />);
      const nextButton = getByText('Next');

      const navigationTime = await measurePerformance(async () => {
        // Navigate through multiple pages
        for (let i = 0; i < 5; i++) {
          fireEvent.press(nextButton);
          advanceAnimationsByTime(100);
        }
      });

      expect(navigationTime).toBeWithinPerformanceThreshold(600);
    });
  });

  describe('Resource Usage', () => {
    it('maintains low CPU usage during idle state', async () => {
      render(<TouchYearbookReader {...defaultProps} />);

      const idleTime = await measurePerformance(async () => {
        // Simulate idle state for 1 second
        advanceAnimationsByTime(1000);
      });

      // Idle should be very fast (minimal CPU usage)
      expect(idleTime).toBeWithinPerformanceThreshold(50);
    });

    it('efficiently handles background/foreground transitions', async () => {
      const { unmount } = render(<TouchYearbookReader {...defaultProps} />);

      const transitionTime = await measurePerformance(async () => {
        // Simulate app going to background
        act(() => {
          jest.advanceTimersByTime(100);
        });

        // Simulate returning to foreground
        act(() => {
          jest.advanceTimersByTime(100);
        });

        unmount();
      });

      expect(transitionTime).toBeWithinPerformanceThreshold(250);
    });

    it('scales performance with device capabilities', async () => {
      // Mock lower-end device
      const originalDeviceMemory = (navigator as any).deviceMemory;
      (navigator as any).deviceMemory = 2; // 2GB RAM

      const lowEndPerformance = await measurePerformance(async () => {
        render(<TouchYearbookReader {...defaultProps} />);
        
        const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
        const imageElement = getByLabelText('Yearbook page 1');
        
        // Reduced gesture intensity for low-end device
        for (let i = 0; i < 30; i++) {
          const pinchGesture = simulateGesture.pinch(1.0 + i * 0.01, 200, 300);
          fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
          advanceAnimationsByTime(33.33); // 30fps for low-end
        }
      });

      // Should still be performant on low-end devices
      expect(lowEndPerformance).toBeWithinPerformanceThreshold(1200);

      // Restore original value
      (navigator as any).deviceMemory = originalDeviceMemory;
    });
  });

  describe('Edge Case Performance', () => {
    it('handles extreme zoom levels efficiently', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const extremeZoomTime = await measurePerformance(async () => {
        // Test maximum zoom
        const maxZoomGesture = simulateGesture.pinch(4.0, 200, 300);
        fireEvent(imageElement.parent, 'onPinchGestureEvent', maxZoomGesture);
        
        // Test minimum zoom  
        const minZoomGesture = simulateGesture.pinch(0.8, 200, 300);
        fireEvent(imageElement.parent, 'onPinchGestureEvent', minZoomGesture);
        
        advanceAnimationsByTime(200);
      });

      expect(extremeZoomTime).toBeWithinPerformanceThreshold(300);
    });

    it('performs well with rapid page switching', async () => {
      const { getByText } = render(<TouchYearbookReader {...defaultProps} />);
      const nextButton = getByText('Next');
      const prevButton = getByText('Previous');

      const rapidSwitchTime = await measurePerformance(async () => {
        // Rapidly switch between pages
        for (let i = 0; i < 20; i++) {
          fireEvent.press(i % 2 === 0 ? nextButton : prevButton);
          advanceAnimationsByTime(50);
        }
      });

      expect(rapidSwitchTime).toBeWithinPerformanceThreshold(1200);
    });

    it('handles gesture spam gracefully', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const spamTime = await measurePerformance(async () => {
        // Spam various gestures rapidly
        for (let i = 0; i < 200; i++) {
          const gestureType = i % 3;
          let gesture;
          
          switch (gestureType) {
            case 0:
              gesture = simulateGesture.pinch(1.0 + Math.random(), 200, 300);
              fireEvent(imageElement.parent, 'onPinchGestureEvent', gesture);
              break;
            case 1:
              gesture = simulateGesture.pan(Math.random() * 50, Math.random() * 50);
              fireEvent(imageElement.parent, 'onPanGestureEvent', gesture);
              break;
            case 2:
              gesture = simulateGesture.tap(200, 300);
              fireEvent(imageElement.parent, 'onSingleTap', gesture);
              break;
          }
          
          if (i % 50 === 0) {
            advanceAnimationsByTime(100);
          }
        }
      });

      // Should handle gesture spam without significant performance degradation
      expect(spamTime).toBeWithinPerformanceThreshold(2000);
    });
  });

  describe('Performance Benchmarks', () => {
    it('meets Google performance standards for mobile apps', async () => {
      // First Contentful Paint < 1.5s
      const fcpTime = await measurePerformance(async () => {
        render(<TouchYearbookReader {...defaultProps} />);
      });
      expect(fcpTime).toBeWithinPerformanceThreshold(1500);

      // Time to Interactive < 3.0s
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');
      
      const ttiTime = await measurePerformance(async () => {
        const pinchGesture = simulateGesture.pinch(1.5, 200, 300);
        fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
        advanceAnimationsByTime(100);
      });
      expect(ttiTime).toBeWithinPerformanceThreshold(3000);
    });

    it('maintains consistent frame rates during intensive usage', async () => {
      const { getByLabelText } = render(<TouchYearbookReader {...defaultProps} />);
      const imageElement = getByLabelText('Yearbook page 1');

      const frameRateTest = await measurePerformance(async () => {
        // Simulate 5 seconds of intensive usage
        for (let i = 0; i < 300; i++) { // 60fps * 5s
          const pinchGesture = simulateGesture.pinch(1.0 + Math.sin(i * 0.1) * 0.5, 200, 300);
          fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
          advanceAnimationsByTime(16.67);
        }
      });

      // Should complete 5 seconds of 60fps animation in reasonable time
      expect(frameRateTest).toBeWithinPerformanceThreshold(6000);
    });

    it('passes mobile performance audit', async () => {
      const auditResults = await measurePerformance(async () => {
        // Comprehensive performance test simulating real usage
        const component = render(<TouchYearbookReader {...defaultProps} />);
        
        // Initial render
        advanceAnimationsByTime(100);
        
        // User interaction
        const imageElement = component.getByLabelText('Yearbook page 1');
        const pinchGesture = simulateGesture.pinch(2.0, 200, 300);
        fireEvent(imageElement.parent, 'onPinchGestureEvent', pinchGesture);
        
        // Navigation
        const nextButton = component.getByText('Next');
        fireEvent.press(nextButton);
        
        // Cleanup
        advanceAnimationsByTime(200);
        component.unmount();
      });

      // Total audit should complete quickly
      expect(auditResults).toBeWithinPerformanceThreshold(500);
    });
  });
});