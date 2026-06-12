


/**
 * usePerformance - v139
 * 
 * Performance monitoring hook for tracking:
 * - Initial load time
 * - Tab switch times
 * - Render times
 * - Memory usage (where available)
 * 
 * Useful for demo mode to show enterprise-grade performance.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// Types
// ============================================

export interface PerformanceMetrics {
  /** Time from navigation start to first contentful paint */
  initialLoadMs: number | null;
  /** Time to interactive */
  ttiMs: number | null;
  /** Average tab switch time */
  avgTabSwitchMs: number;
  /** Last tab switch time */
  lastTabSwitchMs: number | null;
  /** Number of tab switches recorded */
  tabSwitchCount: number;
  /** JS heap size in MB (Chrome only) */
  heapSizeMB: number | null;
  /** Frame rate (recent average) */
  fps: number | null;
  /** Is performance good enough for demo? */
  isDemoReady: boolean;
}

interface TabSwitchRecord {
  from: string;
  to: string;
  durationMs: number;
  timestamp: number;
}

// ============================================
// Performance Monitor Hook
// ============================================

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    initialLoadMs: null,
    ttiMs: null,
    avgTabSwitchMs: 0,
    lastTabSwitchMs: null,
    tabSwitchCount: 0,
    heapSizeMB: null,
    fps: null,
    isDemoReady: false,
  });

  const tabSwitchHistory = useRef<TabSwitchRecord[]>([]);
  const currentModule = useRef<string>('portfolio');
  const switchStartTime = useRef<number | null>(null);
  const frameTimestamps = useRef<number[]>([]);
  const rafId = useRef<number | null>(null);

  // Measure initial load time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const measureInitialLoad = () => {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintTiming = performance.getEntriesByType('paint').find(
        (entry) => entry.name === 'first-contentful-paint'
      );

      if (navTiming && paintTiming) {
        setMetrics(prev => ({
          ...prev,
          initialLoadMs: Math.round(paintTiming.startTime),
          ttiMs: Math.round(navTiming.domInteractive),
          isDemoReady: paintTiming.startTime < 2000, // Under 2s = demo ready
        }));
      }
    };

    // Wait for paint events to be available
    if (document.readyState === 'complete') {
      setTimeout(measureInitialLoad, 100);
    } else {
      window.addEventListener('load', () => setTimeout(measureInitialLoad, 100));
    }
  }, []);

  // Measure memory (Chrome only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const measureMemory = () => {
      // @ts-ignore - Chrome-specific API
      const memory = (performance as any).memory;
      if (memory) {
        setMetrics(prev => ({
          ...prev,
          heapSizeMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        }));
      }
    };

    // Initial measurement
    measureMemory();

    // Periodic updates
    const interval = setInterval(measureMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  // FPS monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastTime = performance.now();
    const measureFrame = (currentTime: number) => {
      frameTimestamps.current.push(currentTime);

      // Keep last 60 frames
      if (frameTimestamps.current.length > 60) {
        frameTimestamps.current.shift();
      }

      // Calculate FPS every 30 frames
      if (frameTimestamps.current.length >= 30) {
        const elapsed = currentTime - frameTimestamps.current[0];
        const fps = Math.round((frameTimestamps.current.length / elapsed) * 1000);
        
        setMetrics(prev => ({
          ...prev,
          fps: fps > 0 ? fps : null,
        }));
      }

      rafId.current = requestAnimationFrame(measureFrame);
    };

    rafId.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Start tab switch measurement
  const startTabSwitch = useCallback((fromModule: string) => {
    currentModule.current = fromModule;
    switchStartTime.current = performance.now();
  }, []);

  // End tab switch measurement
  const endTabSwitch = useCallback((toModule: string) => {
    if (switchStartTime.current === null) return;

    const duration = performance.now() - switchStartTime.current;
    const record: TabSwitchRecord = {
      from: currentModule.current,
      to: toModule,
      durationMs: Math.round(duration),
      timestamp: Date.now(),
    };

    tabSwitchHistory.current.push(record);

    // Keep last 50 switches
    if (tabSwitchHistory.current.length > 50) {
      tabSwitchHistory.current.shift();
    }

    // Calculate average
    const totalMs = tabSwitchHistory.current.reduce((sum, r) => sum + r.durationMs, 0);
    const avgMs = Math.round(totalMs / tabSwitchHistory.current.length);

    setMetrics(prev => ({
      ...prev,
      avgTabSwitchMs: avgMs,
      lastTabSwitchMs: record.durationMs,
      tabSwitchCount: tabSwitchHistory.current.length,
      isDemoReady: prev.initialLoadMs !== null && prev.initialLoadMs < 2000 && avgMs < 100,
    }));

    currentModule.current = toModule;
    switchStartTime.current = null;
  }, []);

  // Get tab switch history
  const getTabSwitchHistory = useCallback(() => {
    return [...tabSwitchHistory.current];
  }, []);

  // Reset metrics
  const reset = useCallback(() => {
    tabSwitchHistory.current = [];
    frameTimestamps.current = [];
    setMetrics({
      initialLoadMs: null,
      ttiMs: null,
      avgTabSwitchMs: 0,
      lastTabSwitchMs: null,
      tabSwitchCount: 0,
      heapSizeMB: null,
      fps: null,
      isDemoReady: false,
    });
  }, []);

  return {
    metrics,
    startTabSwitch,
    endTabSwitch,
    getTabSwitchHistory,
    reset,
  };
}

