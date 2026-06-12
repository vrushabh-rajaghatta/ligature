

// ============================================================================
// Responsive Utilities - v141
// Hooks and utilities for mobile-responsive layouts
// ============================================================================


import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================
// Breakpoint Definitions
// ============================================

export const BREAKPOINTS = {
  xs: 0,      // Extra small phones
  sm: 640,    // Small phones
  md: 768,    // Tablets
  lg: 1024,   // Small laptops
  xl: 1280,   // Desktops
  '2xl': 1536 // Large screens
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ============================================
// useBreakpoint Hook
// ============================================

/**
 * Returns the current breakpoint based on window width
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      if (typeof window === 'undefined') return 'lg';
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      if (width >= BREAKPOINTS['2xl']) return '2xl';
      if (width >= BREAKPOINTS.xl) return 'xl';
      if (width >= BREAKPOINTS.lg) return 'lg';
      // Phones in landscape: md-range width but short height → treat as sm (mobile)
      if (width >= BREAKPOINTS.md) return height < 600 ? 'sm' : 'md';
      if (width >= BREAKPOINTS.sm) return 'sm';
      return 'xs';
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

// ============================================
// useMediaQuery Hook
// ============================================

/**
 * Returns true if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ============================================
// Device Type Hooks
// ============================================

/**
 * Returns true if the viewport is mobile-sized.
 * Includes phones rotated to landscape: they hit the md breakpoint (768px+)
 * but their viewport height stays short (< 600px), which distinguishes them
 * from tablets that remain tall in landscape (e.g. iPad landscape ≈ 810px tall).
 */
export function useIsMobile(): boolean {
  const isPortraitMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
  const isPhoneInLandscape = useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px) and (max-height: 599px)`
  );
  return isPortraitMobile || isPhoneInLandscape;
}

/**
 * Returns true if the viewport is tablet-sized.
 * Excludes phones in landscape (height < 600px) — those are handled by useIsMobile.
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px) and (min-height: 600px)`
  );
}

/**
 * Returns true if the viewport is desktop-sized
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}

/**
 * Returns true if touch is the primary input
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

// ============================================
// useResponsive Hook (Combined)
// ============================================

export interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  // Convenience properties
  isSmallScreen: boolean;  // xs or sm
  isMediumScreen: boolean; // md
  isLargeScreen: boolean;  // lg or above
  // Layout helpers
  sidebarVisible: boolean;
  compactMode: boolean;
}

/**
 * Combined responsive state hook
 */
export function useResponsive(): ResponsiveState {
  const breakpoint = useBreakpoint();
  const isTouchDevice = useIsTouchDevice();

  return useMemo(() => {
    const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
    const isTablet = breakpoint === 'md';
    const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';

    return {
      breakpoint,
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isSmallScreen: isMobile,
      isMediumScreen: isTablet,
      isLargeScreen: isDesktop,
      sidebarVisible: isDesktop,
      compactMode: isMobile || isTablet,
    };
  }, [breakpoint, isTouchDevice]);
}

// ============================================
// Responsive Value Helper
// ============================================

type ResponsiveValue<T> = {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
  default: T;
};

/**
 * Hook to get a responsive value based on current breakpoint
 */
export function useResponsiveValue<T>(values: ResponsiveValue<T>): T {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    // Order from largest to smallest for fallback
    const order: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const startIndex = order.indexOf(breakpoint);

    // Try to find a value at or below the current breakpoint
    for (let i = startIndex; i < order.length; i++) {
      const bp = order[i];
      if (values[bp] !== undefined) {
        return values[bp] as T;
      }
    }

    return values.default;
  }, [breakpoint, values]);
}

// ============================================
// Responsive Grid Utilities
// ============================================

export type ResponsiveGridConfig = {
  cols: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
    default: number;
  };
  gap?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    default: number;
  };
};

/**
 * Generate responsive grid class names
 */
export function getResponsiveGridClasses(config: ResponsiveGridConfig): string {
  const classes: string[] = [];
  
  // Base columns
  const { cols, gap } = config;
  
  // Column classes
  if (cols.xs) classes.push(`grid-cols-${cols.xs}`);
  else classes.push(`grid-cols-${cols.default}`);
  
  if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
  if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
  if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
  if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
  if (cols['2xl']) classes.push(`2xl:grid-cols-${cols['2xl']}`);
  
  // Gap classes
  if (gap) {
    if (gap.xs) classes.push(`gap-${gap.xs}`);
    else classes.push(`gap-${gap.default}`);
    
    if (gap.sm) classes.push(`sm:gap-${gap.sm}`);
    if (gap.md) classes.push(`md:gap-${gap.md}`);
    if (gap.lg) classes.push(`lg:gap-${gap.lg}`);
  }
  
  return classes.join(' ');
}

// ============================================
// Orientation Hook
// ============================================

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    const getOrientation = (): Orientation => {
      if (typeof window === 'undefined') return 'portrait';
      return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    };

    const handleResize = () => {
      setOrientation(getOrientation());
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return orientation;
}

// ============================================
// Sidebar Collapse Hook
// ============================================

export interface SidebarState {
  isCollapsed: boolean;
  isVisible: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  show: () => void;
  hide: () => void;
}

/**
 * Manages sidebar visibility and collapsed state across breakpoints
 */
export function useSidebarState(): SidebarState {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);

  // On desktop, sidebar is always visible (collapsed or expanded)
  // On mobile/tablet, sidebar visibility is controlled by mobileVisible
  const isVisible = isDesktop || mobileVisible;

  // Auto-collapse on tablet
  useEffect(() => {
    if (isTablet && !isCollapsed) {
      setIsCollapsed(true);
    }
    if (isDesktop && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isTablet, isDesktop]);

  // Hide mobile sidebar on resize to desktop
  useEffect(() => {
    if (isDesktop) {
      setMobileVisible(false);
    }
  }, [isDesktop]);

  const toggle = useCallback(() => {
    if (isMobile || isTablet) {
      setMobileVisible(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  }, [isMobile, isTablet]);

  const expand = useCallback(() => setIsCollapsed(false), []);
  const collapse = useCallback(() => setIsCollapsed(true), []);
  const show = useCallback(() => setMobileVisible(true), []);
  const hide = useCallback(() => setMobileVisible(false), []);

  return {
    isCollapsed: isDesktop ? isCollapsed : false,
    isVisible,
    toggle,
    expand,
    collapse,
    show,
    hide,
  };
}

// ============================================
// Safe Area Insets (for mobile notches/home bars)
// ============================================

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('--sat') || '0', 10),
        right: parseInt(style.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
        left: parseInt(style.getPropertyValue('--sal') || '0', 10),
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}

// Export all hooks
export default {
  useBreakpoint,
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouchDevice,
  useResponsive,
  useResponsiveValue,
  useOrientation,
  useSidebarState,
  useSafeAreaInsets,
};
