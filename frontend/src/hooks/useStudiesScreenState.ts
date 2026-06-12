

import { logger } from '@/lib/logger';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { studiesApi, type StudyPhase, type StudyStatus, type StudyWithProgress } from '@/lib/studies-api';
import { studies as mockStudies, products } from '@/data/mock';
import type { Study } from '@/types/core';

// =============================================================================
// SYNC STATUS TYPE
// =============================================================================

export type StudiesSyncStatus = 'idle' | 'loading' | 'synced' | 'error' | 'offline';

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface StudiesFilters {
  phase: StudyPhase | 'all';
  status: StudyStatus | 'all';
  productId: string;
  searchQuery: string;
  sortBy: 'name' | 'phase' | 'status' | 'startDate' | 'estimatedCompletion' | 'enrolledSubjects';
  sortDir: 'asc' | 'desc';
}

// =============================================================================
// STATS TYPE
// =============================================================================

export interface StudiesStats {
  total: number;
  byPhase: {
    phase1: number;
    phase1_2: number;
    phase2: number;
    phase3: number;
    phase4: number;
  };
  byStatus: {
    planning: number;
    enrolling: number;
    active: number;
    completed: number;
    onHold: number;
  };
  totalEnrolled: number;
  totalTarget: number;
  enrollmentPercentage: number;
  averageTMFCompleteness: number;
}

/**
 * Hook that provides Studies screen state with database sync.
 * Following the HAQ/Safety/Documents pattern:
 * - Load from database on mount
 * - Fallback to mock data if database unavailable/empty
 * - Persist mutations to database
 * 
 * Phase 1.1g: Studies store database sync
 */
