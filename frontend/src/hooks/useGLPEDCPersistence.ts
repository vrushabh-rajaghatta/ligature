
/**
 * useGLPEDCPersistence
 *
 * Manages fetching and mutating GLP ↔ EDC connection links.
 * Architecture mirrors other Ligature persistence hooks:
 *   - Hydrates from GET /api/glp/edc-link on mount
 *   - Exposes persistLink / deleteLink / triggerSync helpers
 *   - All mutations are fire-and-forget (optimistic UI assumed at call site)
 *   - Online/offline detection via window events
 *
 * @version 0.94.0
 */


import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// TYPES (inlined to avoid barrel imports)
// =============================================================================

export type EDCVendorGLP =
  | 'medidata-rave'
  | 'oracle-inform'
  | 'oracle-clinical-one'
  | 'labware-lims'
  | 'labvantage'
  | 'dotmatics'
  | 'veeva-edc'
  | 'custom-lims';

export type GLPEDCLinkStatus = 'active' | 'pending-validation' | 'suspended' | 'disconnected';

export interface GLPEDCEndpoint {
  id: string;
  name: string;
  formOID: string;
  totalExpected: number;
  totalReceived: number;
  completionPercent: number;
  hasIntegrityFlags: boolean;
  lastSyncAt: string;
}

export interface GLPEDCLink {
  id: string;
  studyId: string;
  studyNumber: string;
  vendorStudyId: string;
  vendor: EDCVendorGLP;
  vendorDisplayName: string;
  environment: 'production' | 'validation' | 'development';
  status: GLPEDCLinkStatus;
  dataFlowDirection: 'inbound' | 'bidirectional';
  syncFrequencyHours: number;
  lastSyncAt: string;
  nextSyncAt: string;
  lastSyncError?: string;
  recordsLastSync: number;
  totalRecordsReceived: number;
  overallCompleteness: number;
  integrityFlagCount: number;
  endpoints: GLPEDCEndpoint[];
  computerSystemValidated: boolean;
  validationDocRef?: string;
  auditTrailEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface IntegrityFlag {
  id: string;
  endpoint: string;
  formOID: string;
  subjectId?: string;
  flagType: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  regulatoryRef: string;
  detectedAt: string;
  requiresCapa: boolean;
}

export interface GLPEDCSyncResult {
  linkId: string;
  studyId: string;
  syncedAt: string;
  durationMs: number;
  status: 'success' | 'partial' | 'failed';
  recordsRetrieved: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  endpointResults: {
    endpointId: string;
    name: string;
    formOID: string;
    recordsBefore: number;
    recordsAfter: number;
    newFlags: number;
    status: 'ok' | 'warnings' | 'errors';
  }[];
  newIntegrityFlags: IntegrityFlag[];
  resolvedFlagCount: number;
  overallCompletenessAfter: number;
  message: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useGLPEDCPersistence(studyId?: string) {
  const [links, setLinks] = useState<GLPEDCLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<GLPEDCSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Hydrate on mount
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = studyId
      ? `/api/glp/edc-link?studyId=${encodeURIComponent(studyId)}`
      : '/api/glp/edc-link';

    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then((data: { links: GLPEDCLink[] }) => {
        if (data.links) setLinks(data.links);
      })
      .catch(() => { /* offline or aborted — keep empty */ })
      .finally(() => {
        clearTimeout(timeout);
        setIsLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [studyId]);

  // ---- Persist a link (create or update) -----------------------------------
  const persistLink = useCallback(async (link: Partial<GLPEDCLink>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/glp/edc-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(link),
      });
      const data = await res.json();
      if (data.link) {
        setLinks(prev => {
          const idx = prev.findIndex(l => l.id === data.link.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.link;
            return next;
          }
          return [data.link, ...prev];
        });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, []);

  // ---- Delete a link -------------------------------------------------------
  const deleteLink = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    setLinks(prev => prev.filter(l => l.id !== id));
    try {
      await fetch(`/api/glp/edc-link?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, []);

  // ---- Trigger manual sync -------------------------------------------------
  const triggerSync = useCallback(async (linkId: string, studyIdOverride?: string): Promise<GLPEDCSyncResult | null> => {
    const targetStudyId = studyIdOverride || studyId || '';
    setIsSyncing(true);
    try {
      const res = await fetch('/api/glp/edc-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId, studyId: targetStudyId }),
      });
      const data = await res.json();
      if (data.syncResult) {
        setLastSyncResult(data.syncResult);
        // Optimistically update the link's lastSyncAt and completeness
        setLinks(prev => prev.map(l => l.id === linkId ? {
          ...l,
          lastSyncAt: data.syncResult.syncedAt,
          overallCompleteness: data.syncResult.overallCompletenessAfter,
          integrityFlagCount: l.integrityFlagCount + data.syncResult.newIntegrityFlags.length - data.syncResult.resolvedFlagCount,
          recordsLastSync: data.syncResult.recordsRetrieved,
        } : l));
        return data.syncResult;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [studyId]);

  return {
    links,
    isLoading,
    isOnline,
    lastSyncResult,
    isSyncing,
    persistLink,
    deleteLink,
    triggerSync,
    setLinks,
  };
}
