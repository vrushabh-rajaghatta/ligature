
// =============================================================================
// SEQUENCE BUILDER PANEL - v0.9.13
// =============================================================================
// Manage sequences within an application and assign documents to CTD modules.
// =============================================================================

import React, { useState } from 'react';
import {
  Plus,
  FileText,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  GitCompare,
} from 'lucide-react';
import {
  useECTDPublishingStore,
  useSequenceList,
  useDocumentList,
} from '@/store/useECTDPublishingStore';
import { CTD_MODULE_CONFIG, type ECTDSequence, type ECTDLeafDocument, type LifecycleOperation } from '@/store/ectd-publishing-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface SequenceBuilderPanelProps {
  applicationId: string;
  onValidate?: (sequenceId: string) => void;
  onPublish?: (sequenceId: string) => void;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const OPERATION_LABELS: Record<LifecycleOperation, { label: string; color: string }> = {
  'new': { label: 'new', color: 'text-green-600 bg-green-50' },
  'append': { label: 'append', color: 'text-blue-600 bg-blue-50' },
  'replace': { label: 'replace', color: 'text-amber-600 bg-amber-50' },
  'delete': { label: 'delete', color: 'text-red-600 bg-red-50' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'planning': <Clock className="w-4 h-4 text-gray-400" />,
  'draft': <FileText className="w-4 h-4 text-blue-500" />,
  'in-review': <Clock className="w-4 h-4 text-purple-500" />,
  'validated': <CheckCircle className="w-4 h-4 text-cyan-500" />,
  'ready': <CheckCircle className="w-4 h-4 text-indigo-500" />,
  'submitted': <Clock className="w-4 h-4 text-amber-500" />,
  'acknowledged': <CheckCircle className="w-4 h-4 text-green-500" />,
};

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

function SequenceListItem({
  sequence,
  isSelected,
  onSelect,
}: {
  sequence: ECTDSequence;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        isSelected ? 'bg-accent-blue/10 border border-accent-blue/30' : 'hover:bg-surface-secondary'
      }`}
    >
      {STATUS_ICONS[sequence.status] || <Clock className="w-4 h-4 text-gray-400" />}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-content-primary truncate">
          {sequence.sequenceNumber}
        </div>
        <div className="text-xs text-content-secondary truncate">
          {sequence.sequenceDescription}
        </div>
      </div>
    </button>
  );
}

function ModuleSection({
  moduleId,
  title,
  documents,
  isExpanded,
  onToggle,
}: {
  moduleId: string;
  title: string;
  documents: ECTDLeafDocument[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-subtle rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-tertiary transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-content-tertiary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-content-tertiary" />
        )}
        <FolderOpen className="w-4 h-4 text-content-secondary" />
        <span className="flex-1 text-left font-medium text-content-primary">
          {title}
        </span>
        <span className="text-xs text-content-tertiary">
          {documents.length} doc{documents.length !== 1 ? 's' : ''}
        </span>
      </button>
      
      {isExpanded && documents.length > 0 && (
        <div className="p-2 space-y-1">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-secondary"
            >
              <FileText className="w-4 h-4 text-content-tertiary" />
              <span className="flex-1 text-sm text-content-primary truncate">
                {doc.title}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${OPERATION_LABELS[doc.operation].color}`}>
                [{OPERATION_LABELS[doc.operation].label}]
              </span>
            </div>
          ))}
        </div>
      )}
      
      {isExpanded && documents.length === 0 && (
        <div className="p-4 text-center text-sm text-content-tertiary">
          No documents in this module
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function SequenceBuilderPanel({
  applicationId,
  onValidate,
  onPublish,
}: SequenceBuilderPanelProps) {
  const sequences = useSequenceList(applicationId);
  const { selectSequence, createSequence, runValidation, createPublishingJob, startPublishingJob } = useECTDPublishingStore();
  const selectedSequenceId = useECTDPublishingStore(s => s.selectedSequenceId);
  const selectedSequence = sequences.find(s => s.id === selectedSequenceId);
  const documents = useDocumentList(selectedSequenceId);
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['m1', 'm2']));
  
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };
  
  const handleValidate = async () => {
    if (!selectedSequenceId) return;
    await runValidation(selectedSequenceId);
    onValidate?.(selectedSequenceId);
  };
  
  const handlePublish = async () => {
    if (!selectedSequenceId) return;
    const job = createPublishingJob(selectedSequenceId, {
      targetGateway: 'FDA-ESG',
      outputFormat: 'ectd',
    });
    await startPublishingJob(job.id);
    onPublish?.(selectedSequenceId);
  };
  
  // Group documents by module
  const docsByModule = documents.reduce((acc, doc) => {
    // Extract module from section ID (simplified - real impl would use section hierarchy)
    const moduleId = doc.sectionId?.split('_')[1] || 'm1';
    if (!acc[moduleId]) acc[moduleId] = [];
    acc[moduleId].push(doc);
    return acc;
  }, {} as Record<string, ECTDLeafDocument[]>);
  
  return (
    <div className="h-full flex">
      {/* Sequence List */}
      <div className="w-64 border-r border-subtle flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="font-semibold text-content-primary">Sequences</h2>
          <button
            onClick={() => createSequence(applicationId, { sequenceType: 'amendment' })}
            className="p-1.5 hover:bg-surface-secondary rounded transition-colors"
          >
            <Plus className="w-4 h-4 text-content-secondary" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {sequences.map(seq => (
            <SequenceListItem
              key={seq.id}
              sequence={seq}
              isSelected={seq.id === selectedSequenceId}
              onSelect={() => selectSequence(seq.id)}
            />
          ))}
          
          {sequences.length === 0 && (
            <div className="p-4 text-center text-sm text-content-tertiary">
              No sequences yet
            </div>
          )}
        </div>
        
        {sequences.length >= 2 && (
          <div className="p-2 border-t border-subtle">
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-content-secondary hover:bg-surface-secondary rounded-lg transition-colors">
              <GitCompare className="w-4 h-4" />
              Compare Sequences
            </button>
          </div>
        )}
      </div>
      
      {/* Sequence Detail */}
      <div className="flex-1 flex flex-col">
        {selectedSequence ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-subtle">
              <div>
                <h2 className="font-semibold text-content-primary">
                  Sequence {selectedSequence.sequenceNumber}
                </h2>
                <p className="text-sm text-content-secondary">
                  {selectedSequence.sequenceDescription}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidate}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-content-secondary hover:bg-surface-secondary rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Validate
                </button>
                <button
                  onClick={handlePublish}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Publish
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {(['m1', 'm2', 'm3', 'm4', 'm5'] as const).map(moduleId => (
                <ModuleSection
                  key={moduleId}
                  moduleId={moduleId}
                  title={CTD_MODULE_CONFIG[moduleId].title}
                  documents={docsByModule[moduleId] || []}
                  isExpanded={expandedModules.has(moduleId)}
                  onToggle={() => toggleModule(moduleId)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-content-tertiary">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a sequence to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