export function useStudiesScreenState() {
  // =============================================================================
  // DATABASE SYNC STATE
  // =============================================================================
  
  const [syncStatus, setSyncStatus] = useState<StudiesSyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);
  const [dbStudies, setDbStudies] = useState<StudyWithProgress[]>([]);
  const hasSynced = useRef(false);
  const isSyncing = useRef(false);

  // =============================================================================
  // FILTER STATE
  // =============================================================================
  
  const [filters, setFilters] = useState<StudiesFilters>({
    phase: 'all',
    status: 'all',
    productId: 'all',
    searchQuery: '',
    sortBy: 'name',
    sortDir: 'asc',
  });

  // =============================================================================
  // SELECTION STATE
  // =============================================================================
  
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);

  // =============================================================================
  // SYNC FROM DATABASE
  // =============================================================================
  
  const syncFromDatabase = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncStatus('loading');
    setSyncError(null);
    
    try {
      // Check if API is available
      const isAvailable = await studiesApi.isAvailable();
      
      if (!isAvailable) {
        logger.debug('Studies Sync', 'Database not available, using mock data');
        setSyncStatus('offline');
        setIsFromDatabase(false);
        isSyncing.current = false;
        return;
      }
      
      // Fetch studies from database
      const response = await studiesApi.list({
        sortBy: 'name',
        sortDir: 'asc',
      });
      
      if (response.data && response.data.length > 0) {
        logger.debug('Studies Sync', ` Loaded ${response.data.length} studies from database`);
        setDbStudies(response.data);
        setIsFromDatabase(true);
        setSyncStatus('synced');
      } else {
        // Database is available but empty - keep mock data
        logger.debug('Studies Sync', 'Database empty, keeping mock data');
        setSyncStatus('synced');
        setIsFromDatabase(false);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Studies Sync', `Error: ${message}`);
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
  // DATA SOURCE SELECTION
  // =============================================================================
  
  const allStudies = useMemo((): StudyWithProgress[] => {
    // Use database studies if available, otherwise convert mock data
    if (isFromDatabase && dbStudies.length > 0) {
      return dbStudies;
    }
    // Convert mock studies to StudyWithProgress format
    return mockStudies.map(s => ({
      ...s,
      daysRemaining: calculateDaysRemaining(s.estimatedCompletion),
      enrollmentPercentage: Math.round((s.enrolledSubjects / s.targetEnrollment) * 100),
      isOverdue: new Date(s.estimatedCompletion) < new Date() && s.status !== 'Completed',
    }));
  }, [isFromDatabase, dbStudies]);

  // =============================================================================
  // FILTERED STUDIES
  // =============================================================================
  
  const filteredStudies = useMemo(() => {
    let filtered = [...allStudies];
    
    // Apply phase filter
    if (filters.phase !== 'all') {
      filtered = filtered.filter(s => s.phase === filters.phase);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    
    // Apply product filter
    if (filters.productId !== 'all') {
      filtered = filtered.filter(s => s.productId === filters.productId);
    }
    
    // Apply search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.indication.toLowerCase().includes(query) ||
        s.phase.toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'phase': {
          const phaseOrder = { 'Phase 1': 0, 'Phase 1/2': 1, 'Phase 2': 2, 'Phase 3': 3, 'Phase 4': 4 };
          comparison = (phaseOrder[a.phase] ?? 99) - (phaseOrder[b.phase] ?? 99);
          break;
        }
        case 'status': {
          const statusOrder = { Planning: 0, Enrolling: 1, Active: 2, Completed: 3, 'On Hold': 4 };
          comparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
        }
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'estimatedCompletion':
          comparison = new Date(a.estimatedCompletion).getTime() - new Date(b.estimatedCompletion).getTime();
          break;
        case 'enrolledSubjects':
          comparison = a.enrolledSubjects - b.enrolledSubjects;
          break;
      }
      return filters.sortDir === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [allStudies, filters]);

  // =============================================================================
  // STATS
  // =============================================================================
  
  const stats = useMemo((): StudiesStats => {
    const totalEnrolled = filteredStudies.reduce((sum, s) => sum + s.enrolledSubjects, 0);
    const totalTarget = filteredStudies.reduce((sum, s) => sum + s.targetEnrollment, 0);
    const avgTMF = filteredStudies.length > 0
      ? Math.round(filteredStudies.reduce((sum, s) => sum + s.tmfCompleteness, 0) / filteredStudies.length)
      : 0;
    
    return {
      total: filteredStudies.length,
      byPhase: {
        phase1: filteredStudies.filter(s => s.phase === 'Phase 1').length,
        phase1_2: filteredStudies.filter(s => s.phase === 'Phase 1/2').length,
        phase2: filteredStudies.filter(s => s.phase === 'Phase 2').length,
        phase3: filteredStudies.filter(s => s.phase === 'Phase 3').length,
        phase4: filteredStudies.filter(s => s.phase === 'Phase 4').length,
      },
      byStatus: {
        planning: filteredStudies.filter(s => s.status === 'Planning').length,
        enrolling: filteredStudies.filter(s => s.status === 'Enrolling').length,
        active: filteredStudies.filter(s => s.status === 'Active').length,
        completed: filteredStudies.filter(s => s.status === 'Completed').length,
        onHold: filteredStudies.filter(s => s.status === 'On Hold').length,
      },
      totalEnrolled,
      totalTarget,
      enrollmentPercentage: totalTarget > 0 ? Math.round((totalEnrolled / totalTarget) * 100) : 0,
      averageTMFCompleteness: avgTMF,
    };
  }, [filteredStudies]);

  // =============================================================================
  // SELECTED STUDY
  // =============================================================================
  
  const selectedStudy = useMemo(() => {
    return allStudies.find(s => s.id === selectedStudyId) || null;
  }, [allStudies, selectedStudyId]);

  // =============================================================================
  // PRODUCT OPTIONS
  // =============================================================================
  
  const productOptions = useMemo(() => {
    const productIds = new Set(allStudies.map(s => s.productId));
    return products.filter(p => productIds.has(p.id));
  }, [allStudies]);

  // =============================================================================
  // FILTER SETTERS
  // =============================================================================
  
  const setFilterPhase = useCallback((phase: StudyPhase | 'all') => {
    setFilters(prev => ({ ...prev, phase }));
  }, []);
  
  const setFilterStatus = useCallback((status: StudyStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }));
  }, []);
  
  const setFilterProduct = useCallback((productId: string) => {
    setFilters(prev => ({ ...prev, productId }));
  }, []);
  
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, []);
  
  const setSortBy = useCallback((sortBy: StudiesFilters['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);
  
  const setSortDir = useCallback((sortDir: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortDir }));
  }, []);
  
  const toggleSortDirection = useCallback(() => {
    setFilters(prev => ({ ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({
      phase: 'all',
      status: 'all',
      productId: 'all',
      searchQuery: '',
      sortBy: 'name',
      sortDir: 'asc',
    });
  }, []);

  // =============================================================================
  // SELECTION
  // =============================================================================
  
  const selectStudy = useCallback((id: string | null) => {
    setSelectedStudyId(id);
  }, []);

  // =============================================================================
  // WRAPPED MUTATIONS (Persist to database)
  // =============================================================================
  
  /**
   * Update study status - updates local state AND persists to database
   */
  const updateStudyStatus = useCallback(async (studyId: string, status: StudyStatus) => {
    // 1. Update local state immediately (optimistic)
    if (isFromDatabase) {
      setDbStudies(prev => prev.map(s =>
        s.id === studyId ? { ...s, status } : s
      ));
    }
    
    // 2. Persist to database
    if (isFromDatabase) {
      try {
        await studiesApi.updateStatus(studyId, status);
        logger.debug('Studies Sync', ` Persisted status change: ${studyId} → ${status}`);
      } catch (err) {
        logger.error('Studies Sync', 'Failed to persist status change', err);
      }
    }
  }, [isFromDatabase]);

  /**
   * Update enrollment count - updates local state AND persists to database
   */
  const updateEnrollment = useCallback(async (studyId: string, enrolledSubjects: number) => {
    // 1. Update local state immediately (optimistic)
    if (isFromDatabase) {
      setDbStudies(prev => prev.map(s =>
        s.id === studyId ? { 
          ...s, 
          enrolledSubjects,
          enrollmentPercentage: Math.round((enrolledSubjects / s.targetEnrollment) * 100),
        } : s
      ));
    }
    
    // 2. Persist to database
    if (isFromDatabase) {
      try {
        await studiesApi.updateEnrollment(studyId, enrolledSubjects);
        logger.debug('Studies Sync', ` Persisted enrollment update: ${studyId} → ${enrolledSubjects}`);
      } catch (err) {
        logger.error('Studies Sync', 'Failed to persist enrollment update', err);
      }
    }
  }, [isFromDatabase]);

  /**
   * Update TMF completeness - updates local state AND persists to database
   */
  const updateTMFCompleteness = useCallback(async (studyId: string, tmfCompleteness: number) => {
    // 1. Update local state immediately (optimistic)
    if (isFromDatabase) {
      setDbStudies(prev => prev.map(s =>
        s.id === studyId ? { ...s, tmfCompleteness } : s
      ));
    }
    
    // 2. Persist to database
    if (isFromDatabase) {
      try {
        await studiesApi.updateTMFCompleteness(studyId, tmfCompleteness);
        logger.debug('Studies Sync', ` Persisted TMF completeness: ${studyId} → ${tmfCompleteness}%`);
      } catch (err) {
        logger.error('Studies Sync', 'Failed to persist TMF completeness', err);
      }
    }
  }, [isFromDatabase]);

  /**
   * Create a new study
   */
  const createStudy = useCallback(async (data: {
    name: string;
    productId: string;
    phase?: StudyPhase;
    indication?: string;
    targetEnrollment?: number;
    startDate?: string;
    estimatedCompletion?: string;
    status?: StudyStatus;
  }) => {
    try {
      const response = await studiesApi.create(data);
      logger.debug('Studies Sync', ` Created study: ${response.data.id}`);
      
      // Add to local state if synced from database
      if (isFromDatabase) {
        setDbStudies(prev => [response.data, ...prev]);
      }
      
      return response.data;
    } catch (err) {
      logger.error('Studies Sync', 'Failed to create study', err);
      throw err;
    }
  }, [isFromDatabase]);

  /**
   * Delete a study
   */
  const deleteStudy = useCallback(async (studyId: string) => {
    try {
      await studiesApi.delete(studyId);
      logger.debug('Studies Sync', ` Deleted study: ${studyId}`);
      
      // Remove from local state if synced from database
      if (isFromDatabase) {
        setDbStudies(prev => prev.filter(s => s.id !== studyId));
      }
      
      // Clear selection if deleted study was selected
      if (selectedStudyId === studyId) {
        setSelectedStudyId(null);
      }
    } catch (err) {
      logger.error('Studies Sync', 'Failed to delete study', err);
      throw err;
    }
  }, [isFromDatabase, selectedStudyId]);

  // =============================================================================
  // RETURN
  // =============================================================================
  
  return useMemo(() => ({
    // Data
    studies: filteredStudies,
    allStudies,
    selectedStudy,
    stats,
    
    // Options
    productOptions,
    
    // Selection
    selectedStudyId,
    selectStudy,
    
    // Filters
    filters,
    setFilterPhase,
    setFilterStatus,
    setFilterProduct,
    setSearchQuery,
    setSortBy,
    setSortDir,
    toggleSortDirection,
    clearFilters,
    
    // Actions (wrapped with persistence)
    updateStudyStatus,
    updateEnrollment,
    updateTMFCompleteness,
    createStudy,
    deleteStudy,
    
    // Legacy mock data access
    mockStudies,
    
    // Sync status
    syncStatus,
    syncError,
    isFromDatabase,
    resync: syncFromDatabase,
  }), [
    filteredStudies,
    allStudies,
    selectedStudy,
    stats,
    productOptions,
    selectedStudyId,
    selectStudy,
    filters,
    setFilterPhase,
    setFilterStatus,
    setFilterProduct,
    setSearchQuery,
    setSortBy,
    setSortDir,
    toggleSortDirection,
    clearFilters,
    updateStudyStatus,
    updateEnrollment,
    updateTMFCompleteness,
    createStudy,
    deleteStudy,
    syncStatus,
    syncError,
    isFromDatabase,
    syncFromDatabase,
  ]);
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateDaysRemaining(estimatedCompletion: string): number {
  const completionDate = new Date(estimatedCompletion);
  const today = new Date();
  const diffTime = completionDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
