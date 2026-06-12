

// ============================================================================
// Animation & Transitions Utilities - v143: Final Polish
// Polished animation hooks with configurable timing and easing
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type EasingFunction = 
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | 'bounce'
  | 'snap';

export type AnimationTiming = {
  duration: number;     // ms
  delay?: number;       // ms
  easing: EasingFunction;
};

export interface TransitionConfig {
  enter: AnimationTiming;
  exit: AnimationTiming;
  stagger?: number;     // ms between staggered items
}

export interface AnimationState {
  isAnimating: boolean;
  progress: number;     // 0-1
  phase: 'idle' | 'entering' | 'entered' | 'exiting' | 'exited';
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

export const EASING_CSS: Record<EasingFunction, string> = {
  linear: 'linear',
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  snap: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
};

// JavaScript easing functions for programmatic animations
export const EASING_JS: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  ease: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  spring: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  snap: (t) => t * t * (3 - 2 * t),
};

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export const ANIMATION_PRESETS = {
  // Fast, snappy transitions for UI feedback
  instant: {
    enter: { duration: 100, easing: 'ease-out' as const },
    exit: { duration: 75, easing: 'ease-in' as const },
  },
  
  // Standard UI transitions
  standard: {
    enter: { duration: 200, easing: 'ease-out' as const },
    exit: { duration: 150, easing: 'ease-in' as const },
  },
  
  // Smooth, polished transitions
  smooth: {
    enter: { duration: 300, easing: 'ease-in-out' as const },
    exit: { duration: 250, easing: 'ease-in-out' as const },
  },
  
  // Spring-like bounce for emphasis
  spring: {
    enter: { duration: 400, easing: 'spring' as const },
    exit: { duration: 300, easing: 'ease-out' as const },
  },
  
  // Modal/overlay transitions
  modal: {
    enter: { duration: 250, delay: 50, easing: 'ease-out' as const },
    exit: { duration: 200, easing: 'ease-in' as const },
  },
  
  // Page/module transitions
  page: {
    enter: { duration: 350, easing: 'ease-in-out' as const },
    exit: { duration: 250, easing: 'ease-in' as const },
  },
  
  // List item stagger
  staggerList: {
    enter: { duration: 250, easing: 'ease-out' as const },
    exit: { duration: 150, easing: 'ease-in' as const },
    stagger: 50,
  },
  
  // Subtle fade
  fade: {
    enter: { duration: 200, easing: 'linear' as const },
    exit: { duration: 150, easing: 'linear' as const },
  },
  
  // Scale up from center
  scale: {
    enter: { duration: 250, easing: 'spring' as const },
    exit: { duration: 200, easing: 'ease-in' as const },
  },
  
  // Slide from side
  slide: {
    enter: { duration: 300, easing: 'ease-out' as const },
    exit: { duration: 250, easing: 'ease-in' as const },
  },
} as const;

export type AnimationPreset = keyof typeof ANIMATION_PRESETS;

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for managing enter/exit animation states
 */
export function useTransition(
  isVisible: boolean,
  config: TransitionConfig | AnimationPreset = 'standard'
): AnimationState & { shouldRender: boolean } {
  const resolvedConfig = typeof config === 'string' ? ANIMATION_PRESETS[config] : config;
  
  const [phase, setPhase] = useState<AnimationState['phase']>(
    isVisible ? 'entered' : 'exited'
  );
  const [shouldRender, setShouldRender] = useState(isVisible);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (isVisible) {
      setShouldRender(true);
      setPhase('entering');
      
      const delay = 'delay' in resolvedConfig.enter ? (resolvedConfig.enter.delay || 0) : 0;
      const duration = resolvedConfig.enter.duration;
      
      timeoutRef.current = setTimeout(() => {
        setPhase('entered');
      }, delay + duration);
    } else {
      setPhase('exiting');
      
      const duration = resolvedConfig.exit.duration;
      
      timeoutRef.current = setTimeout(() => {
        setPhase('exited');
        setShouldRender(false);
      }, duration);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, resolvedConfig]);
  
  return {
    isAnimating: phase === 'entering' || phase === 'exiting',
    progress: phase === 'entered' ? 1 : phase === 'exited' ? 0 : 0.5,
    phase,
    shouldRender,
  };
}

