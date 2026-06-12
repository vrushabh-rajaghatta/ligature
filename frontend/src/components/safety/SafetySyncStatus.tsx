/**
 * SafetySyncStatus — Visual indicator for safety persistence sync state
 * v0.44.53: Syncing state auto-falls to "Local mode" after 6s to prevent
 * indefinite spinner when Supabase/DB is unavailable.
 */


import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '@/hooks/useSafetyPersistence';

interface SafetySyncStatusProps {
  syncStatus: SyncStatus;
  isOnline: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  onRefresh?: () => void;
}

export function SafetySyncStatus({
  syncStatus,
  isOnline,
  lastSyncedAt,
  syncError,
  onRefresh,
}: SafetySyncStatusProps) {
  // v0.44.53: If still syncing after 6s, show local mode instead
  const [syncingTooLong, setSyncingTooLong] = useState(false);
  useEffect(() => {
    if (syncStatus === 'syncing') {
      const t = setTimeout(() => setSyncingTooLong(true), 6000);
      return () => clearTimeout(t);
    } else {
      setSyncingTooLong(false);
    }
  }, [syncStatus]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!isOnline || syncingTooLong) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Local mode</span>
      </div>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{syncError || 'Sync error'}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-1 p-0.5 rounded hover:bg-zinc-700 transition-colors"
            title="Retry sync"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (syncStatus === 'synced') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Cloud className="w-3.5 h-3.5" />
        <Check className="w-3 h-3 -ml-1" />
        <span>Synced{lastSyncedAt ? ` ${formatTime(lastSyncedAt)}` : ''}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      <Cloud className="w-3.5 h-3.5" />
      <span>Ready</span>
    </div>
  );
}
