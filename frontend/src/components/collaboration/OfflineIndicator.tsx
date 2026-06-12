/**
 * OfflineIndicator
 * Shows connection status and pending sync queue
 * 
 * v0.41.8 - Offline Support
 */


import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Check,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { ConnectionStatus, QueuedOperation } from '@/services/collaboration/offline-queue-service';

// =============================================================================
// TYPES
// =============================================================================

export interface OfflineIndicatorProps {
  status: ConnectionStatus;
  queueSize: number;
  isSyncing: boolean;
  onSync?: () => void;
  onClearQueue?: () => void;
  queue?: QueuedOperation[];
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function OfflineIndicator({
  status,
  queueSize,
  isSyncing,
  onSync,
  onClearQueue,
  queue = [],
  showDetails = true,
  position = 'inline',
}: OfflineIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  // Position classes for floating indicator
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'inline': '',
  }[position];

  // Status config
  const statusConfig = {
    online: {
      icon: <Wifi className="w-4 h-4" />,
      label: 'Online',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    offline: {
      icon: <WifiOff className="w-4 h-4" />,
      label: 'Offline',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    reconnecting: {
      icon: <RefreshCw className="w-4 h-4 animate-spin" />,
      label: 'Reconnecting',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
  }[status];

  // Compact indicator
  if (!showDetails) {
    return (
      <div className={`${positionClasses}`}>
        <div className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          ${statusConfig?.bg ?? ''} ${statusConfig?.border ?? ''} border
        `}>
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          <span className={`text-sm ${statusConfig?.color ?? ''}`}>{statusConfig.label}</span>
          {queueSize > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
              {queueSize} pending
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${positionClasses}`}>
      <div className={`
        rounded-lg ${statusConfig?.bg ?? ''} ${statusConfig?.border ?? ''} border
        shadow-lg min-w-[200px]
      `}>
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className={statusConfig.color}>{statusConfig.icon}</span>
            <span className={`text-sm font-medium ${statusConfig?.color ?? ''}`}>
              {statusConfig.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {queueSize > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                {queueSize}
              </span>
            )}
            {isSyncing && (
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="px-3 pb-3 border-t border-white/5">
            {/* Status Message */}
            <div className="py-2 text-xs text-gray-400">
              {status === 'online' && queueSize === 0 && (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3 h-3" />
                  All changes synced
                </div>
              )}
              {status === 'online' && queueSize > 0 && (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Cloud className="w-3 h-3" />
                  {queueSize} changes pending sync
                </div>
              )}
              {status === 'offline' && (
                <div className="flex items-center gap-1.5 text-red-400">
                  <CloudOff className="w-3 h-3" />
                  Changes will sync when online
                </div>
              )}
              {status === 'reconnecting' && (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing changes...
                </div>
              )}
            </div>

            {/* Queue Preview */}
            {queueSize > 0 && queue.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-1">Pending Operations</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {queue.slice(0, 5).map((op) => (
                    <div 
                      key={op.id}
                      className="flex items-center justify-between px-2 py-1 bg-[#1a1f28] rounded text-xs"
                    >
                      <span className="text-gray-300 truncate">
                        {op.operation.type}: {op.operation.content?.slice(0, 20) || `${op.operation.length} chars`}
                      </span>
                      {op.retryCount > 0 && (
                        <span className="text-amber-400 text-[10px]">
                          retry {op.retryCount}
                        </span>
                      )}
                    </div>
                  ))}
                  {queue.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{queue.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              {onSync && queueSize > 0 && status === 'online' && !isSyncing && (
                <button
                  onClick={onSync}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5
                             bg-blue-600 hover:bg-blue-700 text-white text-xs rounded
                             transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Sync Now
                </button>
              )}
              {onClearQueue && queueSize > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Discard all pending changes? This cannot be undone.')) {
                      onClearQueue();
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5
                             bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded
                             transition-colors"
                  title="Discard pending changes"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TOAST VARIANT
// =============================================================================

export function OfflineToast({
  status,
  queueSize,
  isSyncing,
  onDismiss,
}: {
  status: ConnectionStatus;
  queueSize: number;
  isSyncing: boolean;
  onDismiss?: () => void;
}) {
  // Only show for offline or has queue
  if (status === 'online' && queueSize === 0) return null;

  const statusConfig = {
    online: {
      icon: <Cloud className="w-4 h-4" />,
      message: `${queueSize} changes pending`,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    offline: {
      icon: <WifiOff className="w-4 h-4" />,
      message: 'You\'re offline. Changes will sync when reconnected.',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    reconnecting: {
      icon: <RefreshCw className="w-4 h-4 animate-spin" />,
      message: 'Syncing changes...',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
  }[status];

  return (
    <div className={`
      fixed bottom-4 left-1/2 -translate-x-1/2 z-50
      flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
      ${statusConfig?.bg ?? ''}
    `}>
      <span className={statusConfig.color}>{statusConfig.icon}</span>
      <span className={`text-sm ${statusConfig?.color ?? ''}`}>{statusConfig.message}</span>
      {queueSize > 0 && status !== 'online' && (
        <span className="px-2 py-0.5 bg-white/10 text-white text-xs rounded">
          {queueSize} queued
        </span>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// =============================================================================
// MINI INDICATOR (for headers)
// =============================================================================

export function OfflineMiniIndicator({
  status,
  queueSize,
  onClick,
}: {
  status: ConnectionStatus;
  queueSize: number;
  onClick?: () => void;
}) {
  const iconConfig = {
    online: queueSize > 0 
      ? <Cloud className="w-4 h-4 text-amber-400" />
      : <Wifi className="w-4 h-4 text-emerald-400" />,
    offline: <WifiOff className="w-4 h-4 text-red-400" />,
    reconnecting: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
  }[status];

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
      title={`${status}${queueSize > 0 ? ` (${queueSize} pending)` : ''}`}
    >
      {iconConfig}
      {queueSize > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] 
                         font-bold rounded-full flex items-center justify-center">
          {queueSize > 9 ? '9+' : queueSize}
        </span>
      )}
    </button>
  );
}
