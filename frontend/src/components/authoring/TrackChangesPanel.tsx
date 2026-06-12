

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Check,
  X,
  Clock,
  User,
  Bot,
  Sparkles,
  History,
  RotateCcw,
  Settings,
  CheckCheck,
  XSquare,
  Undo2,
  Redo2,
  MessageSquare,
  FileDown,
  Palette,
  ArrowRight,
  ArrowLeft,
  ChevronUp,
  Plus,
  Minus,
} from 'lucide-react';
import {
  TrackedChange,
  ChangeAuthor,
  RevisionType,
  RevisionStatus,
  DiffSegment,
  TrackChangesSummary,
  TrackChangesExportConfig,
  AI_AUTHOR,
  isAIChange,
  isPendingChange,
} from '@/types/track-changes';
import {
  computeDiff,
  diffToSegments,
  mergeAdjacentSegments,
} from '@/services/track-changes/comparison-engine';

// ============================================================================
// TYPES
// ============================================================================

interface TrackChangesPanelProps {
  /** Original content before AI generation */
  originalContent: string;
  /** AI-generated content */
  generatedContent: string;
  /** Section number/title for display */
  sectionInfo?: {
    number: string;
    title: string;
  };
  /** Document metadata */
  documentInfo?: {
    id: string;
    title: string;
  };
  /** Generation metadata */
  generationInfo?: {
    generatedAt: Date;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
  };
  /** Current user for change attribution */
  currentUser?: ChangeAuthor;
  /** Called when changes are accepted/rejected */
  onChangesProcessed?: (accepted: string[], rejected: string[]) => void;
  /** Called when final content is ready */
  onContentFinalized?: (content: string) => void;
  /** Called when export is requested */
  onExport?: (format: 'docx' | 'html' | 'json') => void;
  /** View mode */
  viewMode?: 'inline' | 'side-by-side' | 'unified';
  /** Whether to show all controls */
  showControls?: boolean;
  /** Compact mode for embedding */
  compact?: boolean;
}

interface ChangeItem {
  id: string;
  type: 'insert' | 'delete' | 'equal';
  content: string;
  status: RevisionStatus;
  author: ChangeAuthor;
  timestamp: Date;
  startIndex: number;
  endIndex: number;
}

type ViewMode = 'inline' | 'side-by-side' | 'unified';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<RevisionStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  accepted: { label: 'Accepted', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  deferred: { label: 'Deferred', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
};

const DEFAULT_USER: ChangeAuthor = {
  id: 'current-user',
  name: 'Current User',
  type: 'human',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `change-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: RevisionStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function AuthorBadge({ author }: { author: ChangeAuthor }) {
  const isAI = author.type === 'ai';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      isAI ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
    }`}>
      {isAI ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {author.name}
    </span>
  );
}

interface DiffViewProps {
  segments: DiffSegment[];
  changes: ChangeItem[];
  viewMode: ViewMode;
  showUnchanged: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  highlightedChangeId?: string | null;
  onChangeHover?: (id: string | null) => void;
}

