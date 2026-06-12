
/**
 * useSubmissionsHubData — v0.125.3
 *
 * Fetches regulatory submissions from /api/submissions when Supabase is
 * configured; falls back to static mock data when offline / in demo mode.
 *
 * This wires the Submissions Hub to real DB data for the first time,
 * matching the pattern already used by HAQ (useHAQPersistence) and
 * Safety (useSafetyPersistence).
 */

import { useState, useEffect, useCallback } from 'react';
import { regulatorySubmissions } from '@/data/regulatory-submissions-data';
import type { RegulatorySubmission } from '@/data/regulatory-submissions-data';

export type SubmissionSyncStatus = 'idle' | 'loading' | 'live' | 'mock' | 'error';

export interface SubmissionsHubData {
  submissions: RegulatorySubmission[];
  syncStatus: SubmissionSyncStatus;
  isLive: boolean;            // true = real DB, false = mock data
  error: string | null;
  refresh: () => Promise<void>;
}

// Map API response shape → RegulatorySubmission shape used by the Hub UI
function mapApiSubmission(raw: Record<string, unknown>): RegulatorySubmission | null {
  try {
    const meta = (raw.metadata as Record<string, unknown>) ?? {};
    const daysUntilTarget = typeof meta.daysUntilTarget === 'number'
      ? meta.daysUntilTarget
      : Math.round(
          (new Date(raw.targetDate as string).getTime() - Date.now()) / 86_400_000
        );

    // Status mapping: Prisma status → UI SubmissionStatus
    const statusMap: Record<string, string> = {
      DRAFT:       'on-track',
      IN_PROGRESS: 'on-track',
      PLANNING:    'on-track',
      SUBMITTED:   'submitted',
      APPROVED:    'approved',
      REJECTED:    'delayed',
      ON_HOLD:     'blocked',
    };

    const progressPct = meta.modulesTotal
      ? Math.round(((meta.modulesComplete as number) / (meta.modulesTotal as number)) * 100)
      : 60;

    return {
      id: raw.id as string,
      productId: raw.productId as string,
      productName: (meta.productName as string) ?? (raw.productName as string) ?? 'Unknown',
      applicationId: raw.applicationId as string | null,
      applicationNumber: (raw.applicationNumber as string) ?? null,
      sequenceNumber: raw.sequenceNumber as string,
      type: ((meta.submissionType ?? raw.submissionType) as string) as RegulatorySubmission['submissionType'],
      region: raw.region as RegulatorySubmission['region'],
      agency: raw.agency as RegulatorySubmission['agency'],
      status: (statusMap[raw.status as string] ?? 'on-track') as RegulatorySubmission['status'],
      targetDate: raw.targetDate as string,
      daysUntilTarget,
      description: (raw.description as string) ?? '',
      modulesComplete: (meta.modulesComplete as number) ?? 3,
      modulesTotal: (meta.modulesTotal as number) ?? 5,
      moduleProgress: {
        m1: progressPct,
        m2: Math.max(0, progressPct - 15),
        m3: Math.max(0, progressPct - 5),
        m4: Math.max(0, progressPct - 25),
        m5: Math.max(0, progressPct - 35),
      },
      // Fields the Hub uses but API doesn't return yet — reasonable defaults
      qcStatus:    'Not Started',
      ectdStatus:  'Pending',
      milestones:  [],
      criticalPath: [],
      gaps:        [],
      riskFactors: [],
    } as unknown as RegulatorySubmission;
  } catch {
    return null;
  }
}

export function useSubmissionsHubData(): SubmissionsHubData {
  const [submissions, setSubmissions] = useState<RegulatorySubmission[]>(regulatorySubmissions);
  const [syncStatus, setSyncStatus] = useState<SubmissionSyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setSyncStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/submissions?limit=50', {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`API ${res.status}`);
      }

      const body = await res.json();
      const rawList: Record<string, unknown>[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : [];

      if (rawList.length === 0) {
        // API returned empty — DB not seeded yet, stay on mock
        setSyncStatus('mock');
        setIsLive(false);
        return;
      }

      const mapped = rawList
        .map(mapApiSubmission)
        .filter((s): s is RegulatorySubmission => s !== null);

      if (mapped.length > 0) {
        setSubmissions(mapped);
        setSyncStatus('live');
        setIsLive(true);
      } else {
        setSyncStatus('mock');
        setIsLive(false);
      }
    } catch (err) {
      // Network error or API unavailable — silently fall back to mock data
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSyncStatus('mock');
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return { submissions, syncStatus, isLive, error, refresh: fetchSubmissions };
}
