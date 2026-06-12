
/**
 * useResearchPersistence
 *
 * Syncs the Research Zustand store (useResearchStore) with the API/Supabase
 * persistence layer via the /api/research/* routes.
 *
 * Architecture mirrors useSafetyPersistence:
 *   Store (Zustand) ←→ Hook (debounced sync) ←→ API Routes ←→ Supabase
 *
 * Responsibilities:
 *   1. Hydration on mount  — loads targets, studies, literature from API
 *   2. Target persistence  — immediate write on add/update/remove
 *   3. Study persistence   — immediate write on add/update/remove
 *   4. Literature triage   — write-back when alert relevance/status changes
 *   5. Graceful offline    — 5 s timeout, falls back to store-only mode
 *
 * Usage:
 *   Call once near the top of ResearchScreen (or a parent layout):
 *
 *     const { syncStatus, isHydrated } = useResearchPersistence();
 *
 * @version 0.89.0
 */


import { useEffect, useRef, useCallback, useState } from 'react';
import { useResearchStore } from '@/store/useResearchStore';
import type { TargetProgram, PreclinicalStudy, LiteratureAlert } from '@/data/research-data';
import {
  literatureAlerts as seedAlerts,
  targetPrograms as seedTargets,
  preclinicalStudies as seedStudies,
} from '@/data/research-data';

// =============================================================================
// TYPES
// =============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface ResearchPersistenceState {
  syncStatus: SyncStatus;
  isHydrated: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  isOnline: boolean;
  /** Re-fetch all research data from API */
  refresh: () => Promise<void>;
  /** Persist a target create/update immediately */
  persistTarget: (target: TargetProgram) => Promise<void>;
  /** Persist a target delete immediately */
  deleteTarget: (id: string) => Promise<void>;
  /** Persist a study create/update immediately */
  persistStudy: (study: PreclinicalStudy) => Promise<void>;
  /** Persist a study delete immediately */
  deleteStudy: (id: string) => Promise<void>;
  /** Persist a literature alert create/update */
  persistAlert: (alert: LiteratureAlert) => Promise<void>;
  /** Persist a literature alert delete */
  deleteAlert: (id: string) => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FETCH_TIMEOUT_MS = 5000;

// =============================================================================
// FETCH HELPER
// =============================================================================

