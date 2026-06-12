

// ============================================================================
// Accessibility Utilities - v142: Final POC Validation
// Focus management, ARIA helpers, and accessibility audit tools
// ============================================================================

import { useEffect, useCallback, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface A11yIssue {
  type: 'error' | 'warning' | 'suggestion';
  code: string;
  message: string;
  element?: string;
  suggestion?: string;
}

export interface FocusTrapOptions {
  initialFocus?: string | HTMLElement;
  returnFocus?: boolean;
  allowOutsideClick?: boolean;
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Hook to trap focus within a container
 * Useful for modals, dialogs, and overlays
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean,
  options: FocusTrapOptions = {}
) {
  const { initialFocus, returnFocus = true, allowOutsideClick = false } = options;
  const previousFocus = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    // Store previously focused element
    if (returnFocus) {
      previousFocus.current = document.activeElement as HTMLElement;
    }
    
    // Get focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    };
    
    // Set initial focus
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      if (initialFocus) {
        const target = typeof initialFocus === 'string'
          ? containerRef.current?.querySelector<HTMLElement>(initialFocus)
          : initialFocus;
        target?.focus();
      } else {
        focusableElements[0].focus();
      }
    }
    
    // Handle tab key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      
      const elements = getFocusableElements();
      if (elements.length === 0) return;
      
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    // Handle click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !allowOutsideClick &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    if (!allowOutsideClick) {
      document.addEventListener('click', handleClickOutside, true);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside, true);
      
      // Return focus
      if (returnFocus && previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [isActive, containerRef, initialFocus, returnFocus, allowOutsideClick]);
}

/**
 * Hook to manage focus ring visibility
 * Shows focus rings only for keyboard navigation
 */
export function useFocusVisible() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };
    
    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  return isKeyboardUser;
}

/**
 * Hook to announce content to screen readers
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!announceRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.setAttribute('role', 'status');
      announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    }
    
    return () => {
      if (announceRef.current) {
        document.body.removeChild(announceRef.current);
        announceRef.current = null;
      }
    };
  }, []);
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      // Clear first to ensure announcement
      announceRef.current.textContent = '';
      // Small delay then set message
      requestAnimationFrame(() => {
        if (announceRef.current) {
          announceRef.current.textContent = message;
        }
      });
    }
  }, []);
  
  return announce;
}

// ============================================================================
// ARIA HELPERS
// ============================================================================

/**
 * Generate ARIA IDs for complex components
 */
export function useAriaIds(prefix: string) {
  const id = useRef(`${prefix}-${Math.random().toString(36).substr(2, 9)}`);
  
  return {
    root: id.current,
    label: `${id.current}-label`,
    description: `${id.current}-description`,
    error: `${id.current}-error`,
    listbox: `${id.current}-listbox`,
    option: (index: number) => `${id.current}-option-${index}`,
    tab: (index: number) => `${id.current}-tab-${index}`,
    tabpanel: (index: number) => `${id.current}-tabpanel-${index}`,
  };
}

/**
 * Hook for managing roving tabindex in lists/grids
 */
export function useRovingTabindex<T extends HTMLElement>(
  items: React.RefObject<T>[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
  } = {}
) {
  const { orientation = 'vertical', loop = true } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      const isVertical = orientation === 'vertical' || orientation === 'both';
      
      let nextIndex = index;
      
      switch (event.key) {
        case 'ArrowRight':
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = loop
              ? (index + 1) % items.length
              : Math.min(index + 1, items.length - 1);
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = loop
              ? (index - 1 + items.length) % items.length
              : Math.max(index - 1, 0);
          }
          break;
        case 'ArrowDown':
          if (isVertical) {
            event.preventDefault();
            nextIndex = loop
              ? (index + 1) % items.length
              : Math.min(index + 1, items.length - 1);
          }
          break;
        case 'ArrowUp':
          if (isVertical) {
            event.preventDefault();
            nextIndex = loop
              ? (index - 1 + items.length) % items.length
              : Math.max(index - 1, 0);
          }
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = items.length - 1;
          break;
      }
      
      if (nextIndex !== index) {
        setFocusedIndex(nextIndex);
        items[nextIndex]?.current?.focus();
      }
    },
    [items, orientation, loop]
  );
  
  return {
    focusedIndex,
    getTabIndex: (index: number) => (index === focusedIndex ? 0 : -1),
    handleKeyDown,
    setFocusedIndex,
  };
}

// ============================================================================
// ACCESSIBILITY AUDIT
// ============================================================================

/**
 * Run a quick accessibility audit on the current page
 * Returns list of issues found
 */
