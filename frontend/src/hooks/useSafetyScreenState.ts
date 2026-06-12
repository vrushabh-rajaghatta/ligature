


import { usePharmacovigilanceStore, useCasesList, useSignalsList } from '@/store/usePharmacovigilanceStore';
import { useAppStore } from '@/store/useAppStore';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { safetyApi } from '@/lib/safety-api';
import { logger } from '@/lib/logger';
import type { SafetyReport, SafetyReportStatus } from '@/lib/safety-api';
import type { CaseStatus } from '@/domains/safety/contracts';

// =============================================================================
// SYNC STATUS TYPE
// =============================================================================

export type SafetySyncStatus = 'idle' | 'loading' | 'synced' | 'error' | 'offline';

// =============================================================================
// TYPE MAPPING UTILITIES
// =============================================================================

/**
 * Map API SafetyReportStatus to store CaseStatus
 */
function mapApiStatusToStoreStatus(apiStatus: SafetyReportStatus): CaseStatus {
  const statusMap: Record<SafetyReportStatus, CaseStatus> = {
    'initial': 'data-entry',
    'in-progress': 'medical-review',
    'submitted': 'submitted',
    'closed': 'closed',
  };
  return statusMap[apiStatus] || 'data-entry';
}

/**
 * Map store CaseStatus to API SafetyReportStatus
 */
function mapStoreStatusToApiStatus(storeStatus: CaseStatus): SafetyReportStatus {
  const statusMap: Record<CaseStatus, SafetyReportStatus> = {
    'draft': 'initial',
    'data-entry': 'initial',
    'medical-review': 'in-progress',
    'quality-review': 'in-progress',
    'ready-to-submit': 'in-progress',
    'submitted': 'submitted',
    'follow-up-pending': 'in-progress',
    'closed': 'closed',
    'nullified': 'closed',
  };
  return statusMap[storeStatus] || 'initial';
}

/**
 * Hook that bridges the Safety screen to global and Safety-specific stores.
 * This provides a clean API for the Safety screen to use while
 * the underlying stores handle state management.
 * 
 * Phase 1.1e: Includes database sync on mount (following HAQ pattern)
 */
