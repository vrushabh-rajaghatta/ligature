

import { logger } from '@/lib/logger';

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSequenceBuilderStore, SequenceDraft, SubmissionStatus as StoreSubmissionStatus } from '@/store/useSequenceBuilderStore';
import { submissionsApi, Submission, SubmissionStatus as ApiSubmissionStatus } from '@/lib/submissions-api';
import { products } from '@/data/mock';
import {
  RegulatorySubmission, SubmissionStatus as RegSubmissionStatus,
  regulatorySubmissions, getPortfolioMetrics, getActiveSubmissions,
  getSubmissionsDueInDays,
} from '@/data/regulatory-submissions-data';

// =============================================================================
// SYNC STATUS TYPE
// =============================================================================

export type SubmissionsSyncStatus = 'idle' | 'loading' | 'synced' | 'error' | 'offline';

// =============================================================================
// TYPE MAPPING UTILITIES
// =============================================================================

/**
 * Map API SubmissionStatus to store SubmissionStatus
 */
function mapApiStatusToStoreStatus(apiStatus: ApiSubmissionStatus): StoreSubmissionStatus {
  const statusMap: Record<ApiSubmissionStatus, StoreSubmissionStatus> = {
    'Draft': 'draft',
    'In Progress': 'in-progress',
    'QC Review': 'validating',
    'Ready': 'ready-to-submit',
    'Submitted': 'submitted',
    'Under Review': 'under-review',
    'Approved': 'approved',
    'CRL': 'rejected',
  };
  return statusMap[apiStatus] || 'draft';
}

/**
 * Map store SubmissionStatus to API SubmissionStatus
 */
function mapStoreStatusToApiStatus(storeStatus: StoreSubmissionStatus): ApiSubmissionStatus {
  const statusMap: Record<StoreSubmissionStatus, ApiSubmissionStatus> = {
    'draft': 'Draft',
    'in-progress': 'In Progress',
    'validating': 'QC Review',
    'validated': 'Ready',
    'ready-to-submit': 'Ready',
    'submitting': 'In Progress',
    'submitted': 'Submitted',
    'acknowledged': 'Submitted',
    'under-review': 'Under Review',
    'approved': 'Approved',
    'rejected': 'CRL',
  };
  return statusMap[storeStatus] || 'Draft';
}

/**
 * Map RegulatorySubmission status to API status for consistency
 */
