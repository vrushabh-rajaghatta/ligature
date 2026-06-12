
/**
 * NavigationTransition - v117
 * 
 * Smooth fade/slide transitions for screen and tab changes.
 * Provides perceived polish and professional UX.
 * 
 * Features:
 * - Fade transition for screen changes
 * - Slide transitions for tab switches
 * - Configurable duration and easing
 * - SSR-safe implementation
 */

import React, { useEffect, useState, useRef } from 'react';

export interface TransitionProps {
  /** Unique key to trigger transition on change */
  transitionKey: string | number;
  /** Transition type */
  type?: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'scale';
  /** Duration in ms */
  duration?: number;
  /** CSS easing function */
  easing?: string;
  /** Children to render */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function NavigationTransition({
  transitionKey,
  type = 'fade',
  duration = 150,
  easing = 'ease-out',
  children,
  className = '',
}: TransitionProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentChildren, setCurrentChildren] = useState(children);
  const previousKeyRef = useRef(transitionKey);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (transitionKey !== previousKeyRef.current) {
      // Key changed - start exit transition
      setIsVisible(false);
      
      // After exit transition, update children and start enter
      timeoutRef.current = setTimeout(() => {
        setCurrentChildren(children);
        setIsVisible(true);
        previousKeyRef.current = transitionKey;
      }, duration);
    } else {
      // Same key - just update children directly
      setCurrentChildren(children);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [transitionKey, children, duration]);

  const getTransitionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
    };

    if (type === 'fade') {
      return {
        ...base,
        opacity: isVisible ? 1 : 0,
      };
    }

    if (type === 'slide-left') {
      return {
        ...base,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-8px)',
      };
    }

    if (type === 'slide-right') {
      return {
        ...base,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(8px)',
      };
    }

    if (type === 'slide-up') {
      return {
        ...base,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
      };
    }

    if (type === 'scale') {
      return {
        ...base,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.98)',
      };
    }

    return base;
  };

  return (
    <div className={className} style={getTransitionStyles()}>
      {currentChildren}
    </div>
  );
}

/**
 * Simple wrapper that only provides CSS transition classes
 * Useful when you control visibility externally
 */
export function TransitionWrapper({
  show,
  type = 'fade',
  duration = 150,
  children,
  className = '',
}: {
  show: boolean;
  type?: 'fade' | 'slide-up' | 'scale';
  duration?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const baseClasses = 'transition-all';
  const durationClass = duration === 150 ? 'duration-150' : 
                        duration === 200 ? 'duration-200' :
                        duration === 300 ? 'duration-300' : 'duration-150';
  
  const visibilityClasses = show
    ? 'opacity-100 translate-y-0 scale-100'
    : type === 'fade' 
      ? 'opacity-0'
      : type === 'slide-up'
        ? 'opacity-0 translate-y-2'
        : 'opacity-0 scale-95';

  return (
    <div className={`${baseClasses} ${durationClass} ${visibilityClasses} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Tab content transition - optimized for tab switches
 */
export function TabTransition({
  activeIndex,
  previousIndex,
  children,
  className = '',
}: {
  activeIndex: number;
  previousIndex: number | null;
  children: React.ReactNode;
  className?: string;
}) {
  const direction = previousIndex !== null && activeIndex > previousIndex ? 'right' : 'left';
  
  return (
    <NavigationTransition
      transitionKey={activeIndex}
      type={direction === 'right' ? 'slide-left' : 'slide-right'}
      duration={150}
      className={className}
    >
      {children}
    </NavigationTransition>
  );
}

export default NavigationTransition;
