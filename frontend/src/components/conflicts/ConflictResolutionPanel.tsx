/**
 * ConflictResolutionPanel
 * Visual diff/merge interface for sync conflicts
 * 
 * v0.42.3 - Conflict Resolution UI
 */


import React, { useState, useMemo } from 'react';
import {
  GitMerge,
  GitBranch,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Clock,
  User,
  RefreshCw,
  Eye,
  Code,
  FileText,
  Wand2,
} from 'lucide-react';
import {
  SyncConflict,
  FieldConflict,
  ResolutionStrategy,
  useSyncConflicts,
} from '@/services/sync-conflict-resolution-service';

// =============================================================================
// TYPES
// =============================================================================

export interface ConflictResolutionPanelProps {
  conflicts: SyncConflict[];
  onResolved?: (conflictId: string, resolvedData: Record<string, unknown>) => void;
  onDismiss?: (conflictId: string) => void;
  onClose?: () => void;
}

type ViewMode = 'side-by-side' | 'unified' | 'fields';
type FieldSelection = Record<string, 'local' | 'remote' | 'merged'>;

// =============================================================================
// HELPERS
// =============================================================================

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getConflictTypeLabel(type: SyncConflict['conflictType']): string {
  switch (type) {
    case 'update-update': return 'Both Modified';
    case 'update-delete': return 'Modified vs Deleted';
    case 'delete-update': return 'Deleted vs Modified';
    case 'create-create': return 'Duplicate Created';
    case 'version-mismatch': return 'Version Mismatch';
    default: return 'Conflict';
  }
}

