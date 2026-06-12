

import { useState, useMemo } from 'react';
import {
  GitBranch,
  GitCompare,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle,
  Send,
  FileText,
  AlertCircle,
  Eye,
  Plus,
  ArrowRight,
  RefreshCw,
  Trash2,
  FilePlus,
  History,
  Layers,
  FileStack,
  Filter,
} from 'lucide-react';
import { ECTDApplication, ECTDSequence, ECTDDocument, CTD_MODULES } from '@/types/ectd';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { BadgeColor } from '@/components/ui/Badge';

// ============================================================================
// SEQUENCE TIMELINE - v164
// Multi-sequence viewer with industry-standard view modes
// Aligned with EXTEDO, LORENZ docuBridge, Veeva Submissions Archive patterns
// 
// View Mode Definitions (per ICH eCTD Specification):
// - Sequence: Documents in single selected sequence only
// - Cumulative: All documents from seq 0000 through selected sequence
// - Current (Lifecycle): Active dossier state after applying all lifecycle ops
// ============================================================================

type ViewMode = 'sequence' | 'cumulative' | 'current';

interface SequenceTimelineProps {
  application: ECTDApplication;
  selectedSequence: ECTDSequence | null;
  onSelectSequence: (seq: ECTDSequence) => void;
  onSelectDocument: (doc: ECTDDocument, sequenceNumber: string) => void;
  onCompareDocument?: (documentKey: string) => void; // v164: Compare callback
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Status colors
const statusColorMap: Record<ECTDSequence['status'], BadgeColor> = {
  'draft': 'slate',
  'validated': 'blue',
  'submitted': 'amber',
  'acknowledged': 'emerald',
  'under-review': 'purple',
  'approved': 'green',
};

const statusIconMap: Record<ECTDSequence['status'], React.ReactNode> = {
  'draft': <FileText className="w-3.5 h-3.5" />,
  'validated': <CheckCircle className="w-3.5 h-3.5" />,
  'submitted': <Send className="w-3.5 h-3.5" />,
  'acknowledged': <CheckCircle className="w-3.5 h-3.5" />,
  'under-review': <Clock className="w-3.5 h-3.5" />,
  'approved': <CheckCircle className="w-3.5 h-3.5" />,
};

// Operation colors
const operationColorMap: Record<ECTDDocument['operation'], BadgeColor> = {
  'new': 'green',
  'replace': 'amber',
  'append': 'blue',
  'delete': 'red',
};

const operationIconMap: Record<ECTDDocument['operation'], React.ReactNode> = {
  'new': <FilePlus className="w-3 h-3" />,
  'replace': <RefreshCw className="w-3 h-3" />,
  'append': <Plus className="w-3 h-3" />,
  'delete': <Trash2 className="w-3 h-3" />,
};

// Submission type labels
const submissionTypeLabels: Record<string, { label: string; color: BadgeColor }> = {
  'original': { label: 'Original', color: 'purple' },
  'Original NDA Submission': { label: 'Original NDA', color: 'purple' },
  'Original BLA Submission': { label: 'Original BLA', color: 'purple' },
  'ir-response': { label: 'IR Response', color: 'blue' },
  'Day 74 IR Response - CMC': { label: 'IR Response (CMC)', color: 'blue' },
  'Day 74 IR Response - Clinical': { label: 'IR Response (Clinical)', color: 'blue' },
  'Day 60 IR Response - CMC': { label: 'IR Response (CMC)', color: 'blue' },
  'safety-report': { label: 'Safety Update', color: 'red' },
  'IND Safety Report': { label: 'Safety Report', color: 'red' },
  'amendment': { label: 'Amendment', color: 'amber' },
  'supplement': { label: 'Supplement', color: 'cyan' },
  'annual-report': { label: 'Annual Report', color: 'slate' },
  'labeling': { label: 'Labeling', color: 'green' },
  'psur': { label: 'PSUR', color: 'violet' },
  'rmp': { label: 'RMP', color: 'orange' },
};

function getSubmissionTypeInfo(type: string) {
  return submissionTypeLabels[type] || { label: type, color: 'slate' as BadgeColor };
}

// ============================================================================
// VIEW MODE SELECTOR
// ============================================================================

function ViewModeSelector({ 
  viewMode, 
  onViewModeChange 
}: { 
  viewMode: ViewMode; 
  onViewModeChange: (mode: ViewMode) => void;
}) {
  // v164: Industry-standard view modes per EXTEDO, Lorenz docuBridge, Veeva
  const modes: { id: ViewMode; label: string; icon: React.ReactNode; description: string }[] = [
    { 
      id: 'sequence', 
      label: 'Sequence', 
      icon: <FileText className="w-4 h-4" />,
      description: 'View documents in selected sequence only'
    },
    { 
      id: 'cumulative', 
      label: 'Cumulative', 
      icon: <Layers className="w-4 h-4" />,
      description: 'View all documents from seq 0000 through selected sequence'
    },
    { 
      id: 'current', 
      label: 'Current', 
      icon: <History className="w-4 h-4" />,
      description: 'View active dossier state with document lifecycle history'
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-surface-card rounded-lg">
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => onViewModeChange(mode.id)}
          title={mode.description}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === mode.id
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface'
          }`}
        >
          {mode.icon}
          {mode.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// SEQUENCE CARD
// ============================================================================

interface SequenceCardProps {
  sequence: ECTDSequence;
  isSelected: boolean;
  isExpanded: boolean;
  sequenceIndex: number;
  totalSequences: number;
  onSelect: () => void;
  onToggleExpand: () => void;
  onSelectDocument: (doc: ECTDDocument) => void;
}

function SequenceCard({
  sequence,
  isSelected,
  isExpanded,
  sequenceIndex,
  totalSequences,
  onSelect,
  onToggleExpand,
  onSelectDocument,
}: SequenceCardProps) {
  const typeInfo = getSubmissionTypeInfo(sequence.submissionType);
  const isLatest = sequenceIndex === totalSequences - 1;

  // Group documents by module
  const documentsByModule = useMemo(() => {
    const grouped: Record<string, ECTDDocument[]> = {};
    sequence.documents.forEach(doc => {
      const module = doc.module;
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(doc);
    });
    return grouped;
  }, [sequence.documents]);

  // Count operations
  const operationCounts = useMemo(() => {
    const counts = { new: 0, replace: 0, append: 0, delete: 0 };
    sequence.documents.forEach(doc => counts[doc.operation]++);
    return counts;
  }, [sequence.documents]);

  return (
    <div className={`relative ${sequenceIndex < totalSequences - 1 ? 'pb-4' : ''}`}>
      {/* Timeline connector */}
      {sequenceIndex < totalSequences - 1 && (
        <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
      )}
      
      <div
        className={`relative bg-surface-elevated border rounded-lg transition-all ${
          isSelected 
            ? 'border-accent-blue ring-1 ring-accent-blue/30' 
            : 'border-border hover:border-border-hover'
        }`}
      >
        {/* Header */}
        <div
          onClick={onSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
          className="w-full flex items-start gap-3 p-3 text-left cursor-pointer"
        >
          {/* Timeline node */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted'
          }`}>
            {isLatest ? (
              <GitBranch className="w-4 h-4" />
            ) : (
              <span className="text-xs font-mono">{sequence.sequenceNumber}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-text-primary">
                Sequence {sequence.sequenceNumber}
              </span>
              <Badge color={typeInfo.color} size="xs">{typeInfo.label}</Badge>
              {isLatest && <Badge color="purple" size="xs">Latest</Badge>}
            </div>
            
            <div className="text-sm text-text-secondary mb-2">
              {sequence.description}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(sequence.submissionDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                {statusIconMap[sequence.status]}
                <Badge color={statusColorMap[sequence.status]} size="xs">
                  {sequence.status.replace(/-/g, ' ')}
                </Badge>
              </span>
              <span className="flex items-center gap-1">
                <FileStack className="w-3 h-3" />
                {sequence.documents.length} docs
              </span>
            </div>

            {/* Operation summary */}
            <div className="flex items-center gap-2 mt-2">
              {operationCounts.new > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <FilePlus className="w-3 h-3" />
                  {operationCounts.new} new
                </span>
              )}
              {operationCounts.replace > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <RefreshCw className="w-3 h-3" />
                  {operationCounts.replace} replaced
                </span>
              )}
              {operationCounts.append > 0 && (
                <span className="flex items-center gap-1 text-xs text-blue-400">
                  <Plus className="w-3 h-3" />
                  {operationCounts.append} appended
                </span>
              )}
              {operationCounts.delete > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <Trash2 className="w-3 h-3" />
                  {operationCounts.delete} deleted
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="p-1 rounded hover:bg-surface-card text-text-muted"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Expanded document list */}
        {isExpanded && (
          <div className="border-t border-border px-3 pb-3">
            {Object.entries(documentsByModule).map(([module, docs]) => (
              <div key={module} className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CTD_MODULES[module]?.color || '#64748b' }}
                  />
                  <span className="text-xs font-medium text-text-secondary">
                    Module {module}: {CTD_MODULES[module]?.name || 'Unknown'}
                  </span>
                </div>
                <div className="space-y-1 pl-4">
                  {docs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-surface-card transition-colors group"
                    >
                      <span className={`${
                        doc.operation === 'new' ? 'text-green-400' :
                        doc.operation === 'replace' ? 'text-amber-400' :
                        doc.operation === 'append' ? 'text-blue-400' :
                        'text-red-400'
                      }`}>
                        {operationIconMap[doc.operation]}
                      </span>
                      <span className="flex-1 text-sm text-text-primary truncate">
                        {doc.title}
                      </span>
                      <Badge color={operationColorMap[doc.operation]} size="xs">
                        {doc.operation}
                      </Badge>
                      <Eye className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LIFECYCLE VIEW
// ============================================================================

interface LifecycleViewProps {
  application: ECTDApplication;
  upToSequence: ECTDSequence;
  onSelectDocument: (doc: ECTDDocument, sequenceNumber: string) => void;
  onCompareDocument?: (documentKey: string) => void; // v164: Compare callback
}

interface DocumentLifecycle {
  currentDoc: ECTDDocument;
  currentSequence: string;
  history: Array<{
    doc: ECTDDocument;
    sequenceNumber: string;
    operation: ECTDDocument['operation'];
  }>;
  isDeleted: boolean;
}

function LifecycleView({ application, upToSequence, onSelectDocument, onCompareDocument }: LifecycleViewProps) {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [moduleFilter, setModuleFilter] = useState<string | 'all'>('all');

  // Build lifecycle state for all documents
  const documentLifecycles = useMemo(() => {
    const lifecycles = new Map<string, DocumentLifecycle>();
    const sequenceIndex = application.sequences.findIndex(
      s => s.sequenceNumber === upToSequence.sequenceNumber
    );

    for (let i = 0; i <= sequenceIndex; i++) {
      const seq = application.sequences[i];
      seq.documents.forEach(doc => {
        const key = `${doc.module}-${doc.section || doc.title}`;
        const existing = lifecycles.get(key);

        if (doc.operation === 'delete') {
          if (existing) {
            existing.isDeleted = true;
            existing.history.push({
              doc,
              sequenceNumber: seq.sequenceNumber,
              operation: 'delete',
            });
          }
        } else {
          if (existing) {
            existing.history.push({
              doc,
              sequenceNumber: seq.sequenceNumber,
              operation: doc.operation,
            });
            existing.currentDoc = doc;
            existing.currentSequence = seq.sequenceNumber;
            existing.isDeleted = false;
          } else {
            lifecycles.set(key, {
              currentDoc: doc,
              currentSequence: seq.sequenceNumber,
              history: [{
                doc,
                sequenceNumber: seq.sequenceNumber,
                operation: doc.operation,
              }],
              isDeleted: false,
            });
          }
        }
      });
    }

    return lifecycles;
  }, [application.sequences, upToSequence.sequenceNumber]);

  // Group by module
  const lifecyclesByModule = useMemo(() => {
    const grouped: Record<string, Array<[string, DocumentLifecycle]>> = {};
    
    documentLifecycles.forEach((lifecycle, key) => {
      const module = lifecycle.currentDoc.module;
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push([key, lifecycle]);
    });

    return grouped;
  }, [documentLifecycles]);

  const toggleDocExpansion = (key: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDocs(newExpanded);
  };

  const filteredModules = moduleFilter === 'all' 
    ? Object.entries(lifecyclesByModule)
    : Object.entries(lifecyclesByModule).filter(([m]) => m === moduleFilter);

  return (
    <div className="space-y-4">
      {/* Module filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-text-muted" />
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-2 py-1 bg-surface-card border border-border rounded text-sm text-text-primary"
        >
          <option value="all">All Modules</option>
          {Object.keys(lifecyclesByModule).sort().map(m => (
            <option key={m} value={m}>
              Module {m}: {CTD_MODULES[m]?.name || 'Unknown'}
            </option>
          ))}
        </select>
        <span className="text-xs text-text-muted">
          {documentLifecycles.size} documents in current dossier
        </span>
      </div>

      {/* Document list */}
      {filteredModules.map(([module, docs]) => (
        <div key={module} className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
          <div 
            className="flex items-center gap-2 px-3 py-2 border-b border-border"
            style={{ borderLeftWidth: 3, borderLeftColor: CTD_MODULES[module]?.color || '#64748b' }}
          >
            <span className="font-medium text-text-primary">
              Module {module}
            </span>
            <span className="text-sm text-text-muted">
              {CTD_MODULES[module]?.name}
            </span>
            <Badge color="slate" size="xs">{docs.length} docs</Badge>
          </div>

          <div className="divide-y divide-border/50">
            {docs.map(([key, lifecycle]) => (
              <div key={key} className={lifecycle.isDeleted ? 'opacity-50' : ''}>
                <button
                  onClick={() => toggleDocExpansion(key)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-card transition-colors"
                >
                  {lifecycle.history.length > 1 ? (
                    expandedDocs.has(key) ? (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    )
                  ) : (
                    <div className="w-4" />
                  )}
                  
                  <span className="flex-1 text-sm text-text-primary truncate">
                    {lifecycle.currentDoc.title}
                  </span>

                  {lifecycle.isDeleted && (
                    <Badge color="red" size="xs">Deleted</Badge>
                  )}
                  
                  {lifecycle.history.length > 1 && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <History className="w-3 h-3" />
                      {lifecycle.history.length} versions
                    </span>
                  )}

                  <Badge color="slate" size="xs">
                    Seq {lifecycle.currentSequence}
                  </Badge>

                  {/* v164: Compare button for multi-version documents */}
                  {lifecycle.history.length > 1 && onCompareDocument && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompareDocument(key);
                      }}
                      className="p-1 rounded hover:bg-surface text-text-muted hover:text-accent-purple"
                      title="Compare versions"
                    >
                      <GitCompare className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDocument(lifecycle.currentDoc, lifecycle.currentSequence);
                    }}
                    className="p-1 rounded hover:bg-surface text-text-muted hover:text-accent-blue"
                    title="View document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </button>

                {/* Version history */}
                {expandedDocs.has(key) && lifecycle.history.length > 1 && (
                  <div className="bg-surface px-3 py-2 space-y-1">
                    <div className="text-xs font-medium text-text-muted mb-2">
                      Document History
                    </div>
                    {[...lifecycle.history].reverse().map((entry, idx) => (
                      <button
                        key={`${entry.sequenceNumber}-${idx}`}
                        onClick={() => onSelectDocument(entry.doc, entry.sequenceNumber)}
                        className="w-full flex items-center gap-2 p-2 rounded text-left hover:bg-surface-card transition-colors group"
                      >
                        <span className={`${
                          entry.operation === 'new' ? 'text-green-400' :
                          entry.operation === 'replace' ? 'text-amber-400' :
                          entry.operation === 'append' ? 'text-blue-400' :
                          'text-red-400'
                        }`}>
                          {operationIconMap[entry.operation]}
                        </span>
                        <span className="text-xs text-text-muted">
                          Seq {entry.sequenceNumber}
                        </span>
                        <ArrowRight className="w-3 h-3 text-text-muted" />
                        <Badge color={operationColorMap[entry.operation]} size="xs">
                          {entry.operation}
                        </Badge>
                        {idx === 0 && (
                          <Badge color="purple" size="xs">Current</Badge>
                        )}
                        <Eye className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 ml-auto" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredModules.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          No documents found for the selected filter.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SequenceTimeline({
  application,
  selectedSequence,
  onSelectSequence,
  onSelectDocument,
  onCompareDocument,
  viewMode,
  onViewModeChange,
}: SequenceTimelineProps) {
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    new Set(selectedSequence ? [selectedSequence.sequenceNumber] : [])
  );

  const toggleSequenceExpansion = (seqNum: string) => {
    const newExpanded = new Set(expandedSequences);
    if (newExpanded.has(seqNum)) {
      newExpanded.delete(seqNum);
    } else {
      newExpanded.add(seqNum);
    }
    setExpandedSequences(newExpanded);
  };

  const handleSelectDocument = (doc: ECTDDocument, sequenceNumber?: string) => {
    onSelectDocument(doc, sequenceNumber || selectedSequence?.sequenceNumber || '0000');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-medium text-text-primary">Submission History</h3>
        <p className="text-xs text-text-muted">
          {application.sequences.length} sequence{application.sequences.length !== 1 ? 's' : ''} • {application.type} {application.number}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'current' && selectedSequence ? (
          <LifecycleView
            application={application}
            upToSequence={selectedSequence}
            onSelectDocument={handleSelectDocument}
            onCompareDocument={onCompareDocument}
          />
        ) : (
          <div className="space-y-0">
            {application.sequences.map((seq, idx) => (
              <SequenceCard
                key={seq.sequenceNumber}
                sequence={seq}
                isSelected={selectedSequence?.sequenceNumber === seq.sequenceNumber}
                isExpanded={expandedSequences.has(seq.sequenceNumber)}
                sequenceIndex={idx}
                totalSequences={application.sequences.length}
                onSelect={() => onSelectSequence(seq)}
                onToggleExpand={() => toggleSequenceExpansion(seq.sequenceNumber)}
                onSelectDocument={(doc) => handleSelectDocument(doc, seq.sequenceNumber)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-3 border-t border-border bg-surface-card/50">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Viewing: <span className="text-text-primary font-medium">
              {viewMode === 'sequence' ? 'Single Sequence' : 
               viewMode === 'cumulative' ? 'Cumulative (0000→Selected)' : 
               'Current Dossier State'}
            </span>
          </span>
          {selectedSequence && (
            <span>
              Selected: <span className="text-accent-blue">Seq {selectedSequence.sequenceNumber}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SequenceTimeline;
