
/**
 * useSubmissionLifecyclePersistence Hook
 * Connects useSubmissionLifecycleStore to Supabase persistence layer
 * 
 * v0.41.3 - Submission Lifecycle Persistence
 */

import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type LifecycleState = 
  | 'draft'
  | 'in-preparation'
  | 'under-review'
  | 'ready-to-submit'
  | 'submitted'
  | 'under-ha-review'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'archived'
  | 'retired';

export type LifecycleEventType =
  | 'created'
  | 'state-change'
  | 'content-updated'
  | 'submitted-to-ha'
  | 'ha-response-received'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'archived'
  | 'retired'
  | 'restored'
  | 'retention-warning'
  | 'retention-expired';

export type ArchivalReason =
  | 'approved-superseded'
  | 'withdrawn-by-sponsor'
  | 'rejected-final'
  | 'retention-expired'
  | 'manual-archive'
  | 'regulatory-requirement';

export interface SubmissionLifecycle {
  id: string;
  submissionId: string;
  applicationNumber: string;
  sequenceNumber: string;
  productId: string | null;
  productName: string | null;
  region: string;
  submissionType: string;
  currentState: LifecycleState;
  previousState: LifecycleState | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  retiredAt: string | null;
  retentionPolicyId: string | null;
  retentionExpiresAt: string | null;
  version: number;
  supersededBy: string | null;
  supersedes: string | null;
  archivalReason: ArchivalReason | null;
  archivalNotes: string | null;
  archivedBy: string | null;
  documentsToRetire: string[];
  documentsRetired: string[];
  isArchivalPending: boolean;
  archivalScheduledFor: string | null;
}

export interface LifecycleEvent {
  id: string;
  submissionId: string;
  eventType: LifecycleEventType;
  fromState: LifecycleState | null;
  toState: LifecycleState | null;
  timestamp: string;
  userId: string;
  userName: string;
  reason: string | null;
}

export interface LifecycleFilters {
  state?: LifecycleState;
  region?: string;
  submissionType?: string;
  productId?: string;
  isArchivalPending?: boolean;
  search?: string;
}

export interface LifecycleStats {
  byState: Record<string, number>;
  byRegion: Record<string, number>;
  pendingArchival: number;
  totalActive: number;
  totalArchived: number;
}

export interface CreateLifecycleData {
  submissionId: string;
  applicationNumber: string;
  sequenceNumber: string;
  productId?: string;
  productName?: string;
  region: string;
  submissionType: string;
  retentionPolicyId?: string;
  userId?: string;
  userName?: string;
}

export interface UpdateLifecycleData {
  currentState?: LifecycleState;
  archivalReason?: ArchivalReason;
  archivalNotes?: string;
  documentsToRetire?: string[];
  documentsRetired?: string[];
  userId: string;
  userName: string;
  reason?: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useSubmissionLifecyclePersistence() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'mock' | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch Lifecycles
  // ---------------------------------------------------------------------------
  
  const fetchLifecycles = useCallback(async (filters?: LifecycleFilters): Promise<{
    data: SubmissionLifecycle[];
    total: number;
    stats: LifecycleStats;
  } | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.state) params.append('state', filters.state);
      if (filters?.region) params.append('region', filters.region);
      if (filters?.submissionType) params.append('submissionType', filters.submissionType);
      if (filters?.productId) params.append('productId', filters.productId);
      if (filters?.isArchivalPending !== undefined) {
        params.append('isArchivalPending', String(filters.isArchivalPending));
      }
      if (filters?.search) params.append('search', filters.search);
      