export function runA11yAudit(): A11yIssue[] {
  if (typeof document === 'undefined') return [];
  
  const issues: A11yIssue[] = [];
  
  // Check images for alt text
  document.querySelectorAll('img').forEach((img, index) => {
    if (!img.alt && !img.getAttribute('aria-hidden')) {
      issues.push({
        type: 'error',
        code: 'IMG_ALT',
        message: `Image #${index + 1} is missing alt text`,
        element: img.src.substring(0, 50),
        suggestion: 'Add descriptive alt text or aria-hidden="true" for decorative images',
      });
    }
  });
  
  // Check buttons for accessible names
  document.querySelectorAll('button').forEach((button, index) => {
    const hasText = button.textContent?.trim();
    const hasAriaLabel = button.getAttribute('aria-label');
    const hasAriaLabelledby = button.getAttribute('aria-labelledby');
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
      issues.push({
        type: 'error',
        code: 'BUTTON_NAME',
        message: `Button #${index + 1} has no accessible name`,
        element: button.outerHTML.substring(0, 100),
        suggestion: 'Add text content, aria-label, or aria-labelledby',
      });
    }
  });
  
  // Check links for accessible names
  document.querySelectorAll('a').forEach((link, index) => {
    const hasText = link.textContent?.trim();
    const hasAriaLabel = link.getAttribute('aria-label');
    
    if (!hasText && !hasAriaLabel) {
      issues.push({
        type: 'error',
        code: 'LINK_NAME',
        message: `Link #${index + 1} has no accessible name`,
        element: link.href?.substring(0, 50) || 'unknown',
        suggestion: 'Add text content or aria-label',
      });
    }
  });
  
  // Check form inputs for labels
  document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((input, index) => {
    const id = input.id;
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label');
    const hasAriaLabelledby = input.getAttribute('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
      issues.push({
        type: 'error',
        code: 'INPUT_LABEL',
        message: `Form input #${index + 1} has no associated label`,
        element: input.outerHTML.substring(0, 100),
        suggestion: 'Add a label element or aria-label',
      });
    }
  });
  
  // Check for heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1]);
    if (level > lastLevel + 1 && lastLevel !== 0) {
      issues.push({
        type: 'warning',
        code: 'HEADING_ORDER',
        message: `Heading level skipped from h${lastLevel} to h${level}`,
        element: heading.textContent?.substring(0, 50) || '',
        suggestion: 'Use sequential heading levels (h1 → h2 → h3)',
      });
    }
    lastLevel = level;
  });
  
  // Check for multiple h1s
  const h1s = document.querySelectorAll('h1');
  if (h1s.length > 1) {
    issues.push({
      type: 'warning',
      code: 'MULTIPLE_H1',
      message: `Page has ${h1s.length} h1 elements`,
      suggestion: 'Consider having only one h1 per page',
    });
  }
  
  // Check color contrast (basic check)
  document.querySelectorAll('*').forEach((el) => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;
    
    // This is a simplified check - real contrast checking is more complex
    if (color === bgColor && color !== 'rgba(0, 0, 0, 0)') {
      issues.push({
        type: 'warning',
        code: 'COLOR_CONTRAST',
        message: 'Potential color contrast issue',
        element: el.tagName.toLowerCase(),
        suggestion: 'Ensure text has sufficient contrast against background',
      });
    }
  });
  
  // Check for tabindex > 0
  document.querySelectorAll('[tabindex]').forEach((el) => {
    const tabindex = parseInt(el.getAttribute('tabindex') || '0');
    if (tabindex > 0) {
      issues.push({
        type: 'warning',
        code: 'TABINDEX_POSITIVE',
        message: 'Positive tabindex found',
        element: el.tagName.toLowerCase(),
        suggestion: 'Avoid tabindex > 0, use DOM order instead',
      });
    }
  });
  
  // Check for aria-hidden with focusable children
  document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      issues.push({
        type: 'error',
        code: 'ARIA_HIDDEN_FOCUS',
        message: 'aria-hidden element contains focusable children',
        element: el.tagName.toLowerCase(),
        suggestion: 'Add tabindex="-1" to focusable children or restructure',
      });
    }
  });
  
  return issues;
}

/**
 * Hook to run accessibility audit
 */
export function useA11yAudit() {
  const [issues, setIssues] = useState<A11yIssue[]>([]);
  const [lastAudit, setLastAudit] = useState<number | null>(null);
  
  const audit = useCallback(() => {
    const results = runA11yAudit();
    setIssues(results);
    setLastAudit(Date.now());
    return results;
  }, []);
  
  return {
    issues,
    lastAudit,
    audit,
    errorCount: issues.filter(i => i.type === 'error').length,
    warningCount: issues.filter(i => i.type === 'warning').length,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useFocusTrap,
  useFocusVisible,
  useAnnounce,
  useAriaIds,
  useRovingTabindex,
  useA11yAudit,
  runA11yAudit,
};
