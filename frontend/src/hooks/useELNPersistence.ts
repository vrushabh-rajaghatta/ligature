
/**
 * useELNPersistence
 *
 * Syncs the ELN Zustand store with the API / Supabase persistence layer.
 *
 * Architecture mirrors useSafetyPersistence:
 *   Store (Zustand) ←→ Hook (debounced sync) ←→ API Routes ←→ Supabase
 *
 * Responsibilities:
 *   1. Hydration on mount — loads experiments and notebooks from API
 *   2. Experiment persistence — immediate write on create/update
 *   3. Electronic signature — POST to /api/eln/experiments/[id]/sign
 *   4. Data entry persistence — debounced write on capture
 *   5. Graceful offline — 5 s timeout, falls back to in-store mock data
 *
 * @version 0.93.0
 */


import { useEffect, useRef, useCallback, useState } from 'react';
import { useELNStore } from '@/store/useELNStore';
import type { ELNExperiment, ELNNotebook, ELNDataEntry } from '@/domains/eln/contracts';

// =============================================================================
// TYPES
// =============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface ELNPersistenceState {
  syncStatus: SyncStatus;
  isHydrated: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
  persistExperiment: (exp: ELNExperiment) => Promise<void>;
  deleteExperiment: (id: string) => Promise<void>;
  signExperiment: (
    id: string,
    signedBy: string,
    signatureType: 'signed' | 'countersigned' | 'witnessed',
    typedName: string,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  persistNotebook: (notebook: ELNNotebook) => Promise<void>;
  persistDataEntry: (entry: ELNDataEntry) => Promise<void>;
  deleteDataEntry: (id: string) => Promise<void>;
}

// =============================================================================
// FETCH HELPER
// =============================================================================

async function apiFetch<T>(
  url: string,
  opts?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
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
    return { data: (body.data ?? body) as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useELNPersistence(): ELNPersistenceState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const mountedRef = useRef(true);

  // ── Online / Offline ────────────────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => { setIsOnline(false); setSyncStatus('offline'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Hydration ───────────────────────────────────────────────────────────────
  const hydrate = useCallback(async () => {
    if (!mountedRef.current) return;
    setSyncStatus('syncing');

    try {
      const [experimentsRes, notebooksRes] = await Promise.all([
        apiFetch<ELNExperiment[]>('/api/eln/experiments'),
        apiFetch<ELNNotebook[]>('/api/eln/notebooks'),
      ]);

      if (!mountedRef.current) return;

      if (experimentsRes.error && notebooksRes.error) {
        setSyncStatus('offline');
        setSyncError('ELN API unavailable — showing in-memory data');
        setIsHydrated(true);
        return;
      }

      // Patch the Zustand store state directly (store uses its own internal state)
      // ELNStore doesn't expose a bulk-load action, so we use setState
      const storeState = useELNStore.getState();
      if (experimentsRes.data?.length) {
        useELNStore.setState({ experiments: experimentsRes.data });
      }
      if (notebooksRes.data?.length) {
        useELNStore.setState({ notebooks: notebooksRes.data });
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncError(null);
      setIsHydrated(true);
    } catch (err) {
      if (!mountedRef.current) return;
      setSyncStatus('offline');
      setSyncError(err instanceof Error ? err.message : 'Hydration failed');
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    hydrate();
    return () => { mountedRef.current = false; };
  }, [hydrate]);

  // ── Persist Experiment ──────────────────────────────────────────────────────
  const persistExperiment = useCallback(async (exp: ELNExperiment) => {
    try {
      const { error } = await apiFetch('/api/eln/experiments', {
        method: 'POST',
        body: JSON.stringify(exp),
      });
      if (error) console.warn('[useELNPersistence] persistExperiment:', error);
    } catch (err) {
      console.warn('[useELNPersistence] persistExperiment network error:', err);
    }
  }, []);

  // ── Delete Experiment ───────────────────────────────────────────────────────
  const deleteExperimentFn = useCallback(async (id: string) => {
    try {
      const { error } = await apiFetch(`/api/eln/experiments/${id}`, { method: 'DELETE' });
      if (error) console.warn('[useELNPersistence] deleteExperiment:', error);
    } catch (err) {
      console.warn('[useELNPersistence] deleteExperiment network error:', err);
    }
  }, []);

  // ── Sign Experiment (21 CFR Part 11) ────────────────────────────────────────
  const signExperimentFn = useCallback(async (
    id: string,
    signedBy: string,
    signatureType: 'signed' | 'countersigned' | 'witnessed',
    typedName: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/eln/experiments/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedBy, signatureType, typedName, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Signature request failed',
      };
    }
  }, []);

  // ── Persist Notebook ────────────────────────────────────────────────────────
  const persistNotebook = useCallback(async (notebook: ELNNotebook) => {
    try {
      const { error } = await apiFetch('/api/eln/notebooks', {
        method: 'POST',
        body: JSON.stringify(notebook),
      });
      if (error) console.warn('[useELNPersistence] persistNotebook:', error);
    } catch (err) {
      console.warn('[useELNPersistence] persistNotebook network error:', err);
    }
  }, []);

  // ── Persist Data Entry ──────────────────────────────────────────────────────
  const persistDataEntry = useCallback(async (entry: ELNDataEntry) => {
    try {
      const { error } = await apiFetch('/api/eln/data-entries', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      if (error) console.warn('[useELNPersistence] persistDataEntry:', error);
    } catch (err) {
      console.warn('[useELNPersistence] persistDataEntry network error:', err);
    }
  }, []);

  // ── Delete Data Entry ───────────────────────────────────────────────────────
  const deleteDataEntryFn = useCallback(async (id: string) => {
    try {
      const { error } = await apiFetch(`/api/eln/data-entries?id=${id}`, { method: 'DELETE' });
      if (error) console.warn('[useELNPersistence] deleteDataEntry:', error);
    } catch (err) {
      console.warn('[useELNPersistence] deleteDataEntry network error:', err);
    }
  }, []);

  return {
    syncStatus,
    isHydrated,
    lastSyncedAt,
    syncError,
    isOnline,
    refresh: hydrate,
    persistExperiment,
    deleteExperiment: deleteExperimentFn,
    signExperiment: signExperimentFn,
    persistNotebook,
    persistDataEntry,
    deleteDataEntry: deleteDataEntryFn,
  };
}
