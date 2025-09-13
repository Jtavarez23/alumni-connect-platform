import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

interface LazyRouteProps {
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  className?: string;
  props?: Record<string, any>;
}

// Enhanced skeleton component for different layouts
const RouteSkeletons = {
  Page: () => (
    <div className="min-h-screen flex flex-col">
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  List: () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>
    </div>
  ),

  Card: () => (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <div className="space-y-4">
          <div className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-2" />
            <Skeleton className="h-6 w-32 mx-auto" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  ),

  Dashboard: () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  ),
};

// Cache for lazy components to prevent re-creation
const componentCache = new Map<string, React.ComponentType<any>>();

export function createLazyRoute(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  options: {
    fallback?: keyof typeof RouteSkeletons | React.ComponentType;
    errorFallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
    preload?: boolean;
  } = {}
): React.ComponentType<any> {
  const { fallback = 'Page', errorFallback, preload = false } = options;

  // Create a unique key for caching
  const cacheKey = importFn.toString();

  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey)!;
  }

  const LazyComponent = lazy(importFn);

  // Preload component if requested
  if (preload) {
    importFn().catch(console.error);
  }

  const WrappedComponent: React.ComponentType<any> = React.memo((props) => {
    const FallbackComponent = typeof fallback === 'string'
      ? RouteSkeletons[fallback]
      : fallback;

    return (
      <ErrorBoundary fallback={errorFallback}>
        <Suspense fallback={<FallbackComponent />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  });

  WrappedComponent.displayName = `LazyRoute(${LazyComponent.displayName || 'Component'})`;

  componentCache.set(cacheKey, WrappedComponent);
  return WrappedComponent;
}

// HOC for wrapping existing components with performance optimizations
export function withPerformance<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    displayName?: string;
    shouldUpdate?: (prevProps: T, nextProps: T) => boolean;
  } = {}
): React.ComponentType<T> {
  const { displayName, shouldUpdate } = options;

  let WrappedComponent: React.ComponentType<T>;

  if (shouldUpdate) {
    WrappedComponent = React.memo(Component, (prevProps, nextProps) =>
      !shouldUpdate(prevProps, nextProps)
    );
  } else {
    WrappedComponent = React.memo(Component);
  }

  WrappedComponent.displayName = displayName || `withPerformance(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Utility for preloading routes
export class RoutePreloader {
  private static preloadedRoutes = new Set<string>();

  static preload(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
    const key = importFn.toString();

    if (this.preloadedRoutes.has(key)) {
      return;
    }

    this.preloadedRoutes.add(key);

    // Use requestIdleCallback if available, otherwise setTimeout
    const preloadFn = () => {
      importFn().catch(console.error);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadFn, { timeout: 2000 });
    } else {
      setTimeout(preloadFn, 100);
    }
  }

  static preloadOnInteraction(
    element: HTMLElement,
    importFn: () => Promise<{ default: React.ComponentType<any> }>,
    events: string[] = ['mouseenter', 'focus']
  ) {
    const handlePreload = () => {
      this.preload(importFn);
      // Remove listeners after first trigger
      events.forEach(event => {
        element.removeEventListener(event, handlePreload);
      });
    };

    events.forEach(event => {
      element.addEventListener(event, handlePreload, { once: true, passive: true });
    });
  }
}

// Default export for LazyRoute component
const LazyRoute: React.ComponentType<LazyRouteProps> = ({ importFn, fallback, errorFallback, className, props }) => {
  const LazyComponent = lazy(importFn);
  const FallbackComponent = fallback || RouteSkeletons.Page;

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={<FallbackComponent />}>
        <div className={cn(className)}>
          <LazyComponent {...props} />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyRoute;