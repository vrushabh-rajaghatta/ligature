
/**
 * TMF Persistence Hook
 * Connects useTMFStore to Supabase via API routes
 * 
 * v0.40.5 - TMF Persistence
 */

import { useCallback, useState } from 'react';
import { useTMFStore } from '@/store/useTMFStore';
import { TMFArtifact, TMFZone } from '@/store/tmfTypes';

// =============================================================================
// TYPES
// =============================================================================

interface ArtifactFilters {
  studyId?: string;
  zone?: TMFZone;
  status?: string;
  level?: string;
  qcStatus?: string;
  siteId?: string;
  isEssential?: boolean;
  search?: string;
}

interface GapFilters {
  studyId?: string;
  status?: string;
  severity?: string;
  type?: string;
  zone?: TMFZone;
  inspectionRisk?: boolean;
  search?: string;
}

interface ZoneStats {
  zone: TMFZone;
  name: string;
  description: string;
  isCritical: boolean;
  totalArtifacts: number;
  expectedArtifacts: number;
  receivedArtifacts: number;
  approvedArtifacts: number;
  completenessPercent: number;
  criticalMissing: number;
}

interface PersistenceState {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  source: 'database' | 'mock' | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTMFPersistence() {
  const store = useTMFStore();
  const [state, setState] = useState<PersistenceState>({
    isLoading: false,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    source: null,
  });

  // ---------------------------------------------------------------------------
  // ARTIFACTS
  // ---------------------------------------------------------------------------

  const fetchArtifacts = useCallback(async (filters?: ArtifactFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (filters?.studyId) params.append('studyId', filters.studyId);
      if (filters?.zone) params.append('zone', filters.zone);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.level) params.append('level', filters.level);
      if (filters?.qcStatus) params.append('qcStatus', filters.qcStatus);
      if (filters?.siteId) params.append('siteId', filters.siteId);
      if (filters?.isEssential) params.append('isEssential', 'true');
      if (filters?.search) params.append('search', filters.search);
      
      const res = await fetch(`/api/tmf/artifacts?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch artifacts');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return {
        artifacts: json.data,
        total: json.total,
        stats: json.stats,
        source: json.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const createArtifact = useCallback(async (data: Partial<TMFArtifact>) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch('/api/tmf/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create artifact');
      
      // Also create in local store
      store.addArtifact(json.data);
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, [store]);

  const updateArtifact = useCallback(async (id: string, updates: Partial<TMFArtifact>) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch(`/api/tmf/artifacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update artifact');
      
      // Also update in local store
      store.updateArtifact(id, json.data);
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, [store]);

  const fileArtifact = useCallback(async (id: string, filedBy: string) => {
    return updateArtifact(id, { 
      status: 'filed' as any, 
      filedDate: new Date().toISOString(),
      lastModifiedBy: filedBy,
    });
  }, [updateArtifact]);

  const approveArtifact = useCallback(async (id: string, approvedBy: string, qcComments?: string) => {
    return updateArtifact(id, {
      status: 'approved' as any,
      qualityStatus: 'qc-passed' as any,
      lastModifiedBy: approvedBy,
      updatedAt: new Date().toISOString(),
    });
  }, [updateArtifact]);

  const rejectArtifact = useCallback(async (id: string, rejectedBy: string, reason: string) => {
    return updateArtifact(id, {
      status: 'rejected' as any,
      qualityStatus: 'qc-failed' as any,
      lastModifiedBy: rejectedBy,
      updatedAt: new Date().toISOString(),
    });
  }, [updateArtifact]);

  const deleteArtifact = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch(`/api/tmf/artifacts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete artifact');
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // ZONES
  // ---------------------------------------------------------------------------

  // v0.42.28: Zone stats summary interface
  interface ZoneStatsSummary {
    totalArtifacts?: number;
    compliantZones?: number;
    totalZones?: number;
    [key: string]: unknown;
  }

  const fetchZoneStats = useCallback(async (studyId?: string): Promise<{ zones: ZoneStats[]; stats: ZoneStatsSummary }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = studyId ? `?studyId=${studyId}` : '';
      const res = await fetch(`/api/tmf/zones${params}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch zone stats');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return { zones: json.data, stats: json.stats };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // GAPS
  // ---------------------------------------------------------------------------

  const fetchGaps = useCallback(async (filters?: GapFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (filters?.studyId) params.append('studyId', filters.studyId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.zone) params.append('zone', filters.zone);
      if (filters?.inspectionRisk) params.append('inspectionRisk', 'true');
      if (filters?.search) params.append('search', filters.search);
      
      const res = await fetch(`/api/tmf/gaps?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch gaps');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return {
        gaps: json.data,
        total: json.total,
        stats: json.stats,
        source: json.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const createGap = useCallback(async (data: {
    title: string;
    description: string;
    type: string;
    severity: string;
    studyId?: string;
    zone?: TMFZone;
    section?: string;
    artifactId?: string;
    dueDate?: string;
    remediationPlan?: string;
    remediationOwner?: string;
    inspectionRisk?: boolean;
  }) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch('/api/tmf/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create gap');
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, []);

  const updateGap = useCallback(async (id: string, updates: Partial<{
    title: string;
    description: string;
    type: string;
    severity: string;
    status: string;
    dueDate: string;
    remediationPlan: string;
    remediationOwner: string;
    estimatedHours: number;
    actualHours: number;
    inspectionRisk: boolean;
    resolvedById: string;
  }>) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch(`/api/tmf/gaps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update gap');
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, []);

  const resolveGap = useCallback(async (id: string, resolvedBy: string, actualHours?: number) => {
    return updateGap(id, {
      status: 'resolved',
      resolvedById: resolvedBy,
      actualHours,
    });
  }, [updateGap]);

  const deleteGap = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch(`/api/tmf/gaps/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete gap');
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SYNC
  // ---------------------------------------------------------------------------

  const syncToCloud = useCallback(async (studyId: string) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      // Get all artifacts for study from local store
      const localArtifacts = Object.values(store.artifacts).filter(a => a.studyId === studyId);
      
      // Sync each artifact
      for (const artifact of localArtifacts) {
        await fetch('/api/tmf/artifacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(artifact),
        });
      }
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return { synced: localArtifacts.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, [store.artifacts]);

  const loadFromCloud = useCallback(async (studyId: string) => {
    const result = await fetchArtifacts({ studyId });
    
    // Update local store with fetched data
    // Note: This is a simplified version - in production you'd merge intelligently
    result.artifacts.forEach((artifact: TMFArtifact) => {
      store.addArtifact(artifact);
    });
    
    return result;
  }, [fetchArtifacts, store]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // State
    ...state,
    
    // Artifacts
    fetchArtifacts,
    createArtifact,
    updateArtifact,
    fileArtifact,
    approveArtifact,
    rejectArtifact,
    deleteArtifact,
    
    // Zones
    fetchZoneStats,
    
    // Gaps
    fetchGaps,
    createGap,
    updateGap,
    resolveGap,
    deleteGap,
    
    // Sync
    syncToCloud,
    loadFromCloud,
  };
}
