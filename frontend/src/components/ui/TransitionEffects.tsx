// ============================================================================
// Transition Effects - v136: Smooth animations and page transition utilities
// Provides consistent animation primitives across the platform
// ============================================================================


import { useState, useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ============================================================================
// ANIMATION TIMING CONSTANTS
// ============================================================================

export const ANIMATION_DURATION = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const

export const EASING = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const

// ============================================================================
// FADE TRANSITION
// ============================================================================

interface FadeTransitionProps {
  show: boolean
  children: ReactNode
  duration?: keyof typeof ANIMATION_DURATION
  className?: string
  onExited?: () => void
}

export function FadeTransition({ 
  show, 
  children, 
  duration = 'normal',
  className = '',
  onExited 
}: FadeTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (show) {
      setShouldRender(true)
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setShouldRender(false)
        onExited?.()
      }, ANIMATION_DURATION[duration])
      return () => clearTimeout(timer)
    }
  }, [show, duration, onExited])
  
  if (!shouldRender) return null
  
  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${ANIMATION_DURATION[duration]}ms ${EASING.default}`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// SLIDE TRANSITION
// ============================================================================

type SlideDirection = 'up' | 'down' | 'left' | 'right'

interface SlideTransitionProps {
  show: boolean
  children: ReactNode
  direction?: SlideDirection
  duration?: keyof typeof ANIMATION_DURATION
  distance?: number
  className?: string
}

const getSlideTransform = (direction: SlideDirection, distance: number, isVisible: boolean) => {
  if (isVisible) return 'translate3d(0, 0, 0)'
  
  switch (direction) {
    case 'up': return `translate3d(0, ${distance}px, 0)`
    case 'down': return `translate3d(0, -${distance}px, 0)`
    case 'left': return `translate3d(${distance}px, 0, 0)`
    case 'right': return `translate3d(-${distance}px, 0, 0)`
  }
}

export function SlideTransition({
  show,
  children,
  direction = 'up',
  duration = 'normal',
  distance = 20,
  className = '',
}: SlideTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (show) {
      setShouldRender(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, ANIMATION_DURATION[duration])
      return () => clearTimeout(timer)
    }
  }, [show, duration])
  
  if (!shouldRender) return null
  
  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getSlideTransform(direction, distance, isVisible),
        transition: `all ${ANIMATION_DURATION[duration]}ms ${EASING.easeOut}`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// SCALE TRANSITION
// ============================================================================

interface ScaleTransitionProps {
  show: boolean
  children: ReactNode
  duration?: keyof typeof ANIMATION_DURATION
  initialScale?: number
  className?: string
}

export function ScaleTransition({
  show,
  children,
  duration = 'normal',
  initialScale = 0.95,
  className = '',
}: ScaleTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (show) {
      setShouldRender(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, ANIMATION_DURATION[duration])
      return () => clearTimeout(timer)
    }
  }, [show, duration])
  
  if (!shouldRender) return null
  
  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : `scale(${initialScale})`,
        transition: `all ${ANIMATION_DURATION[duration]}ms ${EASING.spring}`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// PAGE TRANSITION WRAPPER
// ============================================================================

interface PageTransitionProps {
  children: ReactNode
  transitionKey: string
  className?: string
}

export function PageTransition({ children, transitionKey, className = '' }: PageTransitionProps) {
  const [displayChildren, setDisplayChildren] = useState(children)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prevKeyRef = useRef(transitionKey)
  
  useEffect(() => {
    if (prevKeyRef.current !== transitionKey) {
      setIsTransitioning(true)
      
      // Fade out
      const fadeOutTimer = setTimeout(() => {
        setDisplayChildren(children)
        prevKeyRef.current = transitionKey
        
        // Fade in
        requestAnimationFrame(() => {
          setIsTransitioning(false)
        })
      }, ANIMATION_DURATION.fast)
      
      return () => clearTimeout(fadeOutTimer)
    } else {
      setDisplayChildren(children)
    }
  }, [children, transitionKey])
  
  return (
    <div
      className={className}
      style={{
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
        transition: `all ${ANIMATION_DURATION.fast}ms ${EASING.easeOut}`,
      }}
    >
      {displayChildren}
    </div>
  )
}

// ============================================================================
// STAGGER ANIMATION
// ============================================================================

interface StaggerChildProps {
  index: number
  children: ReactNode
  baseDelay?: number
  staggerDelay?: number
  className?: string
}

export function StaggerChild({ 
  index, 
  children, 
  baseDelay = 0,
  staggerDelay = 50,
  className = '' 
}: StaggerChildProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, baseDelay + (index * staggerDelay))
    
    return () => clearTimeout(timer)
  }, [index, baseDelay, staggerDelay])
  
  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: `all ${ANIMATION_DURATION.normal}ms ${EASING.easeOut}`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// SKELETON PULSE ANIMATION
// ============================================================================

interface SkeletonPulseProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

export function SkeletonPulse({ 
  className = '', 
  width, 
  height,
  rounded = 'md' 
}: SkeletonPulseProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }
  
  return (
    <div
      className={`bg-slate-200 animate-pulse ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
    />
  )
}

// ============================================================================
// SHIMMER EFFECT
// ============================================================================

interface ShimmerProps {
  className?: string
  children?: ReactNode
}

export function Shimmer({ className = '', children }: ShimmerProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        }}
      />
    </div>
  )
}

// ============================================================================
// CSS KEYFRAMES (add to globals.css)
// ============================================================================

export const ANIMATION_KEYFRAMES = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`

// ============================================================================
// UTILITY CLASSES
// ============================================================================

export const TRANSITION_CLASSES = {
  fadeIn: 'animate-[fadeInUp_250ms_ease-out]',
  fadeInDown: 'animate-[fadeInDown_250ms_ease-out]',
  scaleIn: 'animate-[scaleIn_250ms_ease-out]',
  slideInRight: 'animate-[slideInFromRight_250ms_ease-out]',
  slideInLeft: 'animate-[slideInFromLeft_250ms_ease-out]',
  
  // Tailwind transition presets
  base: 'transition-all duration-200 ease-out',
  fast: 'transition-all duration-150 ease-out',
  slow: 'transition-all duration-300 ease-out',
  spring: 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
}
