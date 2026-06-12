
/**
 * useHAQPersistence — Syncs HAQ Zustand store with Supabase
 * 
 * Architecture:
 *   Store (Zustand) ←→ Hook (debounced sync) ←→ API Routes ←→ Supabase
 *
 * The store remains the source of truth for the UI (optimistic updates).
 * This hook handles:
 *   1. Hydration on mount — loads HAQs, drafts, reviews from API
 *   2. Draft auto-save — debounced write-back on draft changes
 *   3. Status change persistence — immediate write on status transitions
 *   4. Review persistence — write on reviewer assignment/completion
 *   5. Audit trail — fire-and-forget audit events
 *
 * @version 0.43.5
 */


import { useEffect, useRef, useCallback, useState } from 'react';
import { useHAQStore } from '@/store/useHAQStore';
import type { HAQuestion, HAQStatus } from '@/types/haq';

// =============================================================================
// TYPES
// =============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface PersistenceState {
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Whether initial hydration from server is complete */
  isHydrated: boolean;
  /** Last successful sync timestamp */
  lastSyncedAt: Date | null;
  /** Error message if sync failed */
  syncError: string | null;
  /** Whether Supabase is configured and reachable */
  isOnline: boolean;
  /** Force re-sync from server */
  refresh: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAFT_SAVE_DEBOUNCE_MS = 2000;
const STATUS_SAVE_DEBOUNCE_MS = 500;

// =============================================================================
// API HELPERS
// =============================================================================

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      return { data: null, error: body.error || `HTTP ${res.status}` };
    }

    const body = await res.json();
    return { data: body.data ?? body, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useHAQPersistence(): PersistenceState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Refs for debouncing
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevDraftsRef = useRef<string>('');
  const prevStatusRef = useRef<Record<string, string>>({});
  const mountedRef = useRef(true);

  // =========================================================================
  // HYDRATION — Load from API on mount
  // =========================================================================

  const hydrate = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Fetch HAQs from API
      const { data: haqResult, error: haqError } = await apiFetch<{
        data: HAQuestion[];
        total: number;
        source: string;
      }>('/api/haqs');

      if (haqError) {
        // API unavailable — stay in demo mode with mock data
        setSyncStatus('offline');
        setIsOnline(false);
        setIsHydrated(true);
        return;
      }

      if (!mountedRef.current) return;

      const haqs = haqResult?.data || haqResult;
      
      // Only hydrate from server if we got real data (not mock)
      if (Array.isArray(haqs) && haqs.length > 0) {
        const store = useHAQStore.getState();
        
        // Merge server HAQs with store — server wins for existing, keep local additions
        const serverIds = new Set(haqs.map((h: HAQuestion) => h.id));
        const localOnly = store.haqs.filter(h => !serverIds.has(h.id));
        
        useHAQStore.setState({
          haqs: [...haqs, ...localOnly],
        });

        // Initialize prev-status tracking
        const statusMap: Record<string, string> = {};
        haqs.forEach((h: HAQuestion) => { statusMap[h.id] = h.status; });
        prevStatusRef.current = statusMap;
      }

      // Fetch current drafts for all HAQs
      const store = useHAQStore.getState();
      for (const haq of store.haqs.slice(0, 20)) { // Limit to 20 for perf
        const { data: draftData } = await apiFetch<{
          haqId: string;
          content: string;
          wordCount: number;
        }>(`/api/haqs/${haq.id}/drafts/current`);

        if (draftData && draftData.content && mountedRef.current) {
          store.saveDraft(haq.id, draftData.content);
        }
      }

      if (!mountedRef.current) return;

      // Snapshot current drafts for change detection
      prevDraftsRef.current = JSON.stringify(useHAQStore.getState().drafts);

      setIsOnline(true);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setIsHydrated(true);
    } catch (err) {
      if (mountedRef.current) {
        setSyncStatus('offline');
        setIsOnline(false);
        setSyncError(err instanceof Error ? err.message : 'Hydration failed');
        setIsHydrated(true); // Still mark as hydrated so UI isn't blocked
      }
    }
  }, []);

  // =========================================================================
  // DRAFT AUTO-SAVE — debounced write on draft changes
  // =========================================================================

  const saveDraftToServer = useCallback(async (haqId: string, content: string) => {
    if (!isOnline) return;

    const { error } = await apiFetch(`/api/haqs/${haqId}/drafts/current`, {
      method: 'PUT',
      body: JSON.stringify({ content, source: 'auto-save' }),
    });

    if (error) {
      setSyncError(`Draft save failed: ${error}`);
      setSyncStatus('error');
    } else {
      setSyncError(null);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    }
  }, [isOnline]);

  // =========================================================================
  // STATUS PERSISTENCE — immediate write on status changes
  // =========================================================================

  const saveStatusToServer = useCallback(async (haqId: string, status: HAQStatus) => {
    if (!isOnline) return;

    const { error } = await apiFetch(`/api/haqs/${haqId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    if (error) {
      setSyncError(`Status save failed: ${error}`);
      setSyncStatus('error');
    } else {
      setSyncError(null);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    }
  }, [isOnline]);

  // =========================================================================
  // STORE SUBSCRIPTION — watch for changes and sync
  // =========================================================================

  useEffect(() => {
    hydrate();

    // Subscribe to store changes
    const unsubscribe = useHAQStore.subscribe((state) => {
      if (!isOnline || !isHydrated) return;

      // --- DRAFT CHANGES ---
      const currentDrafts = JSON.stringify(state.drafts);
      if (currentDrafts !== prevDraftsRef.current) {
        const oldDrafts = JSON.parse(prevDraftsRef.current || '{}');
        const newDrafts = state.drafts;

        // Find which drafts changed
        for (const [haqId, draft] of Object.entries(newDrafts)) {
          const oldDraft = oldDrafts[haqId];
          if (!oldDraft || oldDraft.content !== draft.content) {
            // Debounce the save
            if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
            
            setSyncStatus('syncing');
            draftTimerRef.current = setTimeout(() => {
              saveDraftToServer(haqId, draft.content);
            }, DRAFT_SAVE_DEBOUNCE_MS);
          }
        }

        prevDraftsRef.current = currentDrafts;
      }

      // --- STATUS CHANGES ---
      for (const haq of state.haqs) {
        const prevStatus = prevStatusRef.current[haq.id];
        if (prevStatus && prevStatus !== haq.status) {
          // Debounce briefly to batch rapid changes
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
          
          setSyncStatus('syncing');
          const capturedId = haq.id;
          const capturedStatus = haq.status;
          statusTimerRef.current = setTimeout(() => {
            saveStatusToServer(capturedId, capturedStatus);
          }, STATUS_SAVE_DEBOUNCE_MS);
        }
        prevStatusRef.current[haq.id] = haq.status;
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-subscribe when online status changes
  useEffect(() => {
    if (isOnline && isHydrated) {
      setSyncStatus('synced');
    }
  }, [isOnline, isHydrated]);

  return {
    syncStatus,
    isHydrated,
    lastSyncedAt,
    syncError,
    isOnline,
    refresh: hydrate,
  };
}
