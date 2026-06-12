/**
 * OfflineCacheManager
 * UI for managing offline cached documents
 * 
 * v0.41.9 - Offline Content Caching
 */


import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useOfflineCache, CacheStats } from '@/services/offline-content-cache';

// =============================================================================
// TYPES
// =============================================================================

export interface OfflineCacheManagerProps {
  onDocumentSelect?: (documentId: string) => void;
  compact?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimeUntil(timestamp: number): string {
  const seconds = Math.floor((timestamp - Date.now()) / 1000);
  if (seconds < 0) return 'expired';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function OfflineCacheManager({
  onDocumentSelect,
  compact = false,
}: OfflineCacheManagerProps) {
  const {
    stats,
    isLoading,
    removeDocument,
    clearAll,
    clearExpired,
    getCachedMetadata,
  } = useOfflineCache();

  const [cachedDocs, setCachedDocs] = useState<ReturnType<typeof getCachedMetadata>>([]);
  const [expanded, setExpanded] = useState(!compact);
  const [sortBy, setSortBy] = useState<'cachedAt' | 'title' | 'size'>('cachedAt');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    setCachedDocs(getCachedMetadata());
  }, [getCachedMetadata, stats]);

  // Sort documents
  const sortedDocs = [...cachedDocs].sort((a, b) => {
    let compare = 0;
    switch (sortBy) {
      case 'title':
        compare = a.title.localeCompare(b.title);
        break;
      case 'size':
        compare = a.size - b.size;
        break;
      case 'cachedAt':
      default:
        compare = a.cachedAt - b.cachedAt;
    }
    return sortDesc ? -compare : compare;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  const handleClearExpired = () => {
    const count = clearExpired();
    setCachedDocs(getCachedMetadata());
    if (count > 0) {
      alert(`Cleared ${count} expired document(s)`);
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all cached documents? This cannot be undone.')) {
      clearAll();
      setCachedDocs([]);
    }
  };

  // Compact view
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-3 py-2 bg-[#252d3a] rounded-lg hover:bg-white/5 transition-colors"
      >
        <HardDrive className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">
          {cachedDocs.length} cached
        </span>
        {stats && (
          <span className="text-xs text-gray-500">
            ({formatBytes(stats.totalSize)})
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-[#1a1f28] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Offline Cache</h3>
              <p className="text-xs text-gray-500">
                {cachedDocs.length} document{cachedDocs.length !== 1 ? 's' : ''} cached
              </p>
            </div>
          </div>
          
          {compact && (
            <button
              onClick={() => setExpanded(false)}
              className="p-1 hover:bg-white/5 rounded text-gray-400"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{cachedDocs.length}</div>
              <div className="text-xs text-gray-500">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{formatBytes(stats.totalSize)}</div>
              <div className="text-xs text-gray-500">Used</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{formatBytes(stats.maxSize - stats.totalSize)}</div>
              <div className="text-xs text-gray-500">Available</div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {stats && (
          <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(stats.totalSize / stats.maxSize) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearExpired}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Clear Expired
          </button>
          <button
            onClick={handleClearAll}
            disabled={isLoading || cachedDocs.length === 0}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        </div>
        
        {/* Sort */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Sort:</span>
          <button
            onClick={() => handleSort('cachedAt')}
            className={`px-1.5 py-0.5 rounded ${sortBy === 'cachedAt' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
          >
            Date
          </button>
          <button
            onClick={() => handleSort('title')}
            className={`px-1.5 py-0.5 rounded ${sortBy === 'title' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
          >
            Name
          </button>
          <button
            onClick={() => handleSort('size')}
            className={`px-1.5 py-0.5 rounded ${sortBy === 'size' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
          >
            Size
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="max-h-64 overflow-y-auto">
        {sortedDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents cached</p>
            <p className="text-xs mt-1">Documents will appear here when cached for offline use</p>
          </div>
        ) : (
          sortedDocs.map(doc => (
            <CachedDocumentRow
              key={doc.id}
              document={doc}
              onClick={() => onDocumentSelect?.(doc.id)}
              onDelete={() => {
                removeDocument(doc.id);
                setCachedDocs(getCachedMetadata());
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CACHED DOCUMENT ROW
// =============================================================================

function CachedDocumentRow({
  document,
  onClick,
  onDelete,
}: {
  document: ReturnType<typeof useOfflineCache>['getCachedMetadata'] extends () => (infer T)[] ? T : never;
  onClick?: () => void;
  onDelete: () => void;
}) {
  const isExpiringSoon = document.expiresAt - Date.now() < 24 * 60 * 60 * 1000;
  const isExpired = document.expiresAt < Date.now();

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
      {/* Icon */}
      <div className="flex-shrink-0">
        <FileText className="w-5 h-5 text-gray-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="text-sm text-white truncate">{document.title}</div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <span>{formatBytes(document.size)}</span>
          <span>•</span>
          <span>v{document.version}</span>
          <span>•</span>
          <span>Cached {formatTimeAgo(document.cachedAt)}</span>
        </div>
      </div>

      {/* Expiry Status */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {isExpired ? (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="w-3 h-3" />
            Expired
          </span>
        ) : isExpiringSoon ? (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <Clock className="w-3 h-3" />
            {formatTimeUntil(document.expiresAt)}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            {formatTimeUntil(document.expiresAt)}
          </span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex-shrink-0 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
        title="Remove from cache"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// CACHE STATUS BADGE
// =============================================================================

export function CacheStatusBadge({
  documentId,
  version,
  onCache,
}: {
  documentId: string;
  version: number;
  onCache?: () => void;
}) {
  const { isDocumentCached, isCacheValid } = useOfflineCache();
  
  const isCached = isDocumentCached(documentId);
  const isValid = isCached && isCacheValid(documentId, version);

  if (!isCached) {
    return (
      <button
        onClick={onCache}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white 
                   bg-white/5 hover:bg-white/10 rounded transition-colors"
      >
        <Download className="w-3 h-3" />
        Cache for offline
      </button>
    );
  }

  if (!isValid) {
    return (
      <button
        onClick={onCache}
        className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400 
                   bg-amber-500/10 hover:bg-amber-500/20 rounded transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Update cache
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 bg-emerald-500/10 rounded">
      <CheckCircle className="w-3 h-3" />
      Cached
    </span>
  );
}
