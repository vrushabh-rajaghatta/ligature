
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useScrollFade, type ScrollDirection } from '@/hooks/useScrollFade';

/**
 * ScrollFadeContainer — wraps a scrollable area and applies
 * gradient fade edges based on actual scroll position.
 * 
 * Usage:
 *   <ScrollFadeContainer direction="horizontal" className="overflow-x-auto">
 *     {tabs}
 *   </ScrollFadeContainer>
 * 
 *   <ScrollFadeContainer direction="vertical" className="overflow-y-auto h-[400px]">
 *     {sidebar items}
 *   </ScrollFadeContainer>
 */
interface ScrollFadeContainerProps extends HTMLAttributes<HTMLDivElement> {
  direction?: ScrollDirection;
  /** Extra CSS class for the fade effect (default: auto-selected based on direction) */
  fadeClass?: string;
  children: ReactNode;
}

export const ScrollFadeContainer = forwardRef<HTMLDivElement, ScrollFadeContainerProps>(({
  direction = 'horizontal',
  fadeClass,
  className = '',
  children,
  ...props
}, _ref) => {
  const { ref, dataAttributes } = useScrollFade<HTMLDivElement>({ direction });

  const autoFadeClass = fadeClass ?? (
    direction === 'horizontal' ? 'scroll-fade-x' :
    direction === 'vertical' ? 'scroll-fade-y' :
    'scroll-fade-x scroll-fade-y'
  );

  return (
    <div
      ref={ref}
      className={`${autoFadeClass} ${className}`}
      {...dataAttributes}
      {...props}
    >
      {children}
    </div>
  );
});

ScrollFadeContainer.displayName = 'ScrollFadeContainer';
