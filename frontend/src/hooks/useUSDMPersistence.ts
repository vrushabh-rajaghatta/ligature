
/**
 * useUSDMPersistence
 *
 * Syncs the USDM Zustand stores with the API / Supabase persistence layer.
 *
 * Architecture mirrors useSafetyPersistence:
 *   Store (Zustand) ←→ Hook (debounced sync) ←→ API Routes ←→ Supabase
 *
 * Responsibilities:
 *   1. Hydration on mount  — loads studies from /api/usdm/studies
 *   2. Study persistence   — immediate write on create/update
 *   3. TPP persistence     — immediate write on TPP/claim changes
 *   4. Graceful offline    — 5s timeout, falls back to in-store mock data
 *   5. Online/offline detection via window events
 *
 * Usage:
 *   Call once at the top of StudyDesignScreen:
 *     const { syncStatus, isHydrated, persistStudy, persistTPP } = useUSDMPersistence();
 *
 * @version 0.96.0
 */


import { useEffect, useRef, useCallback, useState } from 'react';
import { useUSDMStore } from '@/store/useUSDMStore';
import { useUSDMTPPStore } from '@/store/useUSDMTPPStore';
import { useUSDMDesignMatrixStore, loadDesignMatrixMockData } from '@/store/useUSDMDesignMatrixStore';

// =============================================================================
// TYPES
// =============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface USDMPersistenceState {
  syncStatus: SyncStatus;
  isHydrated: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
  persistStudy: (study: Record<string, unknown>) => Promise<void>;
  deleteStudy: (id: string) => Promise<void>;
  persistTPP: (studyId: string, tpp: Record<string, unknown>, claims: Record<string, unknown>[]) => Promise<void>;
}

const FETCH_TIMEOUT_MS = 5000;

