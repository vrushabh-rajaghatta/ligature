/**
 * ConflictResolutionUI
 * Visual diff/merge interface for sync conflicts
 * 
 * v0.42.3 - Conflict Resolution UI
 */


import React, { useState, useMemo } from 'react';
import {
  GitMerge,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Copy,
  Undo,
  Edit3,
  Eye,
  Zap,
} from 'lucide-react';
import { 
  SyncConflict, 
  FieldConflict, 
  ResolutionStrategy,
  useSyncConflicts 
} from '@/services/sync-conflict-resolution-service';

// =============================================================================
// TYPES
// =============================================================================

export interface ConflictResolutionUIProps {
  conflict: SyncConflict;
  onResolve: (resolution: { strategy: ResolutionStrategy; fieldSelections?: Record<string, 'local' | 'remote'> }) => void;
  onDismiss?: () => void;
  onCancel?: () => void;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  selected: 'local' | 'remote' | 'both' | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function getChangeType(local: unknown, remote: unknown): DiffLine['type'] {
  if (local === undefined && remote !== undefined) return 'added';
  if (local !== undefined && remote === undefined) return 'removed';
  if (JSON.stringify(local) !== JSON.stringify(remote)) return 'modified';
  return 'unchanged';
}

function computeDiff(localData: Record<string, unknown> | null | undefined, remoteData: Record<string, unknown> | null | undefined): DiffLine[] {
  const lines: DiffLine[] = [];
  const allKeys = new Set([
    ...Object.keys(localData || {}),
    ...Object.keys(remoteData || {}),
  ]);

  // Skip metadata fields
  const skipFields = ['id', 'createdAt', 'updatedAt', 'syncedAt', 'version'];

  for (const key of Array.from(allKeys)) {
    if (skipFields.includes(key)) continue;

    const localValue = localData?.[key];
    const remoteValue = remoteData?.[key];
    const type = getChangeType(localValue, remoteValue);

    lines.push({
      type,
      field: key,
      localValue,
      remoteValue,
      selected: type === 'unchanged' ? null : null,
    });
  }

  // Sort: modified first, then added, then removed, then unchanged
  const order = { modified: 0, added: 1, removed: 2, unchanged: 3 };
  lines.sort((a, b) => order[a.type] - order[b.type]);

  return lines;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ConflictResolutionUI({
  conflict,
  onResolve,
  onDismiss,
  onCancel,
}: ConflictResolutionUIProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>(() => 
    computeDiff(conflict.localData, conflict.remoteData)
  );
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const conflictCount = useMemo(() => 
    diffLines.filter(l => l.type !== 'unchanged').length,
    [diffLines]
  );

  const resolvedCount = useMemo(() => 
    diffLines.filter(l => l.type !== 'unchanged' && l.selected !== null).length,
    [diffLines]
  );

  const canResolve = resolvedCount === conflictCount;

  const handleSelectField = (field: string, source: 'local' | 'remote') => {
    setDiffLines(prev => prev.map(line => 
      line.field === field ? { ...line, selected: source } : line
    ));
  };

  const handleSelectAll = (source: 'local' | 'remote') => {
    setDiffLines(prev => prev.map(line => 
      line.type !== 'unchanged' ? { ...line, selected: source } : line
    ));
  };

  const handleReset = () => {
    setDiffLines(prev => prev.map(line => ({ ...line, selected: null })));
  };

  const handleResolve = () => {
    const fieldSelections: Record<string, 'local' | 'remote'> = {};
    for (const line of diffLines) {
      if (line.selected) {
        fieldSelections[line.field] = line.selected as 'local' | 'remote';
      }
    }
    onResolve({ strategy: 'manual', fieldSelections });
  };

  const handleQuickResolve = (strategy: ResolutionStrategy) => {
    onResolve({ strategy });
  };

  const getMergedPreview = (): Record<string, unknown> => {
    const merged: Record<string, unknown> = { ...conflict.remoteData };
    for (const line of diffLines) {
      if (line.selected === 'local') {
        merged[line.field] = line.localValue;
      } else if (line.selected === 'remote' || line.type === 'unchanged') {
        merged[line.field] = line.remoteValue ?? line.localValue;
      }
    }
    return merged;
  };

  const visibleLines = showUnchanged 
    ? diffLines 
    : diffLines.filter(l => l.type !== 'unchanged');

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#161b22]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Resolve Conflict</h2>
              <p className="text-sm text-gray-400">
                {conflict.entityType} • {conflict.entityId}
              </p>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Conflict Info */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-blue-400">
            <User className="w-4 h-4" />
            <span>Local: {formatTimestamp(conflict.localTimestamp)}</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <Clock className="w-4 h-4" />
            <span>Remote: {formatTimestamp(conflict.remoteTimestamp)}</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-white/5 bg-[#161b22]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Mode */}
          <div className="flex bg-[#21262d] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'side-by-side' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'unified' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Unified
            </button>
          </div>

          {/* Show unchanged toggle */}
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
              showUnchanged ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            Show unchanged
          </button>

          {/* Preview toggle */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
              previewMode ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" />
            Preview Result
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick resolve buttons */}
          <button
            onClick={() => handleSelectAll('local')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded-md"
          >
            <ArrowLeft className="w-3 h-3" />
            Use All Local
          </button>
          <button
            onClick={() => handleSelectAll('remote')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:bg-purple-500/10 rounded-md"
          >
            Use All Remote
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:bg-white/5 rounded-md"
          >
            <Undo className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        {previewMode ? (
          <MergedPreview data={getMergedPreview()} />
        ) : viewMode === 'side-by-side' ? (
          <SideBySideDiff
            lines={visibleLines}
            onSelect={handleSelectField}
          />
        ) : (
          <UnifiedDiff
            lines={visibleLines}
            onSelect={handleSelectField}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-[#161b22] flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="text-sm">
            <span className={resolvedCount === conflictCount ? 'text-emerald-400' : 'text-amber-400'}>
              {resolvedCount}/{conflictCount}
            </span>
            <span className="text-gray-500"> resolved</span>
          </div>

          {/* Quick strategies */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Quick:</span>
            <button
              onClick={() => handleQuickResolve('newest-wins')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors"
            >
              <Zap className="w-3 h-3" />
              Newest Wins
            </button>
            <button
              onClick={() => handleQuickResolve('merge')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors"
            >
              <GitMerge className="w-3 h-3" />
              Auto Merge
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          )}
          <button
            onClick={handleResolve}
            disabled={!canResolve}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Apply Resolution
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SIDE BY SIDE DIFF
// =============================================================================

function SideBySideDiff({
  lines,
  onSelect,
}: {
  lines: DiffLine[];
  onSelect: (field: string, source: 'local' | 'remote') => void;
}) {
  return (
    <div className="divide-y divide-white/5">
      {/* Headers */}
      <div className="grid grid-cols-[1fr,auto,1fr] bg-[#161b22] sticky top-0 z-10">
        <div className="px-4 py-2 text-sm font-medium text-blue-400 border-r border-white/5">
          Local (Your Changes)
        </div>
        <div className="w-24 px-2 py-2 text-sm font-medium text-center text-gray-500">
          Field
        </div>
        <div className="px-4 py-2 text-sm font-medium text-purple-400 border-l border-white/5">
          Remote (Server)
        </div>
      </div>

      {/* Lines */}
      {lines.map(line => (
        <DiffRow key={line.field} line={line} onSelect={onSelect} />
      ))}

      {lines.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No changes to display
        </div>
      )}
    </div>
  );
}

function DiffRow({
  line,
  onSelect,
}: {
  line: DiffLine;
  onSelect: (field: string, source: 'local' | 'remote') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isComplex = typeof line.localValue === 'object' || typeof line.remoteValue === 'object';

  const bgColor = {
    unchanged: '',
    added: 'bg-emerald-500/5',
    removed: 'bg-red-500/5',
    modified: 'bg-amber-500/5',
  }[line.type];

  const localBg = line.selected === 'local' ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : '';
  const remoteBg = line.selected === 'remote' ? 'bg-purple-500/20 ring-1 ring-purple-500/50' : '';

  return (
    <div className={`grid grid-cols-[1fr,auto,1fr] ${bgColor}`}>
      {/* Local Value */}
      <button
        onClick={() => line.type !== 'unchanged' && onSelect(line.field, 'local')}
        disabled={line.type === 'unchanged' || line.type === 'added'}
        className={`px-4 py-3 text-left border-r border-white/5 transition-colors ${localBg} ${
          line.type !== 'unchanged' && line.type !== 'added' ? 'hover:bg-blue-500/10 cursor-pointer' : ''
        }`}
      >
        {line.type !== 'added' && (
          <ValueDisplay 
            value={line.localValue} 
            expanded={expanded} 
            type={line.type === 'removed' ? 'removed' : undefined}
          />
        )}
      </button>

      {/* Field Name */}
      <div className="w-24 px-2 py-3 flex flex-col items-center justify-center border-x border-white/5 bg-[#161b22]/50">
        <span className="text-xs text-gray-400 truncate max-w-full" title={line.field}>
          {line.field}
        </span>
        {isComplex && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 p-0.5 hover:bg-white/10 rounded"
          >
            {expanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
          </button>
        )}
        {line.selected && (
          <div className={`mt-1 w-2 h-2 rounded-full ${
            line.selected === 'local' ? 'bg-blue-500' : 'bg-purple-500'
          }`} />
        )}
      </div>

      {/* Remote Value */}
      <button
        onClick={() => line.type !== 'unchanged' && onSelect(line.field, 'remote')}
        disabled={line.type === 'unchanged' || line.type === 'removed'}
        className={`px-4 py-3 text-left border-l border-white/5 transition-colors ${remoteBg} ${
          line.type !== 'unchanged' && line.type !== 'removed' ? 'hover:bg-purple-500/10 cursor-pointer' : ''
        }`}
      >
        {line.type !== 'removed' && (
          <ValueDisplay 
            value={line.remoteValue} 
            expanded={expanded}
            type={line.type === 'added' ? 'added' : undefined}
          />
        )}
      </button>
    </div>
  );
}

// =============================================================================
// UNIFIED DIFF
// =============================================================================

function UnifiedDiff({
  lines,
  onSelect,
}: {
  lines: DiffLine[];
  onSelect: (field: string, source: 'local' | 'remote') => void;
}) {
  return (
    <div className="p-4 space-y-2">
      {lines.map(line => (
        <UnifiedDiffLine key={line.field} line={line} onSelect={onSelect} />
      ))}
    </div>
  );
}

function UnifiedDiffLine({
  line,
  onSelect,
}: {
  line: DiffLine;
  onSelect: (field: string, source: 'local' | 'remote') => void;
}) {
  if (line.type === 'unchanged') {
    return (
      <div className="px-3 py-2 bg-white/5 rounded-lg">
        <span className="text-gray-500 text-sm">{line.field}:</span>
        <span className="text-gray-300 text-sm ml-2">{formatValue(line.localValue)}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-white/10">
      <div className="px-3 py-1.5 bg-white/5 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{line.field}</span>
        {line.selected && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            line.selected === 'local' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
          }`}>
            {line.selected === 'local' ? 'Using Local' : 'Using Remote'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/10">
        {line.type !== 'added' && (
          <button
            onClick={() => onSelect(line.field, 'local')}
            className={`p-3 text-left transition-colors ${
              line.selected === 'local' ? 'bg-blue-500/20' : 'hover:bg-blue-500/10'
            }`}
          >
            <div className="text-xs text-blue-400 mb-1">Local</div>
            <ValueDisplay value={line.localValue} type="removed" />
          </button>
        )}
        {line.type !== 'removed' && (
          <button
            onClick={() => onSelect(line.field, 'remote')}
            className={`p-3 text-left transition-colors ${
              line.selected === 'remote' ? 'bg-purple-500/20' : 'hover:bg-purple-500/10'
            } ${line.type === 'added' ? 'col-span-2' : ''}`}
          >
            <div className="text-xs text-purple-400 mb-1">Remote</div>
            <ValueDisplay value={line.remoteValue} type="added" />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// VALUE DISPLAY
// =============================================================================

function ValueDisplay({
  value,
  expanded,
  type,
}: {
  value: unknown;
  expanded?: boolean;
  type?: 'added' | 'removed';
}) {
  const formatted = formatValue(value);
  const isLong = formatted.length > 100 || formatted.includes('\n');
  const displayValue = isLong && !expanded ? formatted.slice(0, 100) + '...' : formatted;

  const colorClass = type === 'added' 
    ? 'text-emerald-400' 
    : type === 'removed' 
      ? 'text-red-400' 
      : 'text-gray-300';

  return (
    <pre className={`text-sm font-mono whitespace-pre-wrap break-all ${colorClass}`}>
      {displayValue}
    </pre>
  );
}

// =============================================================================
// MERGED PREVIEW
// =============================================================================

function MergedPreview({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="p-4">
      <div className="mb-2 text-sm text-gray-400">Merged Result Preview</div>
      <pre className="p-4 bg-[#161b22] rounded-lg text-sm text-gray-300 font-mono overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// =============================================================================
// CONFLICT LIST
// =============================================================================

export function ConflictList({
  conflicts,
  onSelect,
  selectedId,
}: {
  conflicts: SyncConflict[];
  onSelect: (conflict: SyncConflict) => void;
  selectedId?: string;
}) {
  if (conflicts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <GitMerge className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No conflicts to resolve</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {conflicts.map(conflict => (
        <button
          key={conflict.id}
          onClick={() => onSelect(conflict)}
          className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
            selectedId === conflict.id ? 'bg-white/5' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {conflict.entityType} / {conflict.entityId}
              </div>
              <div className="text-xs text-gray-500">
                {conflict.fieldConflicts?.length || 0} field conflict(s) • {conflict.conflictType}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </button>
      ))}
    </div>
  );
}
