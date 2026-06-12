

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useScrollFade — Detects scroll position of a horizontal or vertical container
 * and provides data attributes for CSS-driven gradient fades.
 * 
 * Usage:
 *   const { ref, scrollState } = useScrollFade();
 *   <div ref={ref} className="overflow-x-auto scroll-fade-x" {...scrollState}>
 *     ...
 *   </div>
 * 
 * Or use the convenience component <ScrollFadeContainer>.
 */
export type ScrollDirection = 'horizontal' | 'vertical' | 'both';

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  canScrollUp: boolean;
  canScrollDown: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
}

interface UseScrollFadeOptions {
  direction?: ScrollDirection;
  /** Threshold in px to consider "at edge" (default 2) */
  threshold?: number;
}

export function useScrollFade<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollFadeOptions = {}
) {
  const { direction = 'horizontal', threshold = 2 } = options;
  const ref = useRef<T>(null);
  const [state, setState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
    canScrollUp: false,
    canScrollDown: false,
    isAtStart: true,
    isAtEnd: false,
  });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const newState: ScrollState = {
      canScrollLeft: false,
      canScrollRight: false,
      canScrollUp: false,
      canScrollDown: false,
      isAtStart: true,
      isAtEnd: false,
    };

    if (direction === 'horizontal' || direction === 'both') {
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      newState.canScrollLeft = el.scrollLeft > threshold;
      newState.canScrollRight = el.scrollLeft < maxScrollLeft - threshold;
      newState.isAtStart = el.scrollLeft <= threshold;
      newState.isAtEnd = el.scrollLeft >= maxScrollLeft - threshold;
    }

    if (direction === 'vertical' || direction === 'both') {
      const maxScrollTop = el.scrollHeight - el.clientHeight;
      newState.canScrollUp = el.scrollTop > threshold;
      newState.canScrollDown = el.scrollTop < maxScrollTop - threshold;
      if (direction === 'vertical') {
        newState.isAtStart = el.scrollTop <= threshold;
        newState.isAtEnd = el.scrollTop >= maxScrollTop - threshold;
      }
    }

    setState(prev => {
      // Avoid unnecessary re-renders
      if (
        prev.canScrollLeft === newState.canScrollLeft &&
        prev.canScrollRight === newState.canScrollRight &&
        prev.canScrollUp === newState.canScrollUp &&
        prev.canScrollDown === newState.canScrollDown &&
        prev.isAtStart === newState.isAtStart &&
        prev.isAtEnd === newState.isAtEnd
      ) return prev;
      return newState;
    });
  }, [direction, threshold]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial measurement
    update();

    // Listen for scroll
    el.addEventListener('scroll', update, { passive: true });

    // Listen for resize (content may change)
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [update]);

  // Data attributes for CSS targeting
  const dataAttributes = {
    'data-can-scroll-left': state.canScrollLeft ? 'true' : 'false',
    'data-can-scroll-right': state.canScrollRight ? 'true' : 'false',
    'data-can-scroll-up': state.canScrollUp ? 'true' : 'false',
    'data-can-scroll-down': state.canScrollDown ? 'true' : 'false',
    'data-scroll-start': state.isAtStart ? 'true' : 'false',
    'data-scroll-end': state.isAtEnd ? 'true' : 'false',
  };

  return { ref, state, dataAttributes, update };
}