// =============================================================================
// FETCH HELPER
// =============================================================================

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    const json = await res.json();
    return { data: json as T, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useUSDMPersistence(): USDMPersistenceState {
  const [syncStatus, setSyncStatus]     = useState<SyncStatus>('idle');
  const [isHydrated, setIsHydrated]     = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError]       = useState<string | null>(null);
  const [isOnline, setIsOnline]         = useState(true);
  const hydrated = useRef(false);

  // Store accessors
  const loadMockData    = useUSDMStore(s => s.loadMockData);
  const studiesRecord   = useUSDMStore(s => s.studies);

  // ==========================================================================
  // Online / offline tracking
  // ==========================================================================

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => { setIsOnline(false); setSyncStatus('offline'); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==========================================================================
  // Hydration on mount
  // ==========================================================================

  const hydrate = useCallback(async () => {
    if (hydrated.current) return;
    hydrated.current = true;
    setSyncStatus('syncing');

    try {
      // 1. Load studies
      const { data: studiesResp, error: studiesErr } = await apiFetch<{ studies: Record<string, unknown>[] }>(
        '/api/usdm/studies'
      );

      if (studiesErr || !studiesResp?.studies?.length) {
        // Fallback: load mock data into store
        loadMockData();

        // Also seed design matrix mock for the first study design
        const firstDesign = Object.values(useUSDMStore.getState().studyDesigns)[0];
        if (firstDesign) {
          loadDesignMatrixMockData(firstDesign.id);
        }

        setSyncStatus('offline');
        setIsHydrated(true);
        return;
      }

      // Inject API studies into the USDM store
      const storeState = useUSDMStore.getState();
      studiesResp.studies.forEach((study: any) => {
        if (!storeState.studies[study.id]) {
          storeState.createStudy({
            id: study.id,
            studyShortTitle: study.shortTitle ?? study.title?.slice(0, 30) ?? 'Unnamed',
            studyTitle: study.title ?? '',
            studyRationale: '',
            studyPhase: { code: study.phase ?? 'Phase3', codeSystem: 'http://www.cdisc.org', decode: study.phase ?? 'Phase 3' },
            businessTherapeuticAreas: [],
            studyIdentifiers: study.protocolNumber
              ? [{ id: `ident-${study.id}`, instanceType: 'StudyIdentifier', studyIdentifier: study.protocolNumber, studyIdentifierScope: { id: `org-${study.id}`, instanceType: 'Organization', organizationName: 'Sponsor', organizationType: { code: 'C70793', codeSystem: 'C66733', decode: 'Sponsor' } } }]
              : [],
            studyProtocolVersions: [],
          });
        }
      });

      // Ensure every API-loaded study has at least one study design so tabs render
      const freshState = useUSDMStore.getState();
      Object.values(freshState.studies).forEach((study: any) => {
        if (!study.studyDesigns?.length) {
          freshState.createStudyDesign(study.id, {
            studyDesignName: `${study.studyShortTitle || 'Study'} Design v1`,
            studyDesignDescription: 'Protocol design — add objectives and endpoints to get started.',
          });
        }
      });

      // 2. Seed design matrix for current study designs
      const designs = Object.values(useUSDMStore.getState().studyDesigns);
      if (designs.length > 0) {
        const designMatrixStore = useUSDMDesignMatrixStore.getState();
        const firstDesign = designs[0];
        if (!designMatrixStore.armsByDesignId[firstDesign.id]?.length) {
          loadDesignMatrixMockData(firstDesign.id);
        }
      }

      // 3. Load TPP for each study
      const studyIds = studiesResp.studies.map((s: any) => s.id);
      for (const studyId of studyIds.slice(0, 3)) {
        const { data: tppResp } = await apiFetch<{ records: any[] }>(`/api/usdm/tpp?studyId=${studyId}`);
        if (tppResp?.records?.length) {
          const record = tppResp.records[0];
          // Hydrate TPP store
          const tppStore = useUSDMTPPStore.getState();
          if (record.tpp && !tppStore.tppsByStudyId[studyId]?.length) {
            tppStore.addTPP(studyId, record.tpp);
            // Add claims
            (record.claims ?? []).forEach((claim: any) => {
              tppStore.addClaim(studyId, record.tpp.id, claim);
            });
          }
        } else {
          // Seed default TPP from API (triggers memory seed)
          await apiFetch(`/api/usdm/tpp?studyId=${studyId}`);
          const { data: seeded } = await apiFetch<{ records: any[] }>(`/api/usdm/tpp?studyId=${studyId}`);
          if (seeded?.records?.length) {
            const record = seeded.records[0];
            const tppStore = useUSDMTPPStore.getState();
            if (!tppStore.tppsByStudyId[studyId]?.length) {
              tppStore.addTPP(studyId, record.tpp);
              (record.claims ?? []).forEach((claim: any) => {
                tppStore.addClaim(studyId, record.tpp.id, claim);
              });
            }
          }
        }
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setIsHydrated(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hydration failed';
      setSyncError(msg);
      setSyncStatus('error');
      loadMockData();
      const firstDesign = Object.values(useUSDMStore.getState().studyDesigns)[0];
      if (firstDesign) loadDesignMatrixMockData(firstDesign.id);
      setIsHydrated(true);
    }
  }, [loadMockData]);

  useEffect(() => { hydrate(); }, [hydrate]);

  // ==========================================================================
  // Study persistence
  // ==========================================================================

  const persistStudy = useCallback(async (study: Record<string, unknown>) => {
    const { error } = await apiFetch('/api/usdm/studies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(study),
    });
    if (error) console.warn('[USDM persist study]', error);
    else setLastSyncedAt(new Date());
  }, []);

  const deleteStudy = useCallback(async (id: string) => {
    const { error } = await apiFetch(`/api/usdm/studies/${id}`, { method: 'DELETE' });
    if (error) console.warn('[USDM delete study]', error);
  }, []);

  // ==========================================================================
  // TPP persistence
  // ==========================================================================

  const persistTPP = useCallback(async (
    studyId: string,
    tpp: Record<string, unknown>,
    claims: Record<string, unknown>[]
  ) => {
    const { error } = await apiFetch('/api/usdm/tpp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studyId, tpp, claims }),
    });
    if (error) console.warn('[USDM persist TPP]', error);
    else setLastSyncedAt(new Date());
  }, []);

  // ==========================================================================
  // Manual refresh
  // ==========================================================================

  const refresh = useCallback(async () => {
    hydrated.current = false;
    await hydrate();
  }, [hydrate]);

  return {
    syncStatus,
    isHydrated,
    lastSyncedAt,
    syncError,
    isOnline,
    refresh,
    persistStudy,
    deleteStudy,
    persistTPP,
  };
}
