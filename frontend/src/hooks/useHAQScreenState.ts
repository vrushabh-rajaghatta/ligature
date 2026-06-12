


import { useHAQStore } from '@/store/useHAQStore';
import { useAppStore } from '@/store/useAppStore';
import { products } from '@/data/mock';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { haqApi } from '@/lib/haq-api';
import { logger } from '@/lib/logger';
import type { HAQuestion } from '@/types/haq';

// =============================================================================
// SYNC STATUS TYPE
// =============================================================================

export type HAQSyncStatus = 'idle' | 'loading' | 'synced' | 'error' | 'offline';

/**
 * Hook that bridges the HAQ screen to global and HAQ-specific stores.
 * This provides a clean API for the HAQ screen to use while
 * the underlying stores handle state management.
 * 
 * Phase 1.1d: Now includes database sync on mount
 */
export function useHAQScreenState() {
  // Global app state - select just what we need
  const globalProductFilter = useAppStore((s) => s.filters.product);
  
  // =============================================================================
  // DATABASE SYNC (Phase 1.1d)
  // =============================================================================
  
  const [syncStatus, setSyncStatus] = useState<HAQSyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);
  const hasSynced = useRef(false);
  const isSyncing = useRef(false);
  
  // Function to load HAQs from database
  const syncFromDatabase = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncStatus('loading');
    setSyncError(null);
    
    try {
      // Check if API is available
      const isAvailable = await haqApi.isAvailable();
      
      if (!isAvailable) {
        logger.debug('HAQ Sync', 'Database not available, using mock data');
        setSyncStatus('offline');
        setIsFromDatabase(false);
        isSyncing.current = false;
        return;
      }
      
      // Fetch HAQs from database
      const response = await haqApi.list({
        sortBy: 'dueDate',
        sortDir: 'asc',
      });
      
      if (response.data && response.data.length > 0) {
        logger.debug('HAQ Sync', `Loaded ${response.data.length} HAQs from database`);
        useHAQStore.setState({ haqs: response.data });
        setIsFromDatabase(true);
        setSyncStatus('synced');
      } else {
        // Database is available but empty - keep mock data
        logger.debug('HAQ Sync', 'Database empty, keeping mock data');
        setSyncStatus('synced');
        setIsFromDatabase(false);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('HAQ Sync', 'Error syncing from database', message);
      setSyncError(message);
      setSyncStatus('error');
      setIsFromDatabase(false);
    } finally {
      isSyncing.current = false;
    }
  }, []);
  
  // Sync on mount (once)
  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true;
      syncFromDatabase();
    }
  }, [syncFromDatabase]);
  
  // HAQ store state - select individual pieces to avoid re-renders
  const haqs = useHAQStore((s) => s.haqs);
  const selectedHAQId = useHAQStore((s) => s.selectedHAQId);
  const filterPriority = useHAQStore((s) => s.filterPriority);
  const filterStatus = useHAQStore((s) => s.filterStatus);
  const filterProduct = useHAQStore((s) => s.filterProduct);
  const searchQuery = useHAQStore((s) => s.searchQuery);
  const sortBy = useHAQStore((s) => s.sortBy);
  const sortDirection = useHAQStore((s) => s.sortDirection);
  const drafts = useHAQStore((s) => s.drafts);
  
  // HAQ store actions
  const selectHAQ = useHAQStore((s) => s.selectHAQ);
  const setFilterPriority = useHAQStore((s) => s.setFilterPriority);
  const setFilterStatus = useHAQStore((s) => s.setFilterStatus);
  const setFilterProduct = useHAQStore((s) => s.setFilterProduct);
  const setSearchQuery = useHAQStore((s) => s.setSearchQuery);
  const setSortBy = useHAQStore((s) => s.setSortBy);
  const toggleSortDirection = useHAQStore((s) => s.toggleSortDirection);
  const clearFilters = useHAQStore((s) => s.clearFilters);
  const storeUpdateHAQStatus = useHAQStore((s) => s.updateHAQStatus);
  const saveDraft = useHAQStore((s) => s.saveDraft);
  const clearDraft = useHAQStore((s) => s.clearDraft);
  
  // =============================================================================
  // WRAPPED MUTATIONS (Phase 1.1d) - Persist to database
  // =============================================================================
  
  /**
   * Update HAQ status - updates store AND persists to database
   */
  const updateHAQStatus = useCallback(async (haqId: string, status: HAQuestion['status']) => {
    // 1. Update local store immediately (optimistic)
    storeUpdateHAQStatus(haqId, status);
    
    // 2. Persist to database (best effort)
    if (isFromDatabase) {
      try {
        await haqApi.update(haqId, { status });
        logger.debug('HAQ Sync', `Persisted status change: ${haqId} → ${status}`);
      } catch (err) {
        logger.error('HAQ Sync', 'Failed to persist status change', err);
        // Note: We don't revert the local change - the UI stays updated
        // This is "offline-first" behavior. A more sophisticated approach
        // would queue the change and retry.
      }
    }
  }, [storeUpdateHAQStatus, isFromDatabase]);

  // Compute filtered HAQs locally to avoid infinite loops
  const filteredHAQs = useMemo(() => {
    let filtered = [...haqs];
    
    // Apply HAQ-specific filters
    if (filterPriority !== 'all') {
      filtered = filtered.filter((h) => h.priority === filterPriority);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((h) => h.status === filterStatus);
    }
    if (filterProduct !== 'all') {
      filtered = filtered.filter((h) => h.productId === filterProduct);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.questionText.toLowerCase().includes(query) ||
          h.questionNumber.toLowerCase().includes(query) ||
          h.discipline.toLowerCase().includes(query) ||
          h.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }
    
    // Apply global product filter
    if (globalProductFilter !== 'all') {
      filtered = filtered.filter(h => h.productId === globalProductFilter);
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'priority': {
          const priorityOrder = { critical: 0, major: 1, minor: 2, clarification: 3 };
          comparison = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
          break;
        }
        case 'status': {
          const statusOrder = { new: 0, 'in-progress': 1, 'draft-ready': 2, 'under-review': 3, submitted: 4, closed: 5 };
          comparison = (statusOrder[a.status as keyof typeof statusOrder] ?? 99) - (statusOrder[b.status as keyof typeof statusOrder] ?? 99);
          break;
        }
        case 'receivedDate':
          comparison = new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [haqs, filterPriority, filterStatus, filterProduct, searchQuery, globalProductFilter, sortBy, sortDirection]);

  // Get selected HAQ
  const selectedHAQ = useMemo(() => {
    return haqs.find((h) => h.id === selectedHAQId);
  }, [haqs, selectedHAQId]);

  // Compute stats
  const stats = useMemo(() => {
    const today = new Date();
    
    return {
      total: filteredHAQs.length,
      pending: filteredHAQs.filter(h => h.status === 'new' || h.status === 'open').length,
      inProgress: filteredHAQs.filter(h => h.status === 'in-progress').length,
      draftReady: filteredHAQs.filter(h => h.status === 'draft-ready').length,
      underReview: filteredHAQs.filter(h => h.status === 'under-review').length,
      submitted: filteredHAQs.filter(h => h.status === 'submitted').length,
      overdue: filteredHAQs.filter(h => {
        if (h.status === 'submitted' || h.status === 'closed') return false;
        return new Date(h.dueDate) < today;
      }).length,
      critical: filteredHAQs.filter(h => h.priority === 'critical').length,
    };
  }, [filteredHAQs]);

  // Get unique applications from filtered HAQs
  const applications = useMemo(() => {
    const apps = new Map<string, { id: string; number: string; productName: string }>();
    filteredHAQs.forEach(q => {
      if (!apps.has(q.applicationId)) {
        apps.set(q.applicationId, {
          id: q.applicationId,
          number: q.applicationNumber,
          productName: q.productName,
        });
      }
    });
    return Array.from(apps.values());
  }, [filteredHAQs]);

  // Get products for filter dropdown
  const productOptions = useMemo(() => {
    const productIds = new Set(haqs.map(h => h.productId));
    return products.filter(p => productIds.has(p.id));
  }, [haqs]);

  // Draft getter that uses current state - memoize to prevent new function each render
  const getDraft = useCallback((haqId: string) => drafts[haqId], [drafts]);

  return useMemo(() => ({
    // Data
    haqs: filteredHAQs,
    selectedHAQ,
    stats,
    applications,
    productOptions,
    
    // Selection
    selectedHAQId,
    selectHAQ,
    
    // Filters
    filterPriority,
    filterStatus,
    filterProduct,
    searchQuery,
    sortBy,
    sortDirection,
    setFilterPriority,
    setFilterStatus,
    setFilterProduct,
    setSearchQuery,
    setSortBy,
    toggleSortDirection,
    clearFilters,
    
    // Actions
    updateHAQStatus,
    saveDraft,
    getDraft,
    clearDraft,
    
    // Sync status (Phase 1.1d)
    syncStatus,
    syncError,
    isFromDatabase,
    resync: syncFromDatabase,
  }), [
    filteredHAQs,
    selectedHAQ,
    stats,
    applications,
    productOptions,
    selectedHAQId,
    selectHAQ,
    filterPriority,
    filterStatus,
    filterProduct,
    searchQuery,
    sortBy,
    sortDirection,
    setFilterPriority,
    setFilterStatus,
    setFilterProduct,
    setSearchQuery,
    setSortBy,
    toggleSortDirection,
    clearFilters,
    updateHAQStatus,
    saveDraft,
    getDraft,
    clearDraft,
    syncStatus,
    syncError,
    isFromDatabase,
    syncFromDatabase,
  ]);
}