function InlineDiffView({
  segments,
  changes,
  showUnchanged,
  onAccept,
  onReject,
  highlightedChangeId,
  onChangeHover,
}: Omit<DiffViewProps, 'viewMode'>) {
  const changeMap = useMemo(() => {
    const map = new Map<number, ChangeItem>();
    let charIndex = 0;
    changes.forEach(change => {
      map.set(change.startIndex, change);
    });
    return map;
  }, [changes]);

  let charIndex = 0;

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, idx) => {
        const change = changes.find(c => 
          c.startIndex === charIndex && 
          ((c.type === 'insert' && segment.type === 'insert') ||
           (c.type === 'delete' && segment.type === 'delete'))
        );
        
        const segmentCharIndex = charIndex;
        if (segment.type === 'equal') {
          charIndex += segment.text.length;
        } else if (segment.type === 'insert') {
          charIndex += segment.text.length;
        }
        // deletions don't advance the index in the new content

        if (segment.type === 'equal') {
          if (!showUnchanged && segment.text.length > 100) {
            return (
              <span key={idx} className="text-slate-400">
                {segment.text.slice(0, 40)}
                <span className="mx-2 px-2 py-0.5 bg-slate-100 rounded text-xs">
                  ...{segment.text.length - 80} characters unchanged...
                </span>
                {segment.text.slice(-40)}
              </span>
            );
          }
          return <span key={idx} className="text-slate-700">{segment.text}</span>;
        }

        if (segment.type === 'insert') {
          const isHighlighted = change && highlightedChangeId === change.id;
          const isPending = change?.status === 'pending';
          const isAccepted = change?.status === 'accepted';
          const isRejected = change?.status === 'rejected';

          return (
            <span
              key={idx}
              className={`relative group ${
                isRejected ? 'line-through opacity-50' :
                isAccepted ? 'bg-green-100 text-green-800' :
                'bg-green-100 text-green-800 underline decoration-green-400'
              } ${isHighlighted ? 'ring-2 ring-green-500' : ''}`}
              onMouseEnter={() => change && onChangeHover?.(change.id)}
              onMouseLeave={() => onChangeHover?.(null)}
            >
              {segment.text}
              {isPending && change && (
                <span className="absolute -top-8 left-0 hidden group-hover:flex items-center gap-1 bg-white border border-slate-200 shadow-lg rounded px-2 py-1 z-10">
                  <button
                    onClick={() => onAccept(change.id)}
                    className="p-1 hover:bg-green-50 rounded text-green-600"
                    title="Accept"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onReject(change.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </span>
          );
        }

        if (segment.type === 'delete') {
          const isHighlighted = change && highlightedChangeId === change.id;
          const isPending = change?.status === 'pending';
          const isAccepted = change?.status === 'accepted';
          const isRejected = change?.status === 'rejected';

          return (
            <span
              key={idx}
              className={`relative group ${
                isAccepted ? 'hidden' :
                isRejected ? 'bg-amber-50 text-amber-800' :
                'bg-red-100 text-red-800 line-through'
              } ${isHighlighted ? 'ring-2 ring-red-500' : ''}`}
              onMouseEnter={() => change && onChangeHover?.(change.id)}
              onMouseLeave={() => onChangeHover?.(null)}
            >
              {segment.text}
              {isPending && change && (
                <span className="absolute -top-8 left-0 hidden group-hover:flex items-center gap-1 bg-white border border-slate-200 shadow-lg rounded px-2 py-1 z-10">
                  <button
                    onClick={() => onAccept(change.id)}
                    className="p-1 hover:bg-green-50 rounded text-green-600"
                    title="Accept (remove text)"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onReject(change.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                    title="Reject (keep text)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </span>
          );
        }

        return null;
      })}
    </div>
  );
}

function SideBySideDiffView({
  segments,
  changes,
  showUnchanged,
  onAccept,
  onReject,
  highlightedChangeId,
  onChangeHover,
}: Omit<DiffViewProps, 'viewMode'>) {
  // Build left (original) and right (modified) views
  const leftSegments: Array<{ text: string; type: 'equal' | 'delete' }> = [];
  const rightSegments: Array<{ text: string; type: 'equal' | 'insert' }> = [];

  segments.forEach(segment => {
    if (segment.type === 'equal') {
      leftSegments.push({ text: segment.text, type: 'equal' });
      rightSegments.push({ text: segment.text, type: 'equal' });
    } else if (segment.type === 'delete') {
      leftSegments.push({ text: segment.text, type: 'delete' });
    } else if (segment.type === 'insert') {
      rightSegments.push({ text: segment.text, type: 'insert' });
    }
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="border border-slate-200 rounded-lg p-4 bg-red-50/30">
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          <Minus className="w-3 h-3" /> Original
        </h4>
        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {leftSegments.map((segment, idx) => (
            <span
              key={idx}
              className={segment.type === 'delete' ? 'bg-red-200 text-red-900 line-through' : 'text-slate-700'}
            >
              {segment.text}
            </span>
          ))}
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4 bg-green-50/30">
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          <Plus className="w-3 h-3" /> AI Generated
        </h4>
        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {rightSegments.map((segment, idx) => (
            <span
              key={idx}
              className={segment.type === 'insert' ? 'bg-green-200 text-green-900 underline' : 'text-slate-700'}
            >
              {segment.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChangeListProps {
  changes: ChangeItem[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  highlightedChangeId?: string | null;
  onChangeHover?: (id: string | null) => void;
}

function ChangeList({
  changes,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  highlightedChangeId,
  onChangeHover,
}: ChangeListProps) {
  const pendingChanges = changes.filter(c => c.status === 'pending');
  const insertions = changes.filter(c => c.type === 'insert');
  const deletions = changes.filter(c => c.type === 'delete');

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-medium">{changes.length}</span> changes total
          <span className="mx-1">•</span>
          <span className="text-green-600">{insertions.length} insertions</span>
          <span className="mx-1">•</span>
          <span className="text-red-600">{deletions.length} deletions</span>
        </div>
        {pendingChanges.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAcceptAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded"
            >
              <CheckCheck className="w-4 h-4" />
              Accept All
            </button>
            <button
              onClick={onRejectAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded"
            >
              <XSquare className="w-4 h-4" />
              Reject All
            </button>
          </div>
        )}
      </div>

      {/* Change List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {changes.filter(c => c.type !== 'equal').map(change => (
          <div
            key={change.id}
            className={`p-3 rounded-lg border ${
              highlightedChangeId === change.id ? 'ring-2 ring-blue-500' : ''
            } ${
              change.type === 'insert'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
            onMouseEnter={() => onChangeHover?.(change.id)}
            onMouseLeave={() => onChangeHover?.(null)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${
                    change.type === 'insert' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {change.type === 'insert' ? '+ Insertion' : '− Deletion'}
                  </span>
                  <StatusBadge status={change.status} />
                  <AuthorBadge author={change.author} />
                </div>
                <p className={`text-sm font-mono truncate ${
                  change.type === 'insert' ? 'text-green-800' : 'text-red-800 line-through'
                }`}>
                  {change.content.slice(0, 100)}
                  {change.content.length > 100 && '...'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatTimestamp(change.timestamp)}
                </p>
              </div>

              {change.status === 'pending' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onAccept(change.id)}
                    className="p-1.5 hover:bg-green-100 rounded text-green-600"
                    title="Accept"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onReject(change.id)}
                    className="p-1.5 hover:bg-red-100 rounded text-red-600"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {changes.filter(c => c.type !== 'equal').length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>No changes detected</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface HistoryPanelProps {
  history: Array<{
    action: 'accept' | 'reject';
    changeId: string;
    changeType: 'insert' | 'delete';
    timestamp: Date;
    user: ChangeAuthor;
  }>;
  onUndo: () => void;
  canUndo: boolean;
}

function HistoryPanel({ history, onUndo, canUndo }: HistoryPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1">
          <History className="w-4 h-4" />
          Review History
        </h4>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
            canUndo
              ? 'text-blue-600 hover:bg-blue-50'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No actions yet</p>
        ) : (
          history.slice().reverse().map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {item.action === 'accept' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-slate-600">
                {item.action === 'accept' ? 'Accepted' : 'Rejected'}{' '}
                {item.changeType === 'insert' ? 'insertion' : 'deletion'}
              </span>
              <span className="text-xs text-slate-400 ml-auto">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TrackChangesPanel({
  originalContent,
  generatedContent,
  sectionInfo,
  documentInfo,
  generationInfo,
  currentUser = DEFAULT_USER,
  onChangesProcessed,
  onContentFinalized,
  onExport,
  viewMode: initialViewMode = 'inline',
  showControls = true,
  compact = false,
}: TrackChangesPanelProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [showUnchanged, setShowUnchanged] = useState(true);
  const [showChangeList, setShowChangeList] = useState(true);
  const [highlightedChangeId, setHighlightedChangeId] = useState<string | null>(null);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [history, setHistory] = useState<Array<{
    action: 'accept' | 'reject';
    changeId: string;
    changeType: 'insert' | 'delete';
    timestamp: Date;
    user: ChangeAuthor;
    previousStatus: RevisionStatus;
  }>>([]);

  // Compute diff and initialize changes
  const segments = useMemo(() => {
    const diff = computeDiff(originalContent, generatedContent, { granularity: 'word' });
    return mergeAdjacentSegments(diffToSegments(diff));
  }, [originalContent, generatedContent]);

  // Initialize changes from segments
  useEffect(() => {
    let charIndex = 0;
    const newChanges: ChangeItem[] = [];
    const timestamp = generationInfo?.generatedAt || new Date();

    segments.forEach(segment => {
      if (segment.type !== 'equal') {
        newChanges.push({
          id: generateId(),
          type: segment.type as 'insert' | 'delete',
          content: segment.text,
          status: 'pending',
          author: AI_AUTHOR,
          timestamp,
          startIndex: charIndex,
          endIndex: charIndex + segment.text.length,
        });
      }
      if (segment.type === 'equal' || segment.type === 'insert') {
        charIndex += segment.text.length;
      }
    });

    setChanges(newChanges);
  }, [segments, generationInfo?.generatedAt]);

  // Summary stats
  const summary = useMemo(() => {
    const pending = changes.filter(c => c.status === 'pending').length;
    const accepted = changes.filter(c => c.status === 'accepted').length;
    const rejected = changes.filter(c => c.status === 'rejected').length;
    const insertions = changes.filter(c => c.type === 'insert').length;
    const deletions = changes.filter(c => c.type === 'delete').length;
    return { pending, accepted, rejected, insertions, deletions, total: changes.length };
  }, [changes]);

  // Handlers
  const handleAccept = useCallback((id: string) => {
    setChanges(prev => prev.map(c => {
      if (c.id === id) {
        setHistory(h => [...h, {
          action: 'accept' as const,
          changeId: id,
          changeType: c.type as 'insert' | 'delete',
          timestamp: new Date(),
          user: currentUser,
          previousStatus: c.status,
        }]);
        return { ...c, status: 'accepted' as RevisionStatus };
      }
      return c;
    }));
  }, [currentUser]);

  const handleReject = useCallback((id: string) => {
    setChanges(prev => prev.map(c => {
      if (c.id === id) {
        setHistory(h => [...h, {
          action: 'reject' as const,
          changeId: id,
          changeType: c.type as 'insert' | 'delete',
          timestamp: new Date(),
          user: currentUser,
          previousStatus: c.status,
        }]);
        return { ...c, status: 'rejected' as RevisionStatus };
      }
      return c;
    }));
  }, [currentUser]);

  const handleAcceptAll = useCallback(() => {
    const pendingIds = changes.filter(c => c.status === 'pending').map(c => c.id);
    setChanges(prev => prev.map(c => {
      if (c.status === 'pending') {
        setHistory(h => [...h, {
          action: 'accept' as const,
          changeId: c.id,
          changeType: c.type as 'insert' | 'delete',
          timestamp: new Date(),
          user: currentUser,
          previousStatus: c.status,
        }]);
        return { ...c, status: 'accepted' as RevisionStatus };
      }
      return c;
    }));
  }, [changes, currentUser]);

  const handleRejectAll = useCallback(() => {
    setChanges(prev => prev.map(c => {
      if (c.status === 'pending') {
        setHistory(h => [...h, {
          action: 'reject' as const,
          changeId: c.id,
          changeType: c.type as 'insert' | 'delete',
          timestamp: new Date(),
          user: currentUser,
          previousStatus: c.status,
        }]);
        return { ...c, status: 'rejected' as RevisionStatus };
      }
      return c;
    }));
  }, [currentUser]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    setChanges(prev => prev.map(c => {
      if (c.id === lastAction.changeId) {
        return { ...c, status: lastAction.previousStatus };
      }
      return c;
    }));
    setHistory(h => h.slice(0, -1));
  }, [history]);

  const handleFinalize = useCallback(() => {
    // Build final content based on accepted/rejected changes
    let result = '';
    let origIndex = 0;
    let genIndex = 0;

    segments.forEach(segment => {
      const change = changes.find(c => 
        c.content === segment.text && 
        ((c.type === 'insert' && segment.type === 'insert') ||
         (c.type === 'delete' && segment.type === 'delete'))
      );

      if (segment.type === 'equal') {
        result += segment.text;
      } else if (segment.type === 'insert') {
        // Include if accepted or still pending
        if (!change || change.status !== 'rejected') {
          result += segment.text;
        }
      } else if (segment.type === 'delete') {
        // Include original if rejection means keeping it
        if (change && change.status === 'rejected') {
          result += segment.text;
        }
      }
    });

    const acceptedIds = changes.filter(c => c.status === 'accepted').map(c => c.id);
    const rejectedIds = changes.filter(c => c.status === 'rejected').map(c => c.id);

    onChangesProcessed?.(acceptedIds, rejectedIds);
    onContentFinalized?.(result);
  }, [segments, changes, onChangesProcessed, onContentFinalized]);

  const allReviewed = summary.pending === 0 && summary.total > 0;

  return (
    <div className={`${compact ? 'p-4' : 'p-6'} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Track Changes
          </h2>
          {sectionInfo && (
            <p className="text-sm text-slate-500 mt-1">
              Section {sectionInfo.number}: {sectionInfo.title}
            </p>
          )}
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('inline')}
                className={`px-3 py-1.5 text-sm font-medium rounded ${
                  viewMode === 'inline' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inline
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1.5 text-sm font-medium rounded ${
                  viewMode === 'side-by-side' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Side-by-Side
              </button>
            </div>

            {/* Toggle Options */}
            <button
              onClick={() => setShowUnchanged(!showUnchanged)}
              className={`p-2 rounded ${showUnchanged ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
              title={showUnchanged ? 'Hide unchanged' : 'Show unchanged'}
            >
              {showUnchanged ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Export */}
            <button
              onClick={() => onExport?.('docx')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <FileDown className="w-4 h-4" />
              Export DOCX
            </button>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 bg-slate-50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Changes:</span>
          <span className="font-semibold text-slate-900">{summary.total}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-700">{summary.insertions} insertions</span>
          </span>
          <span className="flex items-center gap-1 text-sm">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-700">{summary.deletions} deletions</span>
          </span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <span className="flex items-center gap-1 text-sm">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-700">{summary.pending} pending</span>
          </span>
          <span className="flex items-center gap-1 text-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-700">{summary.accepted} accepted</span>
          </span>
          <span className="flex items-center gap-1 text-sm">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-red-700">{summary.rejected} rejected</span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diff View */}
        <div className={`lg:col-span-2 bg-white rounded-lg border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
          {viewMode === 'inline' && (
            <InlineDiffView
              segments={segments}
              changes={changes}
              showUnchanged={showUnchanged}
              onAccept={handleAccept}
              onReject={handleReject}
              highlightedChangeId={highlightedChangeId}
              onChangeHover={setHighlightedChangeId}
            />
          )}
          {viewMode === 'side-by-side' && (
            <SideBySideDiffView
              segments={segments}
              changes={changes}
              showUnchanged={showUnchanged}
              onAccept={handleAccept}
              onReject={handleReject}
              highlightedChangeId={highlightedChangeId}
              onChangeHover={setHighlightedChangeId}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Change List */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <button
              onClick={() => setShowChangeList(!showChangeList)}
              className="flex items-center justify-between w-full text-sm font-semibold text-slate-700 mb-3"
            >
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Changes ({changes.filter(c => c.type !== 'equal').length})
              </span>
              {showChangeList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showChangeList && (
              <ChangeList
                changes={changes}
                onAccept={handleAccept}
                onReject={handleReject}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
                highlightedChangeId={highlightedChangeId}
                onChangeHover={setHighlightedChangeId}
              />
            )}
          </div>

          {/* History */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <HistoryPanel
              history={history}
              onUndo={handleUndo}
              canUndo={history.length > 0}
            />
          </div>

          {/* Generation Info */}
          {generationInfo && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Bot className="w-4 h-4" />
                Generation Info
              </h4>
              <div className="space-y-1 text-slate-600">
                <p>Generated: {formatTimestamp(generationInfo.generatedAt)}</p>
                {generationInfo.model && <p>Model: {generationInfo.model}</p>}
                {generationInfo.promptTokens && (
                  <p>Tokens: {generationInfo.promptTokens} in / {generationInfo.completionTokens} out</p>
                )}
              </div>
            </div>
          )}

          {/* Finalize Button */}
          <button
            onClick={handleFinalize}
            disabled={!allReviewed}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium ${
              allReviewed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {allReviewed ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Finalize Changes
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                Review {summary.pending} Pending Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-200">
        <span>
          {documentInfo && `Document: ${documentInfo.title}`}
        </span>
        <span>
          Ligature Track Changes v0.24.8
        </span>
      </div>
    </div>
  );
}

export default TrackChangesPanel;

// ============================================================================
// EXPORTS
// ============================================================================

export type { TrackChangesPanelProps, ChangeItem, ViewMode };
