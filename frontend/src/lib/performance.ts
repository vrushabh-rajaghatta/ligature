
// =============================================================================
// PERFORMANCE UTILITIES - v0.15.30
// Bundle optimization, lazy loading helpers, performance monitoring
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { logger } from '@/lib/logger';

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'paint' | 'custom';
}

interface ComponentLoadMetric {
  componentName: string;
  loadTime: number;
  bundleSize?: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: ComponentLoadMetric[] = [];
  private enabled: boolean = process.env.NODE_ENV === 'development';

  // Track component load time
  trackComponentLoad(componentName: string, startTime: number) {
    if (!this.enabled) return;
    
    const loadTime = performance.now() - startTime;
    this.componentMetrics.push({
      componentName,
      loadTime,
      timestamp: Date.now(),
    });

    if (loadTime > 500) {
      logger.warn('Perf', ` Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`);
    }
  }

  // Track custom metrics
  track(name: string, value: number, type: PerformanceMetric['type'] = 'custom') {
    if (!this.enabled) return;
    
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      type,
    });
  }

  // Get Web Vitals
  getWebVitals(): Record<string, number> {
    if (typeof window === 'undefined') return {};

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const vitals: Record<string, number> = {};

    if (navigation) {
      vitals.ttfb = navigation.responseStart - navigation.requestStart;
      vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      vitals.load = navigation.loadEventEnd - navigation.fetchStart;
    }

    paint.forEach((entry) => {
      if (entry.name === 'first-paint') {
        vitals.fp = entry.startTime;
      }
      if (entry.name === 'first-contentful-paint') {
        vitals.fcp = entry.startTime;
      }
    });

    return vitals;
  }

  // Get component load summary
  getComponentLoadSummary(): { slowest: ComponentLoadMetric[]; average: number } {
    if (this.componentMetrics.length === 0) {
      return { slowest: [], average: 0 };
    }

    const sorted = [...this.componentMetrics].sort((a, b) => b.loadTime - a.loadTime);
    const average = this.componentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / this.componentMetrics.length;

    return {
      slowest: sorted.slice(0, 10),
      average,
    };
  }

  // Print performance report
  printReport() {
    if (!this.enabled) return;

    const vitals = this.getWebVitals();
    const componentSummary = this.getComponentLoadSummary();
    
    logger.debug('Perf', `Web Vitals: ${JSON.stringify(vitals)}`);
    logger.debug('Perf', `Component Load Average: ${componentSummary.average.toFixed(2)}ms`);
    logger.debug('Perf', `Slowest Components: ${componentSummary.slowest.map(c => `${c.componentName}: ${c.loadTime.toFixed(2)}ms`).join(', ')}`);
  }

  // Clear metrics
  clear() {
    this.metrics = [];
    this.componentMetrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// =============================================================================
// LAZY LOADING UTILITIES
// =============================================================================

interface LazyComponentOptions {
  fallback?: React.ReactNode;
  ssr?: boolean;
  onLoad?: () => void;
  preload?: boolean;
}

/**
 * Create a lazy-loaded component with performance tracking
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  componentName: string,
  options: LazyComponentOptions = {}
): ComponentType<P> {
  const { fallback, ssr = false, onLoad, preload = false } = options;

  // Track load start time
  let loadStartTime: number | null = null;

  const trackedImport = () => {
    loadStartTime = performance.now();
    return importFn().then((module) => {
      if (loadStartTime) {
        performanceMonitor.trackComponentLoad(componentName, loadStartTime);
      }
      onLoad?.();
      return module;
    });
  };

  const LazyComponent = dynamic(trackedImport, {
    loading: () => (fallback as React.ReactElement) || null,
    ssr,
  });

  // Preload if requested
  if (preload && typeof window !== 'undefined') {
    // Use requestIdleCallback for preloading
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
        trackedImport();
      });
    } else {
      setTimeout(trackedImport, 1000);
    }
  }

  return LazyComponent as ComponentType<P>;
}

/**
 * Preload a dynamic component
 */
export function preloadComponent(
  importFn: () => Promise<unknown>
): void {
  if (typeof window === 'undefined') return;

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      importFn();
    });
  } else {
    setTimeout(importFn, 100);
  }
}

// =============================================================================
// INTERSECTION OBSERVER HOOK
// =============================================================================

interface UseIntersectionOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook for intersection observer based lazy loading
 */
export function useIntersectionObserver(
  options: UseIntersectionOptions = {}
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const { threshold = 0, rootMargin = '100px', triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isIntersecting];
}

// =============================================================================
// RENDER PERFORMANCE HOOK
// =============================================================================

/**
 * Hook to track component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (process.env.NODE_ENV === 'development' && renderCount.current > 1) {
      if (timeSinceLastRender < 16) {
        // More than 60fps re-renders - potential issue
        logger.debug('Perf', ` Rapid re-render in ${componentName}: ${timeSinceLastRender.toFixed(2)}ms since last`);
      }
    }
  });

  return renderCount.current;
}

// =============================================================================
// DEBOUNCED VALUE HOOK
// =============================================================================

/**
 * Hook for debouncing values to reduce re-renders
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// MEMOIZATION HELPERS
// =============================================================================

/**
 * Deep equality check for memoization
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Stable reference for object props
 */
export function useStableObject<T extends object>(obj: T): T {
  const ref = useRef<T>(obj);

  if (!deepEqual(ref.current, obj)) {
    ref.current = obj;
  }

  return ref.current;
}

// =============================================================================
// CHUNK PRELOADING
// =============================================================================

// Map of module paths to their import functions for preloading
const PRELOAD_MAP: Record<string, () => Promise<unknown>> = {
  // Most commonly visited screens after login
  portfolio: () => import('@/components/screens/PortfolioScreen'),
  activity: () => import('@/components/screens/ActivityScreen'),
  haq: () => import('@/components/screens/HAQScreen'),
  safety: () => import('@/components/screens/SafetyScreen'),
  submissions: () => import('@/components/screens/SubmissionsScreen'),
};

/**
 * Preload critical chunks after initial page load
 */
export function preloadCriticalChunks(): void {
  if (typeof window === 'undefined') return;

  // Wait for page to be interactive
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(() => {
        Object.values(PRELOAD_MAP).forEach((importFn) => {
          importFn().catch(() => {
            // Silently fail preloading
          });
        });
      }, { timeout: 3000 });
  }
}

// =============================================================================
// MEMORY USAGE TRACKING
// =============================================================================

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Get current memory usage (Chrome only)
 */
export function getMemoryUsage(): MemoryInfo | null {
  if (typeof window === 'undefined') return null;
  
  const performance = window.performance as Performance & { memory?: MemoryInfo };
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * Hook to monitor memory usage
 */
export function useMemoryMonitor(warningThresholdMB: number = 100): number | null {
  const [usedMB, setUsedMB] = useState<number | null>(null);

  useEffect(() => {
    const checkMemory = () => {
      const memory = getMemoryUsage();
      if (memory) {
        const used = memory.usedJSHeapSize / (1024 * 1024);
        setUsedMB(used);
        
        if (used > warningThresholdMB) {
          logger.warn('Memory', ` High memory usage: ${used.toFixed(2)}MB`);
        }
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [warningThresholdMB]);

  return usedMB;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { PerformanceMetric, ComponentLoadMetric, MemoryInfo };