/**
 * Hook for staggered list animations
 */
export function useStaggeredList<T>(
  items: T[],
  config: TransitionConfig | AnimationPreset = 'staggerList'
): { visibleItems: T[]; getDelay: (index: number) => number } {
  const resolvedConfig = typeof config === 'string' ? ANIMATION_PRESETS[config] : config;
  const stagger = 'stagger' in resolvedConfig ? (resolvedConfig.stagger || 50) : 50;
  
  const [visibleCount, setVisibleCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setVisibleCount(0);
    
    const revealNext = (index: number) => {
      if (index >= items.length) return;
      
      timeoutRef.current = setTimeout(() => {
        setVisibleCount(index + 1);
        revealNext(index + 1);
      }, stagger);
    };
    
    revealNext(0);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [items.length, stagger]);
  
  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );
  
  const getDelay = useCallback(
    (index: number) => index * stagger,
    [stagger]
  );
  
  return { visibleItems, getDelay };
}

/**
 * Hook for animated value interpolation
 */
export function useAnimatedValue(
  targetValue: number,
  duration: number = 300,
  easing: EasingFunction = 'ease-out'
): number {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(targetValue);
  
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    startTimeRef.current = performance.now();
    startValueRef.current = currentValue;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) return;
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = EASING_JS[easing](progress);
      
      const newValue = startValueRef.current + (targetValue - startValueRef.current) * easedProgress;
      setCurrentValue(newValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, easing]);
  
  return currentValue;
}

/**
 * Hook for progress bar animations
 */
export function useProgressAnimation(
  progress: number,
  config: { duration?: number; easing?: EasingFunction } = {}
): { animatedProgress: number; isAnimating: boolean } {
  const { duration = 500, easing = 'ease-out' } = config;
  const animatedProgress = useAnimatedValue(progress, duration, easing);
  
  return {
    animatedProgress,
    isAnimating: Math.abs(animatedProgress - progress) > 0.01,
  };
}

/**
 * Hook for counting animations (numbers going up/down)
 */
export function useCountAnimation(
  targetValue: number,
  config: { duration?: number; easing?: EasingFunction; formatValue?: (v: number) => string } = {}
): { value: number; formattedValue: string; isAnimating: boolean } {
  const { duration = 1000, easing = 'ease-out', formatValue = (v) => Math.round(v).toString() } = config;
  const animatedValue = useAnimatedValue(targetValue, duration, easing);
  
  return {
    value: animatedValue,
    formattedValue: formatValue(animatedValue),
    isAnimating: Math.abs(animatedValue - targetValue) > 0.5,
  };
}

/**
 * Hook for typewriter text effect
 */
export function useTypewriter(
  text: string,
  config: { speed?: number; delay?: number; cursor?: boolean } = {}
): { displayText: string; isTyping: boolean; cursorVisible: boolean } {
  const { speed = 50, delay = 0, cursor = true } = config;
  
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(cursor);
  
  useEffect(() => {
    setDisplayText('');
    setIsTyping(false);
    
    const startTimeout = setTimeout(() => {
      setIsTyping(true);
      let currentIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
        }
      }, speed);
      
      return () => clearInterval(typeInterval);
    }, delay);
    
    return () => clearTimeout(startTimeout);
  }, [text, speed, delay]);
  
  // Cursor blink effect
  useEffect(() => {
    if (!cursor) return;
    
    const blinkInterval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    
    return () => clearInterval(blinkInterval);
  }, [cursor]);
  
  return { displayText, isTyping, cursorVisible };
}

/**
 * Hook for pulse/heartbeat animations
 */
export function usePulse(
  interval: number = 2000
): { isPulsing: boolean; pulseCount: number } {
  const [isPulsing, setIsPulsing] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setIsPulsing(true);
      setPulseCount((c) => c + 1);
      
      setTimeout(() => setIsPulsing(false), 300);
    }, interval);
    
    return () => clearInterval(pulseInterval);
  }, [interval]);
  
  return { isPulsing, pulseCount };
}

/**
 * Hook for shimmer/skeleton loading effect
 */