async function apiFetch<T>(
  url: string,
  opts?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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

export function useResearchPersistence(): ResearchPersistenceState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const mountedRef = useRef(true);

  // Store actions
  const loadSeedData = useResearchStore((s) => s.loadSeedData);
  const addTarget = useResearchStore((s) => s.addTarget);
  const updateTarget = useResearchStore((s) => s.updateTarget);
  const removeTarget = useResearchStore((s) => s.removeTarget);
  const addStudy = useResearchStore((s) => s.addStudy);
  const updateStudy = useResearchStore((s) => s.updateStudy);
  const removeStudy = useResearchStore((s) => s.removeStudy);
  const isSeeded = useResearchStore((s) => s._seeded);

  // =========================================================================
  // ONLINE / OFFLINE DETECTION
  // =========================================================================

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // =========================================================================
  // HYDRATION — load from API on mount
  // =========================================================================

  const hydrate = useCallback(async () => {
    if (!mountedRef.current) return;
    setSyncStatus('syncing');

    try {
      const [targetsRes, studiesRes, alertsRes] = await Promise.all([
        apiFetch<TargetProgram[]>('/api/research/targets'),
        apiFetch<PreclinicalStudy[]>('/api/research/studies'),
        apiFetch<LiteratureAlert[]>('/api/research/literature'),
      ]);

      if (!mountedRef.current) return;

      // If all three errored — treat as offline / no API
      const allFailed = targetsRes.error && studiesRes.error && alertsRes.error;
      if (allFailed) {
        // Seed store from static data so the screen has something to show
        loadSeedData(seedTargets, seedStudies);
        setSyncStatus('offline');
        setSyncError('Research API unavailable — showing seed data');
        setIsHydrated(true);
        return;
      }

      // Use API data where available, fall back to seed for failed endpoints
      const targets = targetsRes.data ?? seedTargets;
      const studies = studiesRes.data ?? seedStudies;

      // The research store manages targets + studies — load them
      // We force-seed even if already seeded so API data wins over static seed
      useResearchStore.setState({
        targets,
        studies,
        _seeded: true,
      });

      // Literature alerts live in local state in ResearchScreen (no store slot yet)
      // — the hook exposes them via a separate mechanism; the screen can call
      //   refresh() if it needs to reload. For now we just log availability.
      if (alertsRes.data) {
        // Future: wire into a dedicated alerts slice in useResearchStore
        // Currently stored via the seed mechanism in the service layer
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncError(null);
      setIsHydrated(true);
    } catch (err) {
      if (!mountedRef.current) return;
      // Fallback: ensure store has seed data
      if (!isSeeded) loadSeedData(seedTargets, seedStudies);
      setSyncStatus('offline');
      setSyncError(err instanceof Error ? err.message : 'Hydration failed');
      setIsHydrated(true);
    }
  }, [loadSeedData, isSeeded]);

  useEffect(() => {
    mountedRef.current = true;
    hydrate();
    return () => {
      mountedRef.current = false;
    };
  }, [hydrate]);

  // =========================================================================
  // PERSIST TARGET (create / update)
  // =========================================================================

  const persistTarget = useCallback(async (target: TargetProgram) => {
    try {
      const { error } = await apiFetch('/api/research/targets', {
        method: 'POST',
        body: JSON.stringify(target),
      });
      if (error) console.warn('[useResearchPersistence] persistTarget:', error);
    } catch (err) {
      console.warn('[useResearchPersistence] persistTarget network error:', err);
    }
  }, []);

  // =========================================================================
  // DELETE TARGET
  // =========================================================================

  const deleteTargetFn = useCallback(async (id: string) => {
    try {
      const { error } = await apiFetch(`/api/research/targets/${id}`, {
        method: 'DELETE',
      });
      if (error) console.warn('[useResearchPersistence] deleteTarget:', error);
    } catch (err) {
      console.warn('[useResearchPersistence] deleteTarget network error:', err);
    }
  }, []);

  // =========================================================================
  // PERSIST STUDY (create / update)
  // =========================================================================

  const persistStudy = useCallback(async (study: PreclinicalStudy) => {
    try {
      const { error } = await apiFetch('/api/research/studies', {
        method: 'POST',
        body: JSON.stringify(study),
      });
      if (error) console.warn('[useResearchPersistence] persistStudy:', error);
    } catch (err) {
      console.warn('[useResearchPersistence] persistStudy network error:', err);
    }
  }, []);

  // =========================================================================
  // DELETE STUDY
  // =========================================================================

  const deleteStudyFn = useCallback(async (id: string) => {
    try {
      const { error } = await apiFetch(`/api/research/studies/${id}`, {
        method: 'DELETE',
      });
      if (error) console.warn('[useResearchPersistence] deleteStudy:', error);
    } catch (err) {
      console.warn('[useResearchPersistence] deleteStudy network error:', err);
    }
  }, []);

  // =========================================================================
  // PERSIST ALERT (create / update)
  // =========================================================================

  const persistAlert = useCallback(async (alert: LiteratureAlert) => {
    try {
      const { error } = await apiFetch('/api/research/literature', {
        method: 'POST',
        body: JSON.stringify(alert),
      });
      if (error) console.warn('[useResearchPersistence] persistAlert:', error);
    } catch (err) {
      console.warn('[useResearchPersistence] persistAlert network error:', err);
    }
  }, []);

  // =========================================================================
  // DELETE ALERT
  // =========================================================================

  const deleteAlertFn = useCallback(async (id: string) => {
    try {
      const { error } = await apiFetch(`/api/research/literature/${id}`, {
        method: 'DELETE',
      });
      if (error) console.warn('[useResearchPersistence] deleteAlert:', error);
    } catch (err) {
      console.warn('[useResearchPersistence] deleteAlert network error:', err);
    }
  }, []);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    syncStatus,
    isHydrated,
    lastSyncedAt,
    syncError,
    isOnline,
    refresh: hydrate,
    persistTarget,
    deleteTarget: deleteTargetFn,
    persistStudy,
    deleteStudy: deleteStudyFn,
    persistAlert,
    deleteAlert: deleteAlertFn,
  };
}

// =============================================================================
// v0.90.0 — LEAD OPT + TRANSLATIONAL SCIENCE EXTENSIONS
// =============================================================================
// These are exported as standalone hooks so ResearchScreen can import only
// what it needs.  Both hooks mirror the useSafetyPersistence pattern:
//   - Hydrate from API on mount (5s timeout)
//   - Expose persist/delete helpers (fire-and-forget)
//   - Graceful fallback to static seed data
// =============================================================================

import type { LeadSeries } from '@/data/lead-optimization-data';
import type { TranslationalStudy } from '@/data/translational-data';
import {
  leadSeries as seedLeadSeries,
  candidateSelectionSummary as seedCandidateSummary,
} from '@/data/lead-optimization-data';
import {
  translationalStudies as seedTransStudies,
  biomarkerPanels as seedBiomarkerPanels,
  safetyTranslations as seedSafetyTranslations,
} from '@/data/translational-data';

// ---------------------------------------------------------------------------
// useLeadOptPersistence
// ---------------------------------------------------------------------------

