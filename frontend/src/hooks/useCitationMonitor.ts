
/**
 * useCitationMonitor — v0.44.59 / rebuilt v0.45.2
 *
 * React hook for the Citation Monitor system.
 * 
 * Provides:
 *   - citations: current registry state
 *   - changedCount: number of citations flagged as changed
 *   - isChecking: loading state
 *   - lastChecked: ISO timestamp of last check
 *   - checkAll(): trigger a full check
 *   - checkOne(id): check a single citation
 *   - refresh(): re-fetch current state without checking
 */


import { useState, useCallback, useEffect } from 'react';

interface CitationSummary {
  id: string;
  code: string;
  title: string;
  authority: string;
  category: string;
  status: string;
  lastChecked: string;
  lastChanged: string;
  effectiveDate: string;
  affectedModules: string[];
  changeNote: string;
}

interface CheckResult {
  checked: number;
  changed: Array<{ id: string; code: string; status: string }>;
  unchanged: Array<{ id: string; code: string; status: string }>;
  errors: Array<{ id: string; code: string; errorMessage?: string }>;
  checkedAt: string;
}

export function useCitationMonitor() {
  const [citations, setCitations] = useState<CitationSummary[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckResult, setLastCheckResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current registry state
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/citations/check');
      if (!res.ok) throw new Error(`Failed to fetch citations: ${res.status}`);
      const data = await res.json();
      setCitations(data.citations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load citations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check all citations for changes
  const checkAll = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);
      const res = await fetch('/api/citations/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: 'all' }),
      });
      if (!res.ok) throw new Error(`Check failed: ${res.status}`);
      const result: CheckResult = await res.json();
      setLastCheckResult(result);
      // Refresh registry state after check
      await refresh();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [refresh]);

  // Check a single citation
  const checkOne = useCallback(async (citationId: string) => {
    try {
      setIsChecking(true);
      setError(null);
      const res = await fetch('/api/citations/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [citationId] }),
      });
      if (!res.ok) throw new Error(`Check failed: ${res.status}`);
      const result: CheckResult = await res.json();
      setLastCheckResult(prev => prev ? {
        ...prev,
        changed: [...prev.changed.filter(c => c.id !== citationId), ...result.changed],
        unchanged: [...prev.unchanged.filter(c => c.id !== citationId), ...result.unchanged],
        checkedAt: result.checkedAt,
      } : result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // Derived
  const changedCount = lastCheckResult?.changed.length ?? 0;
  const lastChecked = lastCheckResult?.checkedAt ?? citations[0]?.lastChecked ?? null;

  return {
    citations,
    changedCount,
    isChecking,
    isLoading,
    lastChecked,
    lastCheckResult,
    error,
    checkAll,
    checkOne,
    refresh,
  };
}
