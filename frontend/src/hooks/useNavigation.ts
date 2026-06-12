


import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useHAQStore } from '@/store/useHAQStore';
import { useToast } from '@/components/ui/Toast';
import type { ModuleId } from '@/types/core';
import type { HAQStatus, HAQPriority } from '@/types/haq';

export interface NavigationOptions {
  // Global filters to set
  product?: string;
  therapeuticArea?: string;
  modality?: string;
  region?: string;
  stage?: string;
  
  // HAQ-specific filters
  haqStatus?: HAQStatus | 'all';
  haqPriority?: HAQPriority | 'all';
  
  // Show toast message
  toast?: string;
}

/**
 * Hook for navigating between modules with preset filters.
 * Use this for dashboard drill-down functionality.
 * 
 * Example:
 *   const { navigateTo } = useNavigation();
 *   navigateTo('haq', { haqPriority: 'critical', toast: 'Showing critical HAQs' });
 */
export function useNavigation() {
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const setFilters = useAppStore((s) => s.setFilters);
  const setHAQFilterStatus = useHAQStore((s) => s.setFilterStatus);
  const setHAQFilterPriority = useHAQStore((s) => s.setFilterPriority);
  const { info } = useToast();

  const navigateTo = useCallback((
    module: ModuleId,
    options?: NavigationOptions
  ) => {
    // Set global filters if provided
    if (options) {
      const globalFilters: Record<string, string> = {};
      
      if (options.product) globalFilters.product = options.product;
      if (options.therapeuticArea) globalFilters.therapeuticArea = options.therapeuticArea;
      if (options.modality) globalFilters.modality = options.modality;
      if (options.region) globalFilters.region = options.region;
      if (options.stage) globalFilters.stage = options.stage;
      
      if (Object.keys(globalFilters).length > 0) {
        setFilters(globalFilters);
      }
      
      // Set HAQ-specific filters
      if (options.haqStatus) {
        setHAQFilterStatus(options.haqStatus);
      }
      if (options.haqPriority) {
        setHAQFilterPriority(options.haqPriority);
      }
      
      // Show toast if specified
      if (options.toast) {
        info(options.toast);
      }
    }
    
    // Navigate to module
    setActiveModule(module);
  }, [setActiveModule, setFilters, setHAQFilterStatus, setHAQFilterPriority, info]);

  // Convenience methods for common navigations
  const goToHAQ = useCallback((options?: {
    status?: HAQStatus | 'all';
    priority?: HAQPriority | 'all';
    product?: string;
  }) => {
    navigateTo('haq', {
      haqStatus: options?.status,
      haqPriority: options?.priority,
      product: options?.product,
    });
  }, [navigateTo]);

  const goToSafety = useCallback((product?: string) => {
    navigateTo('safety', { product });
  }, [navigateTo]);

  const goToSubmissions = useCallback((product?: string) => {
    navigateTo('submissions', { product });
  }, [navigateTo]);

  const goToResearch = useCallback((product?: string) => {
    navigateTo('research', { product });
  }, [navigateTo]);

  return {
    navigateTo,
    goToHAQ,
    goToSafety,
    goToSubmissions,
    goToResearch,
  };
}