function mapRegStatusToApiStatus(regStatus: RegSubmissionStatus): ApiSubmissionStatus {
  const statusMap: Record<RegSubmissionStatus, ApiSubmissionStatus> = {
    'on-track': 'In Progress',
    'at-risk': 'In Progress',
    'delayed': 'In Progress',
    'blocked': 'Draft',
    'submitted': 'Submitted',
    'approved': 'Approved',
  };
  return statusMap[regStatus] || 'Draft';
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface SubmissionsFilters {
  status: ApiSubmissionStatus | 'all';
  type: string | 'all';
  region: string | 'all';
  searchQuery: string;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook that bridges the Submissions screen to global and Submissions-specific stores.
 * This provides a clean API for the Submissions screen to use while
 * the underlying stores handle state management.
 * 
 * Phase 1.1f: Includes database sync on mount (following HAQ/Safety pattern)
 */
export function useSubmissionsScreenState() {
  // Global app state - select just what we need
  const globalProductFilter = useAppStore((s) => s.filters.product);
  
  // =============================================================================
  // DATABASE SYNC (Phase 1.1f)
  // =============================================================================
  
  const [syncStatus, setSyncStatus] = useState<SubmissionsSyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);
  const hasSynced = useRef(false);
  const isSyncing = useRef(false);
  
  // Database submissions (from API)
  const [dbSubmissions, setDbSubmissions] = useState<Submission[]>([]);
  
  // Local filters
  const [filters, setFilters] = useState<SubmissionsFilters>({
    status: 'all',
    type: 'all',
    region: 'all',
    searchQuery: '',
  });
  
  // Selected submission
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  
  // =============================================================================
  // STORE ACCESS
  // =============================================================================
  
  // Sequence drafts from store (for builder workflow)
  const drafts = useSequenceBuilderStore((s) => s.drafts);
  const currentDraft = useSequenceBuilderStore((s) => s.currentDraft);
  const isValidating = useSequenceBuilderStore((s) => s.isValidating);
  const isSubmitting = useSequenceBuilderStore((s) => s.isSubmitting);
  
  // Store actions
  const createDraft = useSequenceBuilderStore((s) => s.createDraft);
  const setCurrentDraft = useSequenceBuilderStore((s) => s.setCurrentDraft);
  const storeUpdateDraft = useSequenceBuilderStore((s) => s.updateDraft);
  const deleteDraft = useSequenceBuilderStore((s) => s.deleteDraft);
  const startValidation = useSequenceBuilderStore((s) => s.startValidation);
  const submitToGateway = useSequenceBuilderStore((s) => s.submitToGateway);
  
  // =============================================================================
  // DATABASE SYNC FUNCTION
  // =============================================================================
  
  const syncFromDatabase = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncStatus('loading');
    setSyncError(null);
    
    try {
      // Check if API is available
      const isAvailable = await submissionsApi.isAvailable();
      
      if (!isAvailable) {
        logger.debug('Submissions Sync', 'Database not available, using mock data');
        setSyncStatus('offline');
        setIsFromDatabase(false);
        isSyncing.current = false;
        return;
      }
      
      // Fetch submissions from database
      const response = await submissionsApi.list({
        sortBy: 'targetDate',
        sortDir: 'asc',
      });
      
      if (response.data && response.data.length > 0) {
        logger.debug('Submissions Sync', ` Loaded ${response.data.length} submissions from database`);
        setDbSubmissions(response.data);
        setIsFromDatabase(true);
        setSyncStatus('synced');
      } else {
        // Database is available but empty - keep mock data
        logger.debug('Submissions Sync', 'Database empty, keeping mock data');
        setSyncStatus('synced');
        setIsFromDatabase(false);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Submissions Sync', `Error: ${message}`);
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
  // WRAPPED MUTATIONS (Phase 1.1f) - Persist to database
  // =============================================================================
  
  /**
   * Update submission status - updates store AND persists to database
   */
  const updateSubmissionStatus = useCallback(async (
    submissionId: string, 
    status: ApiSubmissionStatus
  ) => {
    // Persist to database
    if (isFromDatabase) {
      try {
        await submissionsApi.updateStatus(submissionId, status);
        logger.debug('Submissions Sync', ` Persisted status change: ${submissionId} → ${status}`);
        
        // Update local state
        setDbSubmissions(prev => prev.map(s => 
          s.id === submissionId ? { ...s, status } : s
        ));
      } catch (err) {
        logger.error('Submissions Sync', 'Failed to persist status change', err);
      }
    }
  }, [isFromDatabase]);
  
  /**
   * Update draft - updates store AND persists related submission to database
   */
  const updateDraft = useCallback(async (
    draftId: string,
    updates: Partial<SequenceDraft>
  ) => {
    // Update local store
    storeUpdateDraft(draftId, updates);
    
    // If status changed, try to persist
    if (isFromDatabase && updates.status) {
      const apiStatus = mapStoreStatusToApiStatus(updates.status);
      
      // Find corresponding database submission by applicationId
      const draft = drafts.find(d => d.id === draftId);
      if (draft) {
        const dbSubmission = dbSubmissions.find(s => 
          s.applicationId === draft.applicationId ||
          s.sequenceNumber === draft.sequenceNumber
        );
        
        if (dbSubmission) {
          try {
            await submissionsApi.updateStatus(dbSubmission.id, apiStatus);
            logger.debug('Submissions Sync', ` Persisted draft status: ${draftId} → ${apiStatus}`);
          } catch (err) {
            logger.error('Submissions Sync', 'Failed to persist draft status', err);
          }
        }
      }
    }
  }, [storeUpdateDraft, isFromDatabase, drafts, dbSubmissions]);
  
  /**
   * Create new submission in database
   */
  const createSubmission = useCallback(async (params: {
    productId: string;
    applicationId?: string;
    type?: string;
    region?: string;
    targetDate?: string;
    description?: string;
  }) => {
    if (!isFromDatabase) {
      logger.debug('Submissions Sync', 'Database not available, cannot create');
      return null;
    }
    
    try {
      const response = await submissionsApi.create({
        productId: params.productId,
        applicationId: params.applicationId,
        type: params.type as any,
        region: params.region as any,
        targetDate: params.targetDate,
        description: params.description,
      });
      
      logger.debug('Submissions Sync', ` Created submission: ${response.data.id}`);
      setDbSubmissions(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      logger.error('Submissions Sync', 'Failed to create submission', err);
      return null;
    }
  }, [isFromDatabase]);
  
  /**
   * Delete submission from database
   */
  const deleteSubmission = useCallback(async (submissionId: string) => {
    if (!isFromDatabase) {
      logger.debug('Submissions Sync', 'Database not available, cannot delete');
      return false;
    }
    
    try {
      await submissionsApi.delete(submissionId);
      logger.debug('Submissions Sync', ` Deleted submission: ${submissionId}`);
      setDbSubmissions(prev => prev.filter(s => s.id !== submissionId));
      return true;
    } catch (err) {
      logger.error('Submissions Sync', 'Failed to delete submission', err);
      return false;
    }
  }, [isFromDatabase]);
  
  // =============================================================================
  // FILTER ACTIONS
  // =============================================================================
  
  const setFilterStatus = useCallback((status: ApiSubmissionStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }));
  }, []);
  
  const setFilterType = useCallback((type: string | 'all') => {
    setFilters(prev => ({ ...prev, type }));
  }, []);
  
  const setFilterRegion = useCallback((region: string | 'all') => {
    setFilters(prev => ({ ...prev, region }));
  }, []);
  
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      type: 'all',
      region: 'all',
      searchQuery: '',
    });
  }, []);
  
  const selectSubmission = useCallback((id: string | null) => {
    setSelectedSubmissionId(id);
  }, []);
  
  // =============================================================================
  // FILTERED DATA
  // =============================================================================
  
  // Use database submissions if available, otherwise fall back to mock
  const baseSubmissions = useMemo(() => {
    if (isFromDatabase && dbSubmissions.length > 0) {
      return dbSubmissions;
    }
    // Convert mock RegulatorySubmission to API Submission format for consistency
    return regulatorySubmissions.map((rs): Submission => ({
      id: rs.id,
      productId: rs.productId,
      productName: products.find(p => p.id === rs.productId)?.name || null,
      applicationId: rs.applicationId || null,
      applicationNumber: rs.applicationNumber || null,
      sequenceNumber: '0001',
      type: rs.submissionType as any,
      region: rs.region as any,
      agency: rs.agency,
      status: mapRegStatusToApiStatus(rs.status),
      targetDate: rs.targetDate,
      daysUntilTarget: Math.ceil((new Date(rs.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      modulesComplete: Math.round(rs.overallReadiness / 100 * 5),
      modulesTotal: 5,
      moduleProgress: {},
      qcStatus: rs.overallReadiness >= 90 ? 'Passed' : rs.overallReadiness >= 50 ? 'In Progress' : 'Not Started',
      ectdStatus: rs.overallReadiness >= 80 ? 'Valid' : 'Pending',
      description: null,
      wizardState: null,
      createdAt: rs.lastUpdated,
      updatedAt: rs.lastUpdated,
    }));
  }, [isFromDatabase, dbSubmissions]);
  
  const filteredSubmissions = useMemo(() => {
    let filtered = [...baseSubmissions];
    
    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(s => s.type === filters.type);
    }
    if (filters.region !== 'all') {
      filtered = filtered.filter(s => s.region === filters.region);
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.productName?.toLowerCase().includes(query) ||
        s.applicationNumber?.toLowerCase().includes(query) ||
        s.type.toLowerCase().includes(query) ||
        s.agency.toLowerCase().includes(query)
      );
    }
    
    // Apply global product filter
    if (globalProductFilter !== 'all') {
      filtered = filtered.filter(s => s.productId === globalProductFilter);
    }
    
    return filtered;
  }, [baseSubmissions, filters, globalProductFilter]);
  
  // =============================================================================
  // STATISTICS
  // =============================================================================
  
  const stats = useMemo(() => {
    const today = new Date();
    
    return {
      total: filteredSubmissions.length,
      draft: filteredSubmissions.filter(s => s.status === 'Draft').length,
      inProgress: filteredSubmissions.filter(s => s.status === 'In Progress').length,
      qcReview: filteredSubmissions.filter(s => s.status === 'QC Review').length,
      ready: filteredSubmissions.filter(s => s.status === 'Ready').length,
      submitted: filteredSubmissions.filter(s => s.status === 'Submitted').length,
      underReview: filteredSubmissions.filter(s => s.status === 'Under Review').length,
      approved: filteredSubmissions.filter(s => s.status === 'Approved').length,
      overdue: filteredSubmissions.filter(s => {
        if (['Submitted', 'Approved', 'CRL'].includes(s.status)) return false;
        return s.daysUntilTarget < 0;
      }).length,
      upcoming30: filteredSubmissions.filter(s => {
        if (['Submitted', 'Approved', 'CRL'].includes(s.status)) return false;
        return s.daysUntilTarget <= 30 && s.daysUntilTarget > 0;
      }).length,
    };
  }, [filteredSubmissions]);
  
  // =============================================================================
  // SELECTED SUBMISSION
  // =============================================================================
  
  const selectedSubmission = useMemo(() => {
    return baseSubmissions.find(s => s.id === selectedSubmissionId) || null;
  }, [baseSubmissions, selectedSubmissionId]);
  
  // =============================================================================
  // PRODUCT OPTIONS
  // =============================================================================
  
  const productOptions = useMemo(() => {
    const productIds = new Set(baseSubmissions.map(s => s.productId));
    return products.filter(p => productIds.has(p.id));
  }, [baseSubmissions]);
  
  // Region options
  const regionOptions = useMemo(() => {
    const regions = new Set(baseSubmissions.map(s => s.region));
    return Array.from(regions).sort();
  }, [baseSubmissions]);
  
  // Type options
  const typeOptions = useMemo(() => {
    const types = new Set(baseSubmissions.map(s => s.type));
    return Array.from(types).sort();
  }, [baseSubmissions]);
  
  // =============================================================================
  // LEGACY DATA ACCESS (for compatibility with existing components)
  // =============================================================================
  
  // Expose mock data for components that still use it
  const mockSubmissions = regulatorySubmissions;
  const portfolioMetrics = useMemo(() => getPortfolioMetrics(), []);
  const activeSubmissions = useMemo(() => getActiveSubmissions(), []);
  
  // =============================================================================
  // RETURN VALUE
  // =============================================================================
  
  return useMemo(() => ({
    // Data
    submissions: filteredSubmissions,
    allSubmissions: baseSubmissions,
    selectedSubmission,
    stats,
    
    // Options
    productOptions,
    regionOptions,
    typeOptions,
    
    // Selection
    selectedSubmissionId,
    selectSubmission,
    
    // Filters
    filters,
    setFilterStatus,
    setFilterType,
    setFilterRegion,
    setSearchQuery,
    clearFilters,
    
    // Actions (wrapped with persistence)
    updateSubmissionStatus,
    createSubmission,
    deleteSubmission,
    
    // Draft management (from store)
    drafts,
    currentDraft,
    createDraft,
    setCurrentDraft,
    updateDraft,
    deleteDraft,
    startValidation,
    submitToGateway,
    isValidating,
    isSubmitting,
    
    // Legacy data access (for compatibility)
    mockSubmissions,
    portfolioMetrics,
    activeSubmissions,
    
    // Sync status (Phase 1.1f)
    syncStatus,
    syncError,
    isFromDatabase,
    resync: syncFromDatabase,
  }), [
    filteredSubmissions,
    baseSubmissions,
    selectedSubmission,
    stats,
    productOptions,
    regionOptions,
    typeOptions,
    selectedSubmissionId,
    selectSubmission,
    filters,
    setFilterStatus,
    setFilterType,
    setFilterRegion,
    setSearchQuery,
    clearFilters,
    updateSubmissionStatus,
    createSubmission,
    deleteSubmission,
    drafts,
    currentDraft,
    createDraft,
    setCurrentDraft,
    updateDraft,
    deleteDraft,
    startValidation,
    submitToGateway,
    isValidating,
    isSubmitting,
    mockSubmissions,
    portfolioMetrics,
    activeSubmissions,
    syncStatus,
    syncError,
    isFromDatabase,
    syncFromDatabase,
  ]);
}