      const response = await fetch(`/api/submissions/lifecycle?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      setLastSyncedAt(new Date());
      
      return {
        data: result.data,
        total: result.total,
        stats: result.stats,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lifecycles';
      setError(message);
      console.error('useSubmissionLifecyclePersistence.fetchLifecycles error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch Single Lifecycle
  // ---------------------------------------------------------------------------
  
  const fetchLifecycle = useCallback(async (id: string): Promise<{
    lifecycle: SubmissionLifecycle;
    events: LifecycleEvent[];
  } | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/submissions/lifecycle/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      
      return {
        lifecycle: result.data,
        events: result.events || [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lifecycle';
      setError(message);
      console.error('useSubmissionLifecyclePersistence.fetchLifecycle error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Create Lifecycle
  // ---------------------------------------------------------------------------
  
  const createLifecycle = useCallback(async (data: CreateLifecycleData): Promise<SubmissionLifecycle | null> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/submissions/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      setLastSyncedAt(new Date());
      
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create lifecycle';
      setError(message);
      console.error('useSubmissionLifecyclePersistence.createLifecycle error:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Update Lifecycle
  // ---------------------------------------------------------------------------
  
  const updateLifecycle = useCallback(async (
    id: string, 
    updates: UpdateLifecycleData
  ): Promise<SubmissionLifecycle | null> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/submissions/lifecycle/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      setLastSyncedAt(new Date());
      
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update lifecycle';
      setError(message);
      console.error('useSubmissionLifecyclePersistence.updateLifecycle error:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Delete Lifecycle
  // ---------------------------------------------------------------------------
  
  const deleteLifecycle = useCallback(async (id: string): Promise<boolean> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/submissions/lifecycle/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      setLastSyncedAt(new Date());
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete lifecycle';
      setError(message);
      console.error('useSubmissionLifecyclePersistence.deleteLifecycle error:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Transition State
  // ---------------------------------------------------------------------------
  
  const transitionState = useCallback(async (
    id: string,
    toState: LifecycleState,
    userId: string,
    userName: string,
    reason?: string
  ): Promise<SubmissionLifecycle | null> => {
    return updateLifecycle(id, {
      currentState: toState,
      userId,
      userName,
      reason,
    });
  }, [updateLifecycle]);

  // ---------------------------------------------------------------------------
  // Handle Approval
  // ---------------------------------------------------------------------------
  
  const handleApproval = useCallback(async (
    id: string,
    userId: string,
    userName: string
  ): Promise<SubmissionLifecycle | null> => {
    return transitionState(id, 'approved', userId, userName, 'Health authority approval received');
  }, [transitionState]);

  // ---------------------------------------------------------------------------
  // Execute Archival
  // ---------------------------------------------------------------------------
  
  const executeArchival = useCallback(async (
    id: string,
    userId: string,
    userName: string,
    reason: ArchivalReason,
    notes?: string
  ): Promise<SubmissionLifecycle | null> => {
    return updateLifecycle(id, {
      currentState: 'archived',
      archivalReason: reason,
      archivalNotes: notes,
      userId,
      userName,
      reason: notes || `Archived: ${reason}`,
    });
  }, [updateLifecycle]);

  // ---------------------------------------------------------------------------
  // Cancel Archival
  // ---------------------------------------------------------------------------
  
  const cancelArchival = useCallback(async (
    id: string,
    userId: string,
    userName: string,
    reason: string
  ): Promise<SubmissionLifecycle | null> => {
    // Revert to 'approved' state and clear archival metadata
    return updateLifecycle(id, {
      currentState: 'approved',
      archivalReason: undefined,
      archivalNotes: undefined,
      userId,
      userName,
      reason: reason || 'Archival cancelled',
    });
  }, [updateLifecycle]);

  // ---------------------------------------------------------------------------
  // Retire Documents
  // ---------------------------------------------------------------------------
  
  const retireDocuments = useCallback(async (
    id: string,
    documentIds: string[],
    userId: string,
    userName: string
  ): Promise<SubmissionLifecycle | null> => {
    // First fetch current state
    const current = await fetchLifecycle(id);
    if (!current) return null;
    
    const alreadyRetired = current.lifecycle.documentsRetired || [];
    const newRetired = Array.from(new Set([...alreadyRetired, ...documentIds]));
    
    return updateLifecycle(id, {
      documentsRetired: newRetired,
      userId,
      userName,
      reason: `Retired ${documentIds.length} documents`,
    });
  }, [fetchLifecycle, updateLifecycle]);

  // ---------------------------------------------------------------------------
  // Get Pending Archivals
  // ---------------------------------------------------------------------------
  
  const getPendingArchivals = useCallback(async (): Promise<SubmissionLifecycle[]> => {
    const result = await fetchLifecycles({ isArchivalPending: true });
    return result?.data || [];
  }, [fetchLifecycles]);

  // ---------------------------------------------------------------------------
  // Get Archived Submissions
  // ---------------------------------------------------------------------------
  
  const getArchivedSubmissions = useCallback(async (): Promise<SubmissionLifecycle[]> => {
    const result = await fetchLifecycles({ state: 'archived' });
    return result?.data || [];
  }, [fetchLifecycles]);

  // ---------------------------------------------------------------------------
  // Sync Store to Database
  // ---------------------------------------------------------------------------
  
  const syncToDatabase = useCallback(async (
    lifecycles: SubmissionLifecycle[],
    userId: string,
    userName: string
  ): Promise<boolean> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      for (const lifecycle of lifecycles) {
        await updateLifecycle(lifecycle.submissionId, {
          currentState: lifecycle.currentState,
          documentsToRetire: lifecycle.documentsToRetire,
          documentsRetired: lifecycle.documentsRetired,
          userId,
          userName,
        });
      }
      
      setLastSyncedAt(new Date());
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync to database';
      setError(message);
      console.error('useSubmissionLifecyclePersistence.syncToDatabase error:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [updateLifecycle]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  
  return {
    // State
    isLoading,
    isSyncing,
    lastSyncedAt,
    error,
    source,
    
    // CRUD
    fetchLifecycles,
    fetchLifecycle,
    createLifecycle,
    updateLifecycle,
    deleteLifecycle,
    
    // State transitions
    transitionState,
    handleApproval,
    executeArchival,
    cancelArchival,
    
    // Document management
    retireDocuments,
    
    // Queries
    getPendingArchivals,
    getArchivedSubmissions,
    
    // Sync
    syncToDatabase,
  };
}

export default useSubmissionLifecyclePersistence;