// ============================================
// Performance Display Component
// ============================================

interface PerformanceDisplayProps {
  metrics: PerformanceMetrics;
  variant?: 'minimal' | 'full';
  className?: string;
}

export function PerformanceDisplay({ 
  metrics, 
  variant = 'minimal',
  className = '',
}: PerformanceDisplayProps) {
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-3 text-xs ${className}`}>
        {metrics.initialLoadMs !== null && (
          <div className={`${metrics.initialLoadMs < 2000 ? 'text-accent-green' : 'text-accent-amber'}`}>
            Load: {metrics.initialLoadMs}ms
          </div>
        )}
        {metrics.avgTabSwitchMs > 0 && (
          <div className={`${metrics.avgTabSwitchMs < 100 ? 'text-accent-green' : 'text-accent-amber'}`}>
            Switch: {metrics.avgTabSwitchMs}ms avg
          </div>
        )}
        {metrics.fps !== null && (
          <div className={`${metrics.fps >= 55 ? 'text-accent-green' : metrics.fps >= 30 ? 'text-accent-amber' : 'text-accent-red'}`}>
            {metrics.fps} FPS
          </div>
        )}
        {metrics.isDemoReady && (
          <div className="text-accent-green">✓ Demo Ready</div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-surface-card border border-border rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-text-primary mb-3">Performance Metrics</h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-text-muted">Initial Load</div>
          <div className={`font-mono ${metrics.initialLoadMs !== null && metrics.initialLoadMs < 2000 ? 'text-accent-green' : 'text-accent-amber'}`}>
            {metrics.initialLoadMs !== null ? `${metrics.initialLoadMs}ms` : '–'}
          </div>
        </div>
        <div>
          <div className="text-text-muted">Time to Interactive</div>
          <div className="font-mono text-text-primary">
            {metrics.ttiMs !== null ? `${metrics.ttiMs}ms` : '–'}
          </div>
        </div>
        <div>
          <div className="text-text-muted">Avg Tab Switch</div>
          <div className={`font-mono ${metrics.avgTabSwitchMs < 100 ? 'text-accent-green' : 'text-accent-amber'}`}>
            {metrics.avgTabSwitchMs}ms ({metrics.tabSwitchCount} samples)
          </div>
        </div>
        <div>
          <div className="text-text-muted">Last Switch</div>
          <div className="font-mono text-text-primary">
            {metrics.lastTabSwitchMs !== null ? `${metrics.lastTabSwitchMs}ms` : '–'}
          </div>
        </div>
        <div>
          <div className="text-text-muted">Frame Rate</div>
          <div className={`font-mono ${metrics.fps !== null && metrics.fps >= 55 ? 'text-accent-green' : 'text-accent-amber'}`}>
            {metrics.fps !== null ? `${metrics.fps} FPS` : '–'}
          </div>
        </div>
        <div>
          <div className="text-text-muted">Heap Size</div>
          <div className="font-mono text-text-primary">
            {metrics.heapSizeMB !== null ? `${metrics.heapSizeMB} MB` : '–'}
          </div>
        </div>
      </div>
      <div className={`mt-3 pt-3 border-t border-border text-center ${metrics.isDemoReady ? 'text-accent-green' : 'text-accent-amber'}`}>
        {metrics.isDemoReady ? '✓ Performance is demo-ready' : '⚠ Warming up...'}
      </div>
    </div>
  );
}

export default usePerformance;