export function useShimmer(): { shimmerClass: string } {
  return {
    shimmerClass: 'animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]',
  };
}

// ============================================================================
// CSS CLASS GENERATORS
// ============================================================================

/**
 * Generate CSS transition classes
 */
export function getTransitionClasses(
  config: TransitionConfig | AnimationPreset,
  phase: AnimationState['phase']
): string {
  const resolvedConfig = typeof config === 'string' ? ANIMATION_PRESETS[config] : config;
  
  const timing = phase === 'entering' || phase === 'entered' 
    ? resolvedConfig.enter 
    : resolvedConfig.exit;
  
  const easingCss = EASING_CSS[timing.easing];
  const hasDelay = 'delay' in timing && timing.delay;
  
  return `transition-all duration-[${timing.duration}ms] ${hasDelay ? `delay-[${timing.delay}ms]` : ''} [transition-timing-function:${easingCss}]`;
}

/**
 * Generate fade classes based on phase
 */
export function getFadeClasses(phase: AnimationState['phase']): string {
  switch (phase) {
    case 'entering':
    case 'entered':
      return 'opacity-100';
    case 'exiting':
    case 'exited':
    case 'idle':
      return 'opacity-0';
  }
}

/**
 * Generate scale classes based on phase
 */
export function getScaleClasses(phase: AnimationState['phase']): string {
  switch (phase) {
    case 'entering':
    case 'entered':
      return 'scale-100';
    case 'exiting':
    case 'exited':
    case 'idle':
      return 'scale-95';
  }
}

/**
 * Generate slide classes based on phase and direction
 */
export function getSlideClasses(
  phase: AnimationState['phase'],
  direction: 'up' | 'down' | 'left' | 'right' = 'up'
): string {
  const isVisible = phase === 'entering' || phase === 'entered';
  
  const translations: Record<string, string> = {
    up: isVisible ? 'translate-y-0' : 'translate-y-4',
    down: isVisible ? 'translate-y-0' : '-translate-y-4',
    left: isVisible ? 'translate-x-0' : 'translate-x-4',
    right: isVisible ? 'translate-x-0' : '-translate-x-4',
  };
  
  return translations[direction];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create CSS keyframes for custom animations
 */
export function createKeyframes(
  name: string,
  frames: Record<string, Record<string, string>>
): string {
  const frameStrings = Object.entries(frames)
    .map(([key, styles]) => {
      const styleString = Object.entries(styles)
        .map(([prop, value]) => `${prop}: ${value}`)
        .join('; ');
      return `${key} { ${styleString} }`;
    })
    .join(' ');
  
  return `@keyframes ${name} { ${frameStrings} }`;
}

/**
 * Delay helper for sequencing animations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run animations in sequence
 */
export async function sequence(
  animations: Array<() => Promise<void> | void>,
  delayBetween: number = 0
): Promise<void> {
  for (const animation of animations) {
    await animation();
    if (delayBetween > 0) {
      await delay(delayBetween);
    }
  }
}

// ============================================================================
// PRESET CSS ANIMATIONS (for tailwind config)
// ============================================================================

export const TAILWIND_ANIMATION_KEYFRAMES = {
  shimmer: {
    '0%': { 'background-position': '-200% 0' },
    '100%': { 'background-position': '200% 0' },
  },
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  fadeOut: {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  slideUp: {
    '0%': { transform: 'translateY(10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  slideDown: {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  scaleIn: {
    '0%': { transform: 'scale(0.95)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  scaleOut: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '100%': { transform: 'scale(0.95)', opacity: '0' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-5px)' },
  },
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
};

export const TAILWIND_ANIMATIONS = {
  shimmer: 'shimmer 2s infinite linear',
  fadeIn: 'fadeIn 200ms ease-out',
  fadeOut: 'fadeOut 150ms ease-in',
  slideUp: 'slideUp 250ms ease-out',
  slideDown: 'slideDown 250ms ease-out',
  scaleIn: 'scaleIn 200ms ease-out',
  scaleOut: 'scaleOut 150ms ease-in',
  pulse: 'pulse 2s infinite ease-in-out',
  bounce: 'bounce 1s infinite ease-in-out',
  spin: 'spin 1s infinite linear',
};
