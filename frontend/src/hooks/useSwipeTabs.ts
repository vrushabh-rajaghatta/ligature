

import { useCallback, useRef, type RefObject } from 'react';

/**
 * useSwipeTabs — Adds horizontal swipe gesture to switch between tabs on mobile.
 * 
 * Detects left/right swipe on a content area and calls onTabChange with the
 * next/previous tab id. Only triggers on fast, intentional horizontal swipes
 * (not slow scrolls or vertical drags).
 * 
 * Usage:
 *   const { contentRef } = useSwipeTabs({
 *     tabs: ['overview', 'cases', 'analytics'],
 *     activeTab: 'cases',
 *     onTabChange: setActiveTab,
 *   });
 *   
 *   <div ref={contentRef} className="flex-1 overflow-y-auto">
 *     {renderTabContent()}
 *   </div>
 */

interface UseSwipeTabsOptions {
  /** Ordered list of tab ids */
  tabs: string[];
  /** Currently active tab id */
  activeTab: string;
  /** Callback when swipe triggers tab change */
  onTabChange: (tabId: string) => void;
  /** Minimum horizontal distance (px) to trigger swipe (default: 50) */
  swipeThreshold?: number;
  /** Maximum vertical distance (px) allowed during swipe (default: 80) */
  verticalLimit?: number;
  /** Maximum time (ms) for swipe gesture (default: 300) */
  maxDuration?: number;
  /** Whether swipe is enabled (default: true, disable for desktop) */
  enabled?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

export function useSwipeTabs<T extends HTMLElement = HTMLDivElement>({
  tabs,
  activeTab,
  onTabChange,
  swipeThreshold = 50,
  verticalLimit = 80,
  maxDuration = 300,
  enabled = true,
}: UseSwipeTabsOptions): { contentRef: RefObject<T | null> } {
  const ref = useRef<T>(null);
  const swipeState = useRef<SwipeState | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;
    const touch = e.touches[0];
    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !swipeState.current || e.changedTouches.length !== 1) return;
    
    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = swipeState.current;
    swipeState.current = null;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const elapsed = Date.now() - startTime;

    // Must be fast enough
    if (elapsed > maxDuration) return;
    // Must be primarily horizontal
    if (Math.abs(deltaY) > verticalLimit) return;
    // Must exceed threshold
    if (Math.abs(deltaX) < swipeThreshold) return;

    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    if (deltaX < 0 && currentIndex < tabs.length - 1) {
      // Swipe left → next tab
      onTabChange(tabs[currentIndex + 1]);
    } else if (deltaX > 0 && currentIndex > 0) {
      // Swipe right → previous tab
      onTabChange(tabs[currentIndex - 1]);
    }
  }, [enabled, tabs, activeTab, onTabChange, swipeThreshold, verticalLimit, maxDuration]);

  // Attach listeners via ref callback pattern
  const prevEl = useRef<T | null>(null);
  
  const contentRef = useCallback((el: T | null) => {
    // Cleanup previous
    if (prevEl.current) {
      prevEl.current.removeEventListener('touchstart', handleTouchStart as EventListener);
      prevEl.current.removeEventListener('touchend', handleTouchEnd as EventListener);
    }
    
    // Attach to new
    if (el) {
      el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
      el.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    }
    
    prevEl.current = el;
    (ref as React.MutableRefObject<T | null>).current = el;
  }, [handleTouchStart, handleTouchEnd]);

  // Return as RefObject-compatible
  return { contentRef: { current: ref.current } as RefObject<T | null> };
}

/**
 * Simpler version that returns event handlers instead of a ref.
 * Use this when you need to attach to an element that already has a ref.
 * 
 * Usage:
 *   const swipeHandlers = useSwipeTabHandlers({ tabs, activeTab, onTabChange });
 *   <div {...swipeHandlers}>content</div>
 */
export function useSwipeTabHandlers({
  tabs,
  activeTab,
  onTabChange,
  swipeThreshold = 50,
  verticalLimit = 80,
  maxDuration = 300,
  enabled = true,
}: UseSwipeTabsOptions) {
  const swipeState = useRef<SwipeState | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 1) return;
    const touch = e.touches[0];
    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, [enabled]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !swipeState.current || e.changedTouches.length !== 1) return;
    
    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = swipeState.current;
    swipeState.current = null;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const elapsed = Date.now() - startTime;

    if (elapsed > maxDuration) return;
    if (Math.abs(deltaY) > verticalLimit) return;
    if (Math.abs(deltaX) < swipeThreshold) return;

    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    if (deltaX < 0 && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1]);
    } else if (deltaX > 0 && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1]);
    }
  }, [enabled, tabs, activeTab, onTabChange, swipeThreshold, verticalLimit, maxDuration]);

  return { onTouchStart, onTouchEnd };
}