function getFieldType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function computeDiff(local: string, remote: string): { type: 'same' | 'added' | 'removed' | 'changed'; lines: string[] }[] {
  const localLines = local.split('\n');
  const remoteLines = remote.split('\n');
  const result: { type: 'same' | 'added' | 'removed' | 'changed'; lines: string[] }[] = [];
  
  // Simple line-by-line diff
  const maxLen = Math.max(localLines.length, remoteLines.length);
  for (let i = 0; i < maxLen; i++) {
    const l = localLines[i];
    const r = remoteLines[i];
    
    if (l === r) {
      result.push({ type: 'same', lines: [l || ''] });
    } else if (l === undefined) {
      result.push({ type: 'added', lines: [r] });
    } else if (r === undefined) {
      result.push({ type: 'removed', lines: [l] });
    } else {
      result.push({ type: 'changed', lines: [l, r] });
    }
  }
  
  return result;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ConflictResolutionPanel({
  conflicts,
  onResolved,
  onDismiss,
  onClose,
}: ConflictResolutionPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('fields');
  const [fieldSelections, setFieldSelections] = useState<FieldSelection>({});
  const [customMerges, setCustomMerges] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const { resolveConflict, resolveWithSelections, dismissConflict } = useSyncConflicts();

  const conflict = conflicts[currentIndex];
  
  // Initialize field selections for current conflict
  React.useEffect(() => {
    if (conflict?.fieldConflicts) {
      const initial: FieldSelection = {};
      conflict.fieldConflicts.forEach(fc => {
        initial[fc.field] = 'local'; // Default to local
      });
      setFieldSelections(initial);
      setCustomMerges({});
    }
  }, [conflict?.id]);

  // Compute merged result
  const mergedResult = useMemo(() => {
    if (!conflict) return null;
    
    const result = { ...conflict.remoteData };
    
    for (const [field, source] of Object.entries(fieldSelections)) {
      if (source === 'local') {
        result[field] = conflict.localData?.[field];
      } else if (source === 'merged' && customMerges[field]) {
        try {
          result[field] = JSON.parse(customMerges[field]);
        } catch {
          result[field] = customMerges[field];
        }
      }
    }
    
    return result;
  }, [conflict, fieldSelections, customMerges]);

  if (!conflict) {
    return (
      <div className="p-8 text-center text-gray-400">
        <GitMerge className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No conflicts to resolve</p>
      </div>
    );
  }

  const handleResolve = async (strategy?: ResolutionStrategy) => {
    if (strategy) {
      const resolution = await resolveConflict(conflict.id, strategy);
      onResolved?.(conflict.id, resolution?.resolvedData);
    } else {
      // Use field selections
      const resolution = await resolveWithSelections(conflict.id, 
        Object.fromEntries(
          Object.entries(fieldSelections).map(([k, v]) => [k, v === 'merged' ? 'local' : v])
        ) as Record<string, 'local' | 'remote'>
      );
      onResolved?.(conflict.id, resolution?.resolvedData);
    }
    
    if (currentIndex >= conflicts.length - 1) {
      onClose?.();
    }
  };

  const handleDismiss = async () => {
    await dismissConflict(conflict.id);
    onDismiss?.(conflict.id);
    
    if (currentIndex >= conflicts.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#161b22]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-amber-400" />
            <span className="font-medium text-white">Resolve Conflicts</span>
          </div>
          
          {/* Navigation */}
          {conflicts.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">
                {currentIndex + 1} of {conflicts.length}
              </span>
              <button
                onClick={() => setCurrentIndex(i => Math.min(conflicts.length - 1, i + 1))}
                disabled={currentIndex === conflicts.length - 1}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-[#21262d] rounded-lg p-0.5">
            {(['fields', 'side-by-side', 'unified'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-[#388bfd] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode === 'side-by-side' ? 'Split' : mode}
              </button>
            ))}
          </div>

          {onClose && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Conflict Info */}
      <div className="px-4 py-3 border-b border-white/5 bg-[#161b22]/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{conflict.entityType}</span>
              <span className="text-gray-500">/</span>
              <span className="text-gray-400">{conflict.entityId}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                conflict.conflictType === 'update-update' 
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {getConflictTypeLabel(conflict.conflictType)}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Detected {formatTimestamp(conflict.detectedAt)}
              </span>
              {conflict.fieldConflicts && (
                <span>{conflict.fieldConflicts.length} field(s) in conflict</span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleResolve('local-wins')}
              className="px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              Keep Local
            </button>
            <button
              onClick={() => handleResolve('remote-wins')}
              className="px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
            >
              Keep Remote
            </button>
            <button
              onClick={() => handleResolve('newest-wins')}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Wand2 className="w-3 h-3 inline mr-1" />
              Auto
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'fields' ? (
          <FieldsView
            conflict={conflict}
            fieldSelections={fieldSelections}
            customMerges={customMerges}
            onFieldSelect={(field, source) => setFieldSelections(prev => ({ ...prev, [field]: source }))}
            onCustomMerge={(field, value) => setCustomMerges(prev => ({ ...prev, [field]: value }))}
          />
        ) : viewMode === 'side-by-side' ? (
          <SideBySideView conflict={conflict} />
        ) : (
          <UnifiedView conflict={conflict} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-[#161b22]">
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Skip this conflict
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview Result
          </button>
          
          <button
            onClick={() => handleResolve()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Apply Resolution
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && mergedResult && (
        <PreviewModal
          data={mergedResult}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// =============================================================================
// FIELDS VIEW
// =============================================================================

function FieldsView({
  conflict,
  fieldSelections,
  customMerges,
  onFieldSelect,
  onCustomMerge,
}: {
  conflict: SyncConflict;
  fieldSelections: FieldSelection;
  customMerges: Record<string, string>;
  onFieldSelect: (field: string, source: 'local' | 'remote' | 'merged') => void;
  onCustomMerge: (field: string, value: string) => void;
}) {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  if (!conflict.fieldConflicts?.length) {
    return (
      <div className="p-8 text-center text-gray-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No field-level conflicts detected</p>
        <p className="text-sm mt-1">Use quick actions above to resolve</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {conflict.fieldConflicts.map(fc => {
        const isExpanded = expandedField === fc.field;
        const selection = fieldSelections[fc.field] || 'local';
        
        return (
          <div key={fc.field} className="border-b border-white/5">
            {/* Field Header */}
            <button
              onClick={() => setExpandedField(isExpanded ? null : fc.field)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Code className="w-4 h-4 text-gray-500" />
                <span className="font-mono text-sm text-white">{fc.field}</span>
                <span className="text-xs text-gray-500">
                  {getFieldType(fc.localValue)} → {getFieldType(fc.remoteValue)}
                </span>
              </div>
              
              {/* Selection Indicator */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded ${
                  selection === 'local' 
                    ? 'bg-blue-500/20 text-blue-400'
                    : selection === 'remote'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {selection}
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 bg-[#0d1117]">
                <div className="grid grid-cols-2 gap-4">
                  {/* Local Value */}
                  <div
                    onClick={() => onFieldSelect(fc.field, 'local')}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selection === 'local'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-400">LOCAL</span>
                      <span className="text-[10px] text-gray-500">
                        {formatTimestamp(conflict.localTimestamp)}
                      </span>
                    </div>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                      {formatValue(fc.localValue)}
                    </pre>
                  </div>

                  {/* Remote Value */}
                  <div
                    onClick={() => onFieldSelect(fc.field, 'remote')}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selection === 'remote'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-purple-400">REMOTE</span>
                      <span className="text-[10px] text-gray-500">
                        {formatTimestamp(conflict.remoteTimestamp)}
                      </span>
                    </div>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                      {formatValue(fc.remoteValue)}
                    </pre>
                  </div>
                </div>

                {/* Custom Merge */}
                <div className="mt-3">
                  <button
                    onClick={() => {
                      onFieldSelect(fc.field, 'merged');
                      if (!customMerges[fc.field]) {
                        onCustomMerge(fc.field, formatValue(fc.localValue));
                      }
                    }}
                    className={`w-full p-2 rounded-lg border-2 text-left transition-colors ${
                      selection === 'merged'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-dashed border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-medium text-emerald-400">
                      {selection === 'merged' ? 'CUSTOM MERGE' : 'Edit manually...'}
                    </span>
                  </button>
                  
                  {selection === 'merged' && (
                    <textarea
                      value={customMerges[fc.field] || ''}
                      onChange={(e) => onCustomMerge(fc.field, e.target.value)}
                      className="w-full mt-2 p-3 bg-[#161b22] border border-white/10 rounded-lg text-xs text-white font-mono resize-none focus:outline-none focus:border-emerald-500"
                      rows={4}
                      placeholder="Enter custom value..."
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// SIDE BY SIDE VIEW
// =============================================================================

function SideBySideView({ conflict }: { conflict: SyncConflict }) {
  const localStr = JSON.stringify(conflict.localData, null, 2);
  const remoteStr = JSON.stringify(conflict.remoteData, null, 2);

  return (
    <div className="grid grid-cols-2 h-full divide-x divide-white/10">
      {/* Local */}
      <div className="flex flex-col">
        <div className="px-4 py-2 bg-blue-500/10 border-b border-white/10">
          <span className="text-sm font-medium text-blue-400">Local Changes</span>
          <span className="text-xs text-gray-500 ml-2">
            {formatTimestamp(conflict.localTimestamp)}
          </span>
        </div>
        <pre className="flex-1 p-4 text-xs text-gray-300 overflow-auto font-mono whitespace-pre-wrap">
          {localStr}
        </pre>
      </div>

      {/* Remote */}
      <div className="flex flex-col">
        <div className="px-4 py-2 bg-purple-500/10 border-b border-white/10">
          <span className="text-sm font-medium text-purple-400">Remote Changes</span>
          <span className="text-xs text-gray-500 ml-2">
            {formatTimestamp(conflict.remoteTimestamp)}
          </span>
        </div>
        <pre className="flex-1 p-4 text-xs text-gray-300 overflow-auto font-mono whitespace-pre-wrap">
          {remoteStr}
        </pre>
      </div>
    </div>
  );
}

// =============================================================================
// UNIFIED VIEW
// =============================================================================

function UnifiedView({ conflict }: { conflict: SyncConflict }) {
  const localStr = JSON.stringify(conflict.localData, null, 2);
  const remoteStr = JSON.stringify(conflict.remoteData, null, 2);
  const diff = computeDiff(localStr, remoteStr);

  return (
    <div className="h-full overflow-auto">
      <pre className="p-4 text-xs font-mono">
        {diff.map((chunk, i) => (
          <div key={i} className={
            chunk.type === 'same' ? 'text-gray-400' :
            chunk.type === 'removed' ? 'bg-red-500/20 text-red-300' :
            chunk.type === 'added' ? 'bg-emerald-500/20 text-emerald-300' :
            ''
          }>
            {chunk.type === 'changed' ? (
              <>
                <div className="bg-red-500/20 text-red-300">- {chunk.lines[0]}</div>
                <div className="bg-emerald-500/20 text-emerald-300">+ {chunk.lines[1]}</div>
              </>
            ) : (
              <div>{chunk.type === 'removed' ? '- ' : chunk.type === 'added' ? '+ ' : '  '}{chunk.lines[0]}</div>
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}

// =============================================================================
// PREVIEW MODAL
// =============================================================================

function PreviewModal({ data, onClose }: { data: Record<string, unknown>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[80vh] bg-[#161b22] rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-medium text-white">Resolution Preview</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <pre className="p-4 text-xs text-gray-300 font-mono overflow-auto max-h-[60vh]">
          {JSON.stringify(data, null, 2)}
        </pre>
        <div className="px-4 py-3 border-t border-white/10 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
