/**
 * HAQSyncStatus — Visual indicator for persistence sync state
 * 
 * Shows sync status in the HAQ screen header area:
 *   ● Synced — green dot, timestamp
 *   ● Syncing — spinning, "Saving..."
 *   ● Error — red dot, error message
 *   ● Offline — gray, "Demo mode"
 * 
 * @version 0.43.5
 */


import { Cloud, CloudOff, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '@/hooks/useHAQPersistence';

interface HAQSyncStatusProps {
  syncStatus: SyncStatus;
  isOnline: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  onRefresh?: () => void;
}

export function HAQSyncStatus({
  syncStatus,
  isOnline,
  lastSyncedAt,
  syncError,
  onRefresh,
}: HAQSyncStatusProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Local mode — working offline</span>
      </div>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Saving...</span>
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
            className="ml-1 p-0.5 hover:bg-zinc-800 rounded transition-colors"
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
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent-green/10 text-accent-green text-xs font-medium">
        <Check className="w-3 h-3" />
        <span>Auto-saved</span>
      </div>
    );
  }

  // idle
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      <Cloud className="w-3.5 h-3.5" />
      <span>Connecting...</span>
    </div>
  );
}
