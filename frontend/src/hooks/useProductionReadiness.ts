

// ============================================================================
// Production Readiness Utilities - v143: Final Polish
// Build validation, performance benchmarks, and launch prep tools
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
  timestamp: number;
}

export interface ReadinessCheck {
  id: string;
  category: 'build' | 'performance' | 'accessibility' | 'security' | 'browser';
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  details?: string;
  timestamp: number;
}

export interface ReadinessReport {
  timestamp: number;
  overallStatus: 'ready' | 'warning' | 'not-ready';
  passRate: number;
  checks: ReadinessCheck[];
  metrics: PerformanceMetric[];
  recommendations: string[];
}

export interface EnvironmentInfo {
  browser: string;
  browserVersion: string;
  platform: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  screenSize: { width: number; height: number };
  pixelRatio: number;
  touchSupport: boolean;
  connectionType: string;
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
  language: string;
}

// ============================================================================
// PERFORMANCE THRESHOLDS
// ============================================================================

export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, warning: 4000 },
  FID: { good: 100, warning: 300 },
  CLS: { good: 0.1, warning: 0.25 },
  TTFB: { good: 800, warning: 1800 },
  FCP: { good: 1800, warning: 3000 },
  heapSize: { good: 50, warning: 100 },
  fps: { good: 55, warning: 30 },
};

// ============================================================================
// PERFORMANCE MONITORING HOOK
// ============================================================================

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const rafRef = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef<number>(0);

  const collectMetrics = useCallback(() => {
    const newMetrics: PerformanceMetric[] = [];
    const now = Date.now();

    // Frame rate
    const currentFrame = performance.now();
    if (lastFrameRef.current > 0) {
      const frameTime = currentFrame - lastFrameRef.current;
      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const fps = Math.round(1000 / avgFrameTime);
      
      newMetrics.push({
        name: 'FPS',
        value: fps,
        unit: 'fps',
        threshold: PERFORMANCE_THRESHOLDS.fps.good,
        status: fps >= PERFORMANCE_THRESHOLDS.fps.good ? 'good' : fps >= PERFORMANCE_THRESHOLDS.fps.warning ? 'warning' : 'critical',
        timestamp: now,
      });
    }
    lastFrameRef.current = currentFrame;

    // Memory
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const heapMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      newMetrics.push({
        name: 'Heap Size',
        value: heapMB,
        unit: 'MB',
        threshold: PERFORMANCE_THRESHOLDS.heapSize.good,
        status: heapMB <= PERFORMANCE_THRESHOLDS.heapSize.good ? 'good' : heapMB <= PERFORMANCE_THRESHOLDS.heapSize.warning ? 'warning' : 'critical',
        timestamp: now,
      });
    }

    setMetrics(newMetrics);
    if (isMonitoring) rafRef.current = requestAnimationFrame(collectMetrics);
  }, [isMonitoring]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    frameTimesRef.current = [];
    lastFrameRef.current = 0;
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (isMonitoring) rafRef.current = requestAnimationFrame(collectMetrics);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isMonitoring, collectMetrics]);

  return { metrics, isMonitoring, startMonitoring, stopMonitoring };
}

// ============================================================================
// READINESS CHECKS
// ============================================================================

export async function runReadinessChecks(): Promise<ReadinessReport> {
  const checks: ReadinessCheck[] = [];
  const metrics: PerformanceMetric[] = [];
  const recommendations: string[] = [];
  const now = Date.now();

  // Browser checks
  checks.push({
    id: 'browser-es6', category: 'browser', name: 'ES6 Support',
    description: 'Browser supports ES6 features',
    status: typeof Symbol !== 'undefined' ? 'pass' : 'fail', timestamp: now,
  });

  checks.push({
    id: 'browser-flexbox', category: 'browser', name: 'Flexbox Support',
    description: 'CSS Flexbox layout supported',
    status: typeof CSS !== 'undefined' && CSS.supports ? (CSS.supports('display', 'flex') ? 'pass' : 'fail') : 'pass',
    timestamp: now,
  });

  checks.push({
    id: 'browser-grid', category: 'browser', name: 'CSS Grid Support',
    description: 'CSS Grid layout supported',
    status: typeof CSS !== 'undefined' && CSS.supports ? (CSS.supports('display', 'grid') ? 'pass' : 'fail') : 'pass',
    timestamp: now,
  });

  checks.push({
    id: 'browser-localstorage', category: 'browser', name: 'LocalStorage',
    description: 'LocalStorage available',
    status: (() => {
      try { localStorage.setItem('test', 'test'); localStorage.removeItem('test'); return 'pass'; }
      catch { return 'fail'; }
    })(), timestamp: now,
  });

  // Security checks
  checks.push({
    id: 'security-https', category: 'security', name: 'HTTPS',
    description: 'Page served over HTTPS',
    status: typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost') ? 'pass' : 'fail',
    timestamp: now,
  });

  // Accessibility checks
  checks.push({
    id: 'a11y-lang', category: 'accessibility', name: 'Document Language',
    description: 'HTML lang attribute set',
    status: typeof document !== 'undefined' && document.documentElement.lang ? 'pass' : 'warning',
    timestamp: now,
  });

  // Performance checks
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const heapMB = memory.usedJSHeapSize / 1024 / 1024;
    const heapLimit = memory.jsHeapSizeLimit / 1024 / 1024;
    const heapUsage = (heapMB / heapLimit) * 100;
    checks.push({
      id: 'perf-memory', category: 'performance', name: 'Memory Usage',
      description: `Using ${heapMB.toFixed(1)}MB of ${heapLimit.toFixed(0)}MB`,
      status: heapUsage < 50 ? 'pass' : heapUsage < 80 ? 'warning' : 'fail',
      timestamp: now,
    });
  }

  // Generate recommendations
  const failedChecks = checks.filter(c => c.status === 'fail');
  if (failedChecks.some(c => c.category === 'browser')) {
    recommendations.push('Add polyfills for broader browser support');
  }
  if (failedChecks.some(c => c.category === 'security')) {
    recommendations.push('Deploy over HTTPS for production');
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const passRate = (passCount / checks.length) * 100;
  const hasCriticalFail = failedChecks.some(c => c.category === 'security' || c.category === 'browser');

  return {
    timestamp: now,
    overallStatus: hasCriticalFail ? 'not-ready' : failedChecks.length > 0 ? 'warning' : 'ready',
    passRate,
    checks,
    metrics,
    recommendations,
  };
}

