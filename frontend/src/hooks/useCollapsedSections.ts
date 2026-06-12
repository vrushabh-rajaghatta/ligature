

/**
 * useCollapsedSections - Persist dashboard section collapse state
 * 
 * v0.35.0: Manages which dashboard sections are collapsed, persisted to localStorage
 * 
 * Usage:
 *   const { isCollapsed, toggle, setCollapsed } = useCollapsedSections('signal-detection');
 *   
 *   <CollapsibleSection 
 *     title="Charts"
 *     defaultExpanded={!isCollapsed('charts')}
 *     onToggle={(expanded) => setCollapsed('charts', !expanded)}
 *   />
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'ligature-collapsed-sections';

export interface UseCollapsedSectionsReturn {
  /** Check if a section is collapsed */
  isCollapsed: (sectionId: string) => boolean;
  /** Toggle a section's collapsed state */
  toggle: (sectionId: string) => void;
  /** Set a section's collapsed state explicitly */
  setCollapsed: (sectionId: string, collapsed: boolean) => void;
  /** Collapse all sections */
  collapseAll: () => void;
  /** Expand all sections */
  expandAll: () => void;
  /** Get all collapsed section IDs */
  collapsedSections: Set<string>;
}

export function useCollapsedSections(moduleId: string): UseCollapsedSectionsReturn {
  const storageKey = `${STORAGE_KEY_PREFIX}-${moduleId}`;
  
  // Initialize from localStorage
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load collapsed sections from localStorage:', e);
    }
    return new Set();
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(collapsedSections)));
    } catch (e) {
      console.warn('Failed to save collapsed sections to localStorage:', e);
    }
  }, [collapsedSections, storageKey]);

  const isCollapsed = useCallback((sectionId: string): boolean => {
    return collapsedSections.has(sectionId);
  }, [collapsedSections]);

  const toggle = useCallback((sectionId: string): void => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const setCollapsed = useCallback((sectionId: string, collapsed: boolean): void => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (collapsed) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback((): void => {
    // This would need to know all section IDs - typically called with specific sections
    // For now, this is a placeholder that could be enhanced
  }, []);

  const expandAll = useCallback((): void => {
    setCollapsedSections(new Set());
  }, []);

  return {
    isCollapsed,
    toggle,
    setCollapsed,
    collapseAll,
    expandAll,
    collapsedSections,
  };
}

export default useCollapsedSections;
