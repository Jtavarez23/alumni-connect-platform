/**
 * Test Utilities for Alumni Connect Mobile
 * Custom render functions and test helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock AuthProvider for tests
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialEntries?: string[];
  authenticated?: boolean;
}

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    queryClient = createTestQueryClient(),
    authenticated = false,
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children?: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 375, height: 812 },
            insets: { top: 44, left: 0, right: 0, bottom: 34 },
          }}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MockAuthProvider>{children}</MockAuthProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Gesture simulation helpers
export const simulateGesture = {
  pinch: (scale: number, focalX: number = 200, focalY: number = 300) => ({
    nativeEvent: {
      scale,
      focalX,
      focalY,
      velocity: 0.5,
      state: 4, // ACTIVE state
    },
  }),

  pan: (translationX: number, translationY: number) => ({
    nativeEvent: {
      translationX,
      translationY,
      velocityX: 0,
      velocityY: 0,
      state: 4, // ACTIVE state
    },
  }),

  tap: (x: number, y: number, numberOfTaps: number = 1) => ({
    nativeEvent: {
      x,
      y,
      absoluteX: x,
      absoluteY: y,
      numberOfTaps,
      state: 5, // END state
    },
  }),

  longPress: (x: number, y: number) => ({
    nativeEvent: {
      x,
      y,
      absoluteX: x,
      absoluteY: y,
      duration: 600,
      state: 5, // END state
    },
  }),
};

// Animation testing helpers
export const waitForAnimations = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 100);
  });
};

export const advanceAnimationsByTime = (time: number) => {
  jest.advanceTimersByTime(time);
};

// Mock navigation helpers
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  push: jest.fn(),
  replace: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
};

// Mock route object
export const mockRoute = {
  key: 'test-route',
  name: 'Test',
  params: {},
  path: '/test',
};

// Accessibility testing helpers
export const findAccessibilityNode = (
  element: any,
  accessibilityLabel: string
) => {
  return element.getByA11yLabel?.(accessibilityLabel) || 
         element.getByLabelText?.(accessibilityLabel);
};

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Memory leak detection
export const detectMemoryLeaks = () => {
  const initialMemory = process.memoryUsage();
  
  return {
    check: () => {
      const currentMemory = process.memoryUsage();
      const heapUsedDiff = currentMemory.heapUsed - initialMemory.heapUsed;
      const heapTotalDiff = currentMemory.heapTotal - initialMemory.heapTotal;
      
      return {
        heapUsedDiff,
        heapTotalDiff,
        leaked: heapUsedDiff > 50 * 1024 * 1024, // 50MB threshold
      };
    },
  };
};

// Custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithGesture(expectedGesture: any): R;
      toBeWithinPerformanceThreshold(threshold: number): R;
      toHaveAccessibleContent(): R;
    }
  }
}

expect.extend({
  toBeWithinPerformanceThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    return {
      message: () =>
        `expected ${received}ms to be ${pass ? 'above' : 'within'} ${threshold}ms threshold`,
      pass,
    };
  },

  toHaveAccessibleContent(received: any) {
    const hasAccessibilityLabel = received.props?.accessibilityLabel ||
      received.props?.['aria-label'];
    const hasAccessibilityHint = received.props?.accessibilityHint ||
      received.props?.['aria-describedby'];
    const hasAccessibilityRole = received.props?.accessibilityRole ||
      received.props?.role;

    const pass = hasAccessibilityLabel && (hasAccessibilityHint || hasAccessibilityRole);

    return {
      message: () =>
        `expected element to have accessible content (label: ${hasAccessibilityLabel}, hint/role: ${hasAccessibilityHint || hasAccessibilityRole})`,
      pass,
    };
  },
});

// Export everything
export * from '@testing-library/react-native';
export { 
  customRender as render,
  createTestQueryClient,
  MockAuthProvider,
};

export default customRender;