
/**
 * Store Initializer
 * Fetches initial data from APIs when app loads
 * 
 * @version 0.33.16
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDocumentStore } from '@/stores/document-store';
import { useProductsStore } from '@/stores/products-store';
import { useSubmissionsStore } from '@/stores/submissions-store';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { useHAQStore } from '@/store/useHAQStoreV2';
import { logger } from '@/lib/logger';

interface StoreInitializerProps {
  children: React.ReactNode;
  /** Skip API calls and use local mock data only */
  demoMode?: boolean;
}

/**
 * Initializes all stores with data from APIs
 * Wraps the app and fetches data on first mount
 */
export function StoreInitializer({ children, demoMode = false }: StoreInitializerProps) {
  const initialized = useRef(false);
  
  // Get fetch functions from stores
  const fetchDocuments = useDocumentStore((s) => s.fetchDocuments);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const fetchSubmissions = useSubmissionsStore((s) => s.fetchSubmissions);
  const fetchEvents = useCrossModuleEventStore((s) => s.fetchEvents);
  const initializeHAQs = useHAQStore((s) => s.initialize);
  
  useEffect(() => {
    // Only run once
    if (initialized.current) return;
    initialized.current = true;
    
    if (demoMode) {
      logger.debug('StoreInit', 'Demo mode - using local mock data');
      return;
    }
    
    logger.debug('StoreInit', 'Initializing stores from APIs...');
    
    // Fetch all data in parallel (non-blocking)
    const initializeStores = async () => {
      const startTime = Date.now();
      
      // Timeout wrapper — if any fetch hangs, we resolve after 5s
      const withTimeout = (p: Promise<any>, ms = 5000) =>
        Promise.race([p, new Promise<void>(res => setTimeout(res, ms))]);
      
      try {
        // Run all fetches in parallel with timeout protection
        await Promise.allSettled([
          withTimeout(fetchProducts()),
          withTimeout(fetchDocuments()),
          withTimeout(fetchSubmissions()),
          withTimeout(fetchEvents()),
          withTimeout(initializeHAQs()),
        ]);
        
        const elapsed = Date.now() - startTime;
        logger.debug('StoreInit', `All stores initialized in ${elapsed}ms`);
      } catch (error) {
        logger.error('StoreInit', 'Error initializing stores', error);
      }
    };
    
    initializeStores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount
  
  return <>{children}</>;
}

/**
 * Hook to manually refresh all stores
 */
export function useStoreRefresh() {
  const fetchDocuments = useDocumentStore((s) => s.fetchDocuments);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const fetchSubmissions = useSubmissionsStore((s) => s.fetchSubmissions);
  const fetchEvents = useCrossModuleEventStore((s) => s.fetchEvents);
  const refreshHAQs = useHAQStore((s) => s.refresh);
  
  // Memoize to prevent infinite loops
  const refreshAll = useCallback(async () => {
    logger.debug('StoreRefresh', 'Refreshing all stores...');
    await Promise.allSettled([
      fetchProducts(),
      fetchDocuments(),
      fetchSubmissions(),
      fetchEvents(),
      refreshHAQs(),
    ]);
    logger.debug('StoreRefresh', 'All stores refreshed');
  }, [fetchProducts, fetchDocuments, fetchSubmissions, fetchEvents, refreshHAQs]);
  
  return { refreshAll };
}

/**
 * Hook to get combined sync status from all stores
 */
export function useSyncStatus() {
  // Use individual selectors to avoid creating new objects
  const docLoading = useDocumentStore((s) => s.isLoading);
  const docError = useDocumentStore((s) => s.syncError);
  const docLastSynced = useDocumentStore((s) => s.lastSynced);
  
  const prodLoading = useProductsStore((s) => s.isLoading);
  const prodError = useProductsStore((s) => s.syncError);
  const prodLastSynced = useProductsStore((s) => s.lastSynced);
  
  const subLoading = useSubmissionsStore((s) => s.isLoading);
  const subError = useSubmissionsStore((s) => s.syncError);
  const subLastSynced = useSubmissionsStore((s) => s.lastSynced);
  
  const eventLoading = useCrossModuleEventStore((s) => s.isLoading);
  const eventError = useCrossModuleEventStore((s) => s.syncError);
  const eventLastSynced = useCrossModuleEventStore((s) => s.lastSynced);
  
  const haqLoading = useHAQStore((s) => s.isLoading);
  const haqError = useHAQStore((s) => s.error);
  const haqLastFetched = useHAQStore((s) => s.lastFetched);
  
  const isLoading = docLoading || prodLoading || subLoading || eventLoading || haqLoading;
  
  const errors = [
    docError && `Documents: ${docError}`,
    prodError && `Products: ${prodError}`,
    subError && `Submissions: ${subError}`,
    eventError && `Events: ${eventError}`,
    haqError && `HAQs: ${haqError}`,
  ].filter(Boolean) as string[];
  
  const lastSynced = [
    docLastSynced,
    prodLastSynced,
    subLastSynced,
    eventLastSynced,
    haqLastFetched?.toISOString(),
  ].filter(Boolean).sort().pop() ?? null;
  
  return {
    isLoading,
    hasErrors: errors.length > 0,
    errors,
    lastSynced,
  };
}

export default StoreInitializer;