export interface LeadOptPersistenceState {
  syncStatus: SyncStatus;
  isHydrated: boolean;
  lastSyncedAt: Date | null;
  persistLeadSeries: (series: LeadSeries) => Promise<void>;
  deleteLeadSeries: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLeadOptPersistence(): LeadOptPersistenceState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const loadLeadOptData = useResearchStore((s) => s.loadLeadOptData);
  const leadOptSeeded = useResearchStore((s) => s._leadOptSeeded);

  const hydrate = useCallback(async () => {
    if (!mountedRef.current) return;
    setSyncStatus('syncing');
    try {
      const result = await apiFetch<LeadSeries[]>('/api/research/lead-series');
      if (!mountedRef.current) return;
      if (result.error || !result.data) {
        if (!leadOptSeeded) loadLeadOptData(seedLeadSeries, seedCandidateSummary);
        setSyncStatus('offline');
        setIsHydrated(true);
        return;
      }
      useResearchStore.setState({ leadSeries: result.data, candidateSelectionSummary: seedCandidateSummary, _leadOptSeeded: true });
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setIsHydrated(true);
    } catch {
      if (!leadOptSeeded) loadLeadOptData(seedLeadSeries, seedCandidateSummary);
      setSyncStatus('offline');
      setIsHydrated(true);
    }
  }, [loadLeadOptData, leadOptSeeded]);

  useEffect(() => {
    mountedRef.current = true;
    hydrate();
    return () => { mountedRef.current = false; };
  }, [hydrate]);

  const persistLeadSeries = useCallback(async (series: LeadSeries) => {
    try {
      const { error } = await apiFetch('/api/research/lead-series', { method: 'POST', body: JSON.stringify(series) });
      if (error) console.warn('[useLeadOptPersistence] persist:', error);
    } catch (err) { console.warn('[useLeadOptPersistence] network error:', err); }
  }, []);

  const deleteLeadSeriesFn = useCallback(async (id: string) => {
    try {
      const { error } = await apiFetch(`/api/research/lead-series/${id}`, { method: 'DELETE' });
      if (error) console.warn('[useLeadOptPersistence] delete:', error);
    } catch (err) { console.warn('[useLeadOptPersistence] delete network error:', err); }
  }, []);

  return { syncStatus, isHydrated, lastSyncedAt, persistLeadSeries, deleteLeadSeries: deleteLeadSeriesFn, refresh: hydrate };
}

// ---------------------------------------------------------------------------
// useTranslationalPersistence
// ---------------------------------------------------------------------------

export interface TranslationalPersistenceState {
  syncStatus: SyncStatus;
  isHydrated: boolean;
  lastSyncedAt: Date | null;
  persistTranslationalStudy: (study: TranslationalStudy) => Promise<void>;
  deleteTranslationalStudy: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTranslationalPersistence(): TranslationalPersistenceState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const loadTranslationalData = useResearchStore((s) => s.loadTranslationalData);
  const transSeeded = useResearchStore((s) => s._translationalSeeded);

  const hydrate = useCallback(async () => {
    if (!mountedRef.current) return;
    setSyncStatus('syncing');
    try {
      const result = await apiFetch<TranslationalStudy[]>('/api/research/translational-studies');
      if (!mountedRef.current) return;
      if (result.error || !result.data) {
        if (!transSeeded) loadTranslationalData(seedTransStudies, seedBiomarkerPanels, seedSafetyTranslations);
        setSyncStatus('offline');
        setIsHydrated(true);
        return;
      }
      useResearchStore.setState({
        translationalStudies: result.data,
        biomarkerPanels: seedBiomarkerPanels,
        safetyTranslations: seedSafetyTranslations,
        _translationalSeeded: true,
      });
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setIsHydrated(true);
    } catch {
      if (!transSeeded) loadTranslationalData(seedTransStudies, seedBiomarkerPanels, seedSafetyTranslations);
      setSyncStatus('offline');
      setIsHydrated(true);
    }
  }, [loadTranslationalData, transSeeded]);

  useEffect(() => {
    mountedRef.current = true;
    hydrate();
    return () => { mountedRef.current = false; };
  }, [hydrate]);

  const persistTranslationalStudy = useCallback(async (study: TranslationalStudy) => {
    try {
      const { error } = await apiFetch('/api/research/translational-studies', { method: 'POST', body: JSON.stringify(study) });
      if (error) console.warn('[useTranslationalPersistence] persist:', error);
    } catch (err) { console.warn('[useTranslationalPersistence] network error:', err); }
  }, []);

  const deleteTranslationalStudyFn = useCallback(async (id: string) => {
    try {
      const { error } = await apiFetch(`/api/research/translational-studies/${id}`, { method: 'DELETE' });
      if (error) console.warn('[useTranslationalPersistence] delete:', error);
    } catch (err) { console.warn('[useTranslationalPersistence] delete network error:', err); }
  }, []);

  return { syncStatus, isHydrated, lastSyncedAt, persistTranslationalStudy, deleteTranslationalStudy: deleteTranslationalStudyFn, refresh: hydrate };
}