export function useReadinessChecks() {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setIsRunning(true);
    try {
      const result = await runReadinessChecks();
      setReport(result);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { report, isRunning, runChecks };
}

// ============================================================================
// ENVIRONMENT INFO
// ============================================================================

export function getEnvironmentInfo(): EnvironmentInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  let browser = 'Unknown', browserVersion = '0';
  if (ua.includes('Chrome')) { browser = 'Chrome'; browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '0'; }
  else if (ua.includes('Firefox')) { browser = 'Firefox'; browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '0'; }
  else if (ua.includes('Safari')) { browser = 'Safari'; browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '0'; }

  let platform = 'Unknown';
  if (ua.includes('Windows')) platform = 'Windows';
  else if (ua.includes('Mac')) platform = 'macOS';
  else if (ua.includes('Linux')) platform = 'Linux';
  else if (ua.includes('Android')) platform = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone')) platform = 'iOS';

  const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const deviceType = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  return {
    browser, browserVersion, platform, deviceType,
    screenSize: { width, height: typeof window !== 'undefined' ? window.innerHeight : 1080 },
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    touchSupport: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    connectionType: typeof navigator !== 'undefined' && 'connection' in navigator ? (navigator as any).connection?.effectiveType || 'unknown' : 'unknown',
    colorScheme: typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    reducedMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
  };
}

// ============================================================================
// LAUNCH CHECKLIST
// ============================================================================

export interface LaunchChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  status: 'complete' | 'incomplete' | 'in-progress';
}

export const LAUNCH_CHECKLIST: LaunchChecklistItem[] = [
  { id: 'build-clean', category: 'Build', title: 'Clean Production Build', description: 'No TypeScript errors', required: true, status: 'incomplete' },
  { id: 'build-optimized', category: 'Build', title: 'Optimized Assets', description: 'Images and code optimized', required: true, status: 'incomplete' },
  { id: 'perf-lcp', category: 'Performance', title: 'LCP < 2.5s', description: 'Largest Contentful Paint', required: true, status: 'incomplete' },
  { id: 'perf-cls', category: 'Performance', title: 'CLS < 0.1', description: 'Cumulative Layout Shift', required: true, status: 'incomplete' },
  { id: 'sec-https', category: 'Security', title: 'HTTPS Enforced', description: 'All traffic over HTTPS', required: true, status: 'incomplete' },
  { id: 'a11y-wcag', category: 'Accessibility', title: 'WCAG 2.1 AA', description: 'Meets accessibility requirements', required: true, status: 'incomplete' },
  { id: 'browser-chrome', category: 'Browsers', title: 'Chrome Tested', description: 'Works in Chrome', required: true, status: 'incomplete' },
  { id: 'browser-firefox', category: 'Browsers', title: 'Firefox Tested', description: 'Works in Firefox', required: true, status: 'incomplete' },
  { id: 'browser-safari', category: 'Browsers', title: 'Safari Tested', description: 'Works in Safari', required: true, status: 'incomplete' },
  { id: 'test-pass', category: 'Testing', title: 'All Tests Pass', description: '3300+ tests passing', required: true, status: 'incomplete' },
  { id: 'demo-ready', category: 'Demo', title: 'Demo Flow Validated', description: 'All 10 demo steps work', required: true, status: 'incomplete' },
];

export function useLaunchChecklist() {
  const [checklist, setChecklist] = useState(LAUNCH_CHECKLIST);

  const updateItem = useCallback((id: string, status: LaunchChecklistItem['status']) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  }, []);

  const getProgress = useCallback(() => {
    const complete = checklist.filter(i => i.status === 'complete').length;
    const required = checklist.filter(i => i.required);
    const requiredComplete = required.filter(i => i.status === 'complete').length;
    return {
      total: checklist.length,
      complete,
      percentage: Math.round((complete / checklist.length) * 100),
      requiredComplete,
      requiredTotal: required.length,
      isReady: requiredComplete === required.length,
    };
  }, [checklist]);

  return { checklist, updateItem, getProgress };
}