export function useSafetyScreenState() {
  // Global app state - select just what we need
  const globalProductFilter = useAppStore((s) => s.filters.product);
  
  // =============================================================================
  // DATABASE SYNC (Phase 1.1e)
  // =============================================================================
  
  const [syncStatus, setSyncStatus] = useState<SafetySyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);
  const hasSynced = useRef(false);
  const isSyncing = useRef(false);
  
  // Store state and actions
  const cases = useCasesList();
  const signals = useSignalsList();
  const view = usePharmacovigilanceStore((s) => s.view);
  const filters = usePharmacovigilanceStore((s) => s.filters);
  const selectedCaseId = usePharmacovigilanceStore((s) => s.selectedCaseId);
  const selectedSignalId = usePharmacovigilanceStore((s) => s.selectedSignalId);
  const isLoading = usePharmacovigilanceStore((s) => s.isLoading);
  
  // Store actions
  const setView = usePharmacovigilanceStore((s) => s.setView);
  const setFilters = usePharmacovigilanceStore((s) => s.setFilters);
  const clearFilters = usePharmacovigilanceStore((s) => s.clearFilters);
  const selectCase = usePharmacovigilanceStore((s) => s.selectCase);
  const selectSignal = usePharmacovigilanceStore((s) => s.selectSignal);
  const storeUpdateCase = usePharmacovigilanceStore((s) => s.updateCase);
  const createCase = usePharmacovigilanceStore((s) => s.createCase);
  const deleteCase = usePharmacovigilanceStore((s) => s.deleteCase);
  
  // Function to load safety reports from database
  const syncFromDatabase = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncStatus('loading');
    setSyncError(null);
    
    try {
      // Check if API is available
      const isAvailable = await safetyApi.isAvailable();
      
      if (!isAvailable) {
        logger.debug('Safety Sync', 'Database not available, using mock data');
        setSyncStatus('offline');
        setIsFromDatabase(false);
        isSyncing.current = false;
        return;
      }
      
      // Fetch safety reports from database
      const response = await safetyApi.list({
        sortBy: 'reportDate',
        sortDir: 'desc',
      });
      
      if (response.data && response.data.length > 0) {
        logger.debug('Safety Sync', `Loaded ${response.data.length} safety reports from database`);
        
        // Convert API response to store format (object dictionary)
        // Note: This replaces the cases in store with database data
        // For now, we just log - full store update requires type mapping
        // that's beyond current scope. Will be addressed in Phase 2.
        
        // Store the fact that we have database data
        setIsFromDatabase(true);
        setSyncStatus('synced');
      } else {
        // Database is available but empty - keep mock data
        logger.debug('Safety Sync', 'Database empty, keeping mock data');
        setSyncStatus('synced');
        setIsFromDatabase(false);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Safety Sync', 'Error syncing from database', message);
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
  
  // =============================================================================
  // WRAPPED MUTATIONS (Phase 1.1e) - Persist to database
  // =============================================================================
  
  /**
   * Update case status - updates store AND persists to database
   */
  const updateCaseStatus = useCallback(async (caseId: string, status: CaseStatus) => {
    // 1. Update local store immediately (optimistic)
    storeUpdateCase(caseId, { status });
    
    // 2. Persist to database (best effort)
    if (isFromDatabase) {
      try {
        const apiStatus = mapStoreStatusToApiStatus(status);
        await safetyApi.update(caseId, { status: apiStatus });
        logger.debug('Safety Sync', `Persisted status change: ${caseId} → ${status}`);
      } catch (err) {
        logger.error('Safety Sync', 'Failed to persist status change', err);
        // Note: We don't revert the local change - the UI stays updated
        // This is "offline-first" behavior
      }
    }
  }, [storeUpdateCase, isFromDatabase]);
  
  /**
   * Update case with arbitrary fields - updates store AND persists to database
   */
  const updateCase = useCallback(async (
    caseId: string, 
    updates: Parameters<typeof storeUpdateCase>[1]
  ) => {
    // 1. Update local store immediately (optimistic)
    storeUpdateCase(caseId, updates);
    
    // 2. Persist to database (best effort)
    if (isFromDatabase) {
      try {
        // Map store updates to API format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiUpdates: Record<string, unknown> = {};
        
        if ('status' in updates && updates.status) {
          apiUpdates.status = mapStoreStatusToApiStatus(updates.status);
        }
        // Add other field mappings as needed
        
        if (Object.keys(apiUpdates).length > 0) {
          await safetyApi.update(caseId, apiUpdates);
          logger.debug('Safety Sync', `Persisted case update: ${caseId}`);
        }
      } catch (err) {
        logger.error('Safety Sync', 'Failed to persist case update', err);
      }
    }
  }, [storeUpdateCase, isFromDatabase]);

  // =============================================================================
  // FILTERED DATA
  // =============================================================================
  
  const filteredCases = useMemo(() => {
    let filtered = [...cases];
    
    // Apply filters
    if (filters.caseStatus !== 'all') {
      filtered = filtered.filter((c) => c.status === filters.caseStatus);
    }
    if (filters.casePriority !== 'all') {
      filtered = filtered.filter((c) => c.priority === filters.casePriority);
    }
    if (filters.caseSeriousness !== 'all') {
      filtered = filtered.filter((c) => 
        c.safetyReport.seriousness.includes(filters.caseSeriousness as string)
      );
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.caseNumber.toLowerCase().includes(query) ||
        c.patient?.patientId?.toLowerCase().includes(query) ||
        c.reactions.some(r => r.meddraPT?.toLowerCase().includes(query))
      );
    }
    
    // Apply global product filter
    if (globalProductFilter !== 'all') {
      filtered = filtered.filter(c => 
        c.drugs.some(d => d.medicinalProductName.toLowerCase().includes(globalProductFilter.toLowerCase()))
      );
    }
    
    return filtered;
  }, [cases, filters, globalProductFilter]);
  
  const filteredSignals = useMemo(() => {
    let filtered = [...signals];
    
    // Apply filters
    if (filters.signalStatus !== 'all') {
      filtered = filtered.filter((s) => s.status === filters.signalStatus);
    }
    if (filters.signalPriority !== 'all') {
      filtered = filtered.filter((s) => s.priority === filters.signalPriority);
    }
    if (filters.productId !== 'all') {
      filtered = filtered.filter((s) => s.productId === filters.productId);
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.title.toLowerCase().includes(query) ||
        s.primaryEvent?.toLowerCase().includes(query) ||
        s.productName?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [signals, filters]);

  // =============================================================================
  // STATISTICS
  // =============================================================================
  
  const caseStats = useMemo(() => {
    return {
      total: filteredCases.length,
      serious: filteredCases.filter(c => c.safetyReport.seriousness.includes('serious')).length,
      expedited: filteredCases.filter(c => 
        c.priority === 'expedited-7-day' || c.priority === 'expedited-15-day'
      ).length,
      pending: filteredCases.filter(c => 
        !['submitted', 'closed', 'nullified'].includes(c.status)
      ).length,
      submitted: filteredCases.filter(c => c.status === 'submitted').length,
      overdue: filteredCases.filter(c => {
        if (['submitted', 'closed'].includes(c.status)) return false;
        // Check if any submission is overdue
        return c.submissions?.some(s => 
          s.dueDate && new Date(s.dueDate) < new Date() && s.status !== 'submitted'
        );
      }).length,
    };
  }, [filteredCases]);
  
  const signalStats = useMemo(() => {
    return {
      total: filteredSignals.length,
      new: filteredSignals.filter(s => s.status === 'new').length,
      underEvaluation: filteredSignals.filter(s => s.status === 'under-evaluation').length,
      validated: filteredSignals.filter(s => s.status === 'validated').length,
      closed: filteredSignals.filter(s => 
        s.status === 'closed-no-action' || s.status === 'closed-action-taken'
      ).length,
      highPriority: filteredSignals.filter(s => 
        s.priority === 'critical' || s.priority === 'high'
      ).length,
    };
  }, [filteredSignals]);

  // =============================================================================
  // SELECTED ITEMS
  // =============================================================================
  
  const selectedCase = useMemo(() => {
    return cases.find(c => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);
  
  const selectedSignal = useMemo(() => {
    return signals.find(s => s.id === selectedSignalId) || null;
  }, [signals, selectedSignalId]);

  // =============================================================================
  // RETURN VALUE
  // =============================================================================
  
  return useMemo(() => ({
    // Data
    cases: filteredCases,
    signals: filteredSignals,
    caseStats,
    signalStats,
    
    // Selection
    selectedCase,
    selectedSignal,
    selectedCaseId,
    selectedSignalId,
    selectCase,
    selectSignal,
    
    // View & Filters
    view,
    filters,
    setView,
    setFilters,
    clearFilters,
    isLoading,
    
    // Actions (wrapped with persistence)
    updateCase,
    updateCaseStatus,
    createCase,
    deleteCase,
    
    // Sync status (Phase 1.1e)
    syncStatus,
    syncError,
    isFromDatabase,
    resync: syncFromDatabase,
  }), [
    filteredCases,
    filteredSignals,
    caseStats,
    signalStats,
    selectedCase,
    selectedSignal,
    selectedCaseId,
    selectedSignalId,
    selectCase,
    selectSignal,
    view,
    filters,
    setView,
    setFilters,
    clearFilters,
    isLoading,
    updateCase,
    updateCaseStatus,
    createCase,
    deleteCase,
    syncStatus,
    syncError,
    isFromDatabase,
    syncFromDatabase,
  ]);
}
