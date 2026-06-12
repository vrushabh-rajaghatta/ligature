


import { useState, useEffect, useCallback } from 'react';
import { ModuleId } from '@/types/core';

const STORAGE_KEY = 'ligature-recent-modules';
const MAX_RECENT = 8;

/**
 * Hook for tracking recently visited modules
 * Persists to localStorage and provides methods for updating
 */
export function useRecentModules() {
  const [recentModules, setRecentModules] = useState<ModuleId[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentModules(parsed.slice(0, MAX_RECENT));
        }
      }
    } catch (e) {
      console.warn('Failed to load recent modules from localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Persist to localStorage when recentModules changes
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentModules));
    } catch (e) {
      console.warn('Failed to save recent modules to localStorage:', e);
    }
  }, [recentModules, isLoaded]);

  /**
   * Add a module to the recent list
   * Moves to front if already exists
   */
  const addRecentModule = useCallback((moduleId: ModuleId) => {
    setRecentModules(prev => {
      // Remove if already exists
      const filtered = prev.filter(id => id !== moduleId);
      // Add to front
      const updated = [moduleId, ...filtered];
      // Trim to max
      return updated.slice(0, MAX_RECENT);
    });
  }, []);

  /**
   * Remove a module from the recent list
   */
  const removeRecentModule = useCallback((moduleId: ModuleId) => {
    setRecentModules(prev => prev.filter(id => id !== moduleId));
  }, []);

  /**
   * Clear all recent modules
   */
  const clearRecentModules = useCallback(() => {
    setRecentModules([]);
  }, []);

  /**
   * Check if a module is in the recent list
   */
  const isRecent = useCallback((moduleId: ModuleId) => {
    return recentModules.includes(moduleId);
  }, [recentModules]);

  return {
    recentModules,
    addRecentModule,
    removeRecentModule,
    clearRecentModules,
    isRecent,
    isLoaded,
  };
}

/**
 * Hook variant that auto-tracks the active module
 */
export function useRecentModuleTracker(activeModule: ModuleId | null) {
  const { addRecentModule, ...rest } = useRecentModules();

  useEffect(() => {
    if (activeModule && activeModule !== 'admin') {
      addRecentModule(activeModule);
    }
  }, [activeModule, addRecentModule]);

  return { addRecentModule, ...rest };
}

export default useRecentModules;
