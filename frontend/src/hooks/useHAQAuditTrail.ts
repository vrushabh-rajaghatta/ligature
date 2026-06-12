
/**
 * useHAQAuditTrail — v0.87.0
 *
 * Fetches the real audit trail from GET /api/haqs/[id]/audit,
 * merges with local Zustand store history events, deduplicates, and sorts.
 *
 * Falls back gracefully to local store when no Supabase is configured.
 */


import { useState, useEffect, useCallback, useRef } from 'react';
import { useHAQStore } from '@/store/useHAQStore';

// ============================================================================
// TYPES
// ============================================================================

export type AuditEventType =
  | 'created'
  | 'draft-saved'
  | 'version-created'
  | 'status-changed'
  | 'reviewer-assigned'
  | 'review-completed'
  | 'comment-added'
  | 'comment-resolved'
  | 'ai-generated'
  | 'submitted';

export interface HAQAuditEvent {
  id: string;
  haqId: string;
  eventType: AuditEventType;
  actorId: string;
  actorName: string;
  details: Record<string, unknown>;
  createdAt: string;
  source: 'api' | 'local';
}

interface UseHAQAuditTrailResult {
  events: HAQAuditEvent[];
  isLoading: boolean;
  hasApiData: boolean;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useHAQAuditTrail(haqId: string, limit = 50): UseHAQAuditTrailResult {
  const [apiEvents, setApiEvents] = useState<HAQAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasApiData, setHasApiData] = useState(false);
  const hasFetchedRef = useRef(false);

  // Local store history events (always available, even without Supabase)
  const localHistory = useHAQStore(s => {
    const history = s.history?.[haqId] || [];
    return history.map((e: any): HAQAuditEvent => ({
      id: e.id || `local-${e.timestamp}`,
      haqId,
      eventType: e.type as AuditEventType,
      actorId: e.actorId || 'local-user',
      actorName: e.actorName || 'Current User',
      details: e.details || {},
      createdAt: e.timestamp,
      source: 'local' as const,
    }));
  });

  const fetchAuditTrail = useCallback(async () => {
    try {
      const res = await fetch(`/api/haqs/${haqId}/audit?limit=${limit}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const events: HAQAuditEvent[] = (json.data || []).map((e: any) => ({
        ...e,
        source: 'api' as const,
      }));

      setApiEvents(events);
      setHasApiData(events.length > 0);
    } catch {
      setApiEvents([]);
      setHasApiData(false);
    } finally {
      setIsLoading(false);
    }
  }, [haqId, limit]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchAuditTrail();
  }, [fetchAuditTrail]);

  // Merge API events + local store events, dedup by id, sort newest-first
  const events: HAQAuditEvent[] = (() => {
    const seen = new Set<string>();
    const merged: HAQAuditEvent[] = [];

    // API events take priority
    for (const e of apiEvents) {
      seen.add(e.id);
      merged.push(e);
    }

    // Local events fill in the rest
    for (const e of localHistory) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        merged.push(e);
      }
    }

    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  })();

  return { events, isLoading, hasApiData, refresh: fetchAuditTrail };
}
