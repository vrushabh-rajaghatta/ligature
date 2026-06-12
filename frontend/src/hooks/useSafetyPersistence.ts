
/**
 * useSafetyPersistence — Syncs Safety/PV Zustand store with Supabase
 * 
 * Architecture (mirrors useHAQPersistence):
 *   Store (Zustand) ←→ Hook (debounced sync) ←→ API Routes ←→ Supabase
 *
 * The store remains the source of truth for the UI (optimistic updates).
 * This hook handles:
 *   1. Hydration on mount — loads cases and signals from API
 *   2. Narrative auto-save — debounced write-back on narrative changes
 *   3. Status change persistence — immediate write on case status transitions
 *   4. Signal persistence — write on signal status changes
 *   5. Audit trail — fire-and-forget audit events
 *
 * @version 0.43.5
 */


import { useEffect, useRef, useCallback, useState } from 'react';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import type { CaseStatus } from '@/store/safetyTypes';

// =============================================================================
// TYPES
// =============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface SafetyPersistenceState {
  syncStatus: SyncStatus;
  isHydrated: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const NARRATIVE_SAVE_DEBOUNCE_MS = 2000;
const STATUS_SAVE_DEBOUNCE_MS = 500;

// =============================================================================
// API HELPERS
// =============================================================================

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  try {
    // v0.44.53: 5s timeout — prevents indefinite "syncing" when DB/Supabase unavailable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...opts,
    });
    clearTimeout(timeoutId);

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

export function useSafetyPersistence(): SafetyPersistenceState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Refs for debouncing
  const narrativeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevNarrativesRef = useRef<string>('{}');
  const prevCaseStatusRef = useRef<Record<string, string>>({});
  const prevSignalStatusRef = useRef<Record<string, string>>({});
  const mountedRef = useRef(true);

  // =========================================================================
  // HYDRATION — Load from API on mount
  // =========================================================================

  const hydrate = useCallback(async () => {
    if (!mountedRef.current) return;

    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Fetch safety cases
      const { data: caseResult, error: caseError } = await apiFetch<{
        data: unknown[];
        total: number;
        source: string;
      }>('/api/safety');

      if (caseError) {
        setSyncStatus('offline');
        setIsOnline(false);
        setIsHydrated(true);
        return;
      }

      if (!mountedRef.current) return;

      // Hydrate case narratives
      const store = usePharmacovigilanceStore.getState();
      const caseIds = Object.keys(store.cases).slice(0, 20);

      for (const caseId of caseIds) {
        const { data: narrativeData } = await apiFetch<{
          caseId: string;
          narrative: string;
          wordCount: number;
        }>(`/api/safety/${caseId}/narrative`);

        if (narrativeData && narrativeData.narrative && mountedRef.current) {
          const existingCase = store.cases[caseId];
          if (existingCase) {
            store.updateCase(caseId, {
              narrative: {
                ...existingCase.narrative,
                caseSummary: narrativeData.narrative,
              },
            });
          }
        }
      }

      if (!mountedRef.current) return;

      // Track current state for change detection
      const narrativeMap: Record<string, string> = {};
      const statusMap: Record<string, string> = {};
      Object.values(store.cases).forEach(c => {
        narrativeMap[c.id] = c.narrative?.caseSummary || '';
        statusMap[c.id] = c.status;
      });
      prevNarrativesRef.current = JSON.stringify(narrativeMap);
      prevCaseStatusRef.current = statusMap;

      // Track signal statuses
      const signalStatusMap: Record<string, string> = {};
      Object.values(store.signals).forEach(s => {
        signalStatusMap[s.id] = s.status;
      });
      prevSignalStatusRef.current = signalStatusMap;

      setIsOnline(true);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setIsHydrated(true);
    } catch (err) {
      if (mountedRef.current) {
        setSyncStatus('offline');
        setIsOnline(false);
        setSyncError(err instanceof Error ? err.message : 'Hydration failed');
        setIsHydrated(true);
      }
    }
  }, []);

  // =========================================================================
  // NARRATIVE AUTO-SAVE
  // =========================================================================

  const saveNarrativeToServer = useCallback(async (caseId: string, narrative: string) => {
    if (!isOnline) return;

    const { error } = await apiFetch(`/api/safety/${caseId}/narrative`, {
      method: 'PUT',
      body: JSON.stringify({ narrative, source: 'auto-save' }),
    });

    if (error) {
      setSyncError(`Narrative save failed: ${error}`);
      setSyncStatus('error');
    } else {
      setSyncError(null);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    }
  }, [isOnline]);

  // =========================================================================
  // STATUS PERSISTENCE
  // =========================================================================

  const saveCaseStatusToServer = useCallback(async (caseId: string, status: CaseStatus) => {
    if (!isOnline) return;

    const { error } = await apiFetch(`/api/safety/${caseId}`, {
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

  const saveSignalStatusToServer = useCallback(async (signalId: string, status: string) => {
    if (!isOnline) return;

    const { error } = await apiFetch(`/api/safety/signals/${signalId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    if (error) {
      setSyncError(`Signal status save failed: ${error}`);
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

    const unsubscribe = usePharmacovigilanceStore.subscribe((state) => {
      if (!isOnline || !isHydrated) return;

      // --- NARRATIVE CHANGES ---
      const currentNarratives: Record<string, string> = {};
      Object.values(state.cases).forEach(c => {
        currentNarratives[c.id] = c.narrative?.caseSummary || '';
      });
      const narrativesJson = JSON.stringify(currentNarratives);

      if (narrativesJson !== prevNarrativesRef.current) {
        const oldNarratives = JSON.parse(prevNarrativesRef.current);

        for (const [caseId, narrative] of Object.entries(currentNarratives)) {
          if (oldNarratives[caseId] !== narrative) {
            if (narrativeTimerRef.current) clearTimeout(narrativeTimerRef.current);

            setSyncStatus('syncing');
            narrativeTimerRef.current = setTimeout(() => {
              saveNarrativeToServer(caseId, narrative as string);
            }, NARRATIVE_SAVE_DEBOUNCE_MS);
          }
        }

        prevNarrativesRef.current = narrativesJson;
      }

      // --- CASE STATUS CHANGES ---
      for (const caseData of Object.values(state.cases)) {
        const prevStatus = prevCaseStatusRef.current[caseData.id];
        if (prevStatus && prevStatus !== caseData.status) {
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);

          setSyncStatus('syncing');
          const capturedId = caseData.id;
          const capturedStatus = caseData.status;
          statusTimerRef.current = setTimeout(() => {
            saveCaseStatusToServer(capturedId, capturedStatus);
          }, STATUS_SAVE_DEBOUNCE_MS);
        }
        prevCaseStatusRef.current[caseData.id] = caseData.status;
      }

      // --- SIGNAL STATUS CHANGES ---
      for (const signal of Object.values(state.signals)) {
        const prevStatus = prevSignalStatusRef.current[signal.id];
        if (prevStatus && prevStatus !== signal.status) {
          const capturedId = signal.id;
          const capturedStatus = signal.status;
          saveSignalStatusToServer(capturedId, capturedStatus);
        }
        prevSignalStatusRef.current[signal.id] = signal.status;
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (narrativeTimerRef.current) clearTimeout(narrativeTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
