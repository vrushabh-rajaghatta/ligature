
/**
 * Document Control Lineage Integration
 * =====================================
 * Integration components connecting Document Control (source of truth)
 * to the Document Lineage system. Shows where documents are referenced,
 * allows version registration, and displays cross-module impact.
 * 
 * @version 0.15.0
 * @since 2026-01-08
 */


import React, { useState, useMemo } from 'react';
import {
  GitBranch, Layers, Link2, AlertTriangle, CheckCircle, Clock,
  ExternalLink, Eye, RefreshCw, ChevronDown, ChevronUp, Shield,
  Lock, FileText, Users, Activity,
} from 'lucide-react';
import { useDocumentLineageStore } from '@/store/useDocumentLineageStore';
import type {
  DocumentReference,
  VersionComparisonResult,
  ReferenceContext,
  LineageModule,
} from '@/types/document-lineage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// =============================================================================
// MODULE STYLING
// =============================================================================

const moduleConfig: Record<LineageModule, { label: string; color: string; bgClass: string }> = {
  'document-control': { label: 'Document Control', color: 'blue', bgClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'tmf': { label: 'TMF', color: 'purple', bgClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'submissions': { label: 'Submissions', color: 'green', bgClass: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'psmf': { label: 'PSMF', color: 'amber', bgClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'ctms': { label: 'CTMS', color: 'cyan', bgClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  'safety': { label: 'Safety', color: 'red', bgClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'qms': { label: 'QMS', color: 'indigo', bgClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  'eln': { label: 'ELN', color: 'teal', bgClass: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  'authoring': { label: 'Authoring', color: 'pink', bgClass: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  'publishing': { label: 'Publishing', color: 'emerald', bgClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

// =============================================================================
// CROSS-MODULE PRESENCE PANEL
// =============================================================================

export interface CrossModulePresencePanelProps {
  /** Source document ID from Document Control */
  documentId: string;
  /** Document number for display */
  documentNumber: string;
  /** Current version in Document Control */
  currentVersion: string;
  /** Document title */
  documentTitle: string;
  /** Callback when navigating to a module */
  onNavigateToModule?: (module: LineageModule, recordId: string) => void;
}

export function CrossModulePresencePanel({
  documentId,
  documentNumber,
  currentVersion,
  documentTitle,
  onNavigateToModule,
}: CrossModulePresencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  const getCrossModulePresence = useDocumentLineageStore(state => state.getCrossModulePresence);
  
  // Find all references to this source document
  const docReferences = useMemo(() => 
    references.filter(ref => ref.sourceDocumentId === documentId),
    [references, documentId]
  );
  
  const presence = getCrossModulePresence(documentId);
  
  // Count stale references
  const staleCount = useMemo(() => {
    let count = 0;
    docReferences.forEach(ref => {
      const comparison = compareVersions(ref.id);
      if (comparison && !comparison.isCurrent && ref.referenceType === 'live') {
        count++;
      }
    });
    return count;
  }, [docReferences, compareVersions]);
  
  // Group references by module
  const referencesByModule = useMemo(() => {
    const grouped: Record<LineageModule, DocumentReference[]> = {} as any;
    docReferences.forEach(ref => {
      const module = ref.context.module;
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(ref);
    });
    return grouped;
  }, [docReferences]);
  
  const moduleCount = Object.keys(referencesByModule).length;
  
  if (docReferences.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link2 className="w-4 h-4" />
          <span>No cross-module references</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg bg-gray-800/50 border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-blue-400" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-200">
              Cross-Module Presence
            </div>
            <div className="text-xs text-gray-500">
              Referenced in {moduleCount} module{moduleCount !== 1 ? 's' : ''} ({docReferences.length} reference{docReferences.length !== 1 ? 's' : ''})
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {staleCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs
              bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" />
              {staleCount} stale
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50">
          {Object.entries(referencesByModule).map(([module, refs]) => (
            <ModuleReferenceGroup
              key={module}
              module={module as LineageModule}
              references={refs}
              currentVersion={currentVersion}
              onNavigate={onNavigateToModule}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MODULE REFERENCE GROUP
// =============================================================================

interface ModuleReferenceGroupProps {
  module: LineageModule;
  references: DocumentReference[];
  currentVersion: string;
  onNavigate?: (module: LineageModule, recordId: string) => void;
}

function ModuleReferenceGroup({ module, references, currentVersion, onNavigate }: ModuleReferenceGroupProps) {
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  const config = moduleConfig[module];
  
  return (
    <div className="pt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${config.bgClass}`}>
          {config.label}
        </span>
        <span className="text-xs text-gray-500">
          {references.length} reference{references.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2 pl-2">
        {references.map(ref => {
          const comparison = compareVersions(ref.id);
          return (
            <ReferenceRow
              key={ref.id}
              reference={ref}
              comparison={comparison}
              currentVersion={currentVersion}
              onNavigate={() => onNavigate?.(module, ref.context.recordId)}
            />
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// REFERENCE ROW
// =============================================================================

interface ReferenceRowProps {
  reference: DocumentReference;
  comparison: VersionComparisonResult | null;
  currentVersion: string;
  onNavigate?: () => void;
}

function ReferenceRow({ reference, comparison, currentVersion, onNavigate }: ReferenceRowProps) {
  const isStale = comparison && !comparison.isCurrent && reference.referenceType === 'live';
  const isFrozen = reference.referenceType === 'frozen';
  const hasHold = reference.regulatoryHold;
  
  return (
    <div className="flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700/30">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm text-gray-300 truncate">
            {reference.context.recordName}
          </div>
          {reference.context.location && (
            <div className="text-xs text-gray-500 truncate">
              {reference.context.location}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Version Status */}
        {isFrozen ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
            bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Lock className="w-3 h-3" />
            v{reference.sourceVersion}
          </span>
        ) : isStale ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
            bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            v{reference.sourceVersion} → v{currentVersion}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
            bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" />
            v{reference.sourceVersion}
          </span>
        )}
        
        {hasHold && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs
            bg-red-500/20 text-red-400 border border-red-500/30">
            <Shield className="w-3 h-3" />
          </span>
        )}
        
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-300 transition-colors"
            title="View in module"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION IMPACT SUMMARY
// =============================================================================

export interface VersionImpactSummaryProps {
  documentId: string;
  proposedVersion: string;
}

/**
 * Shows the impact of publishing a new version on downstream references
 */
export function VersionImpactSummary({ documentId, proposedVersion }: VersionImpactSummaryProps) {
  const references = useDocumentLineageStore(state => state.references);
  
  // Find live references that will become stale
  const liveRefs = references.filter(ref => 
    ref.sourceDocumentId === documentId && 
    ref.referenceType === 'live'
  );
  
  // Find frozen references that won't be affected
  const frozenRefs = references.filter(ref => 
    ref.sourceDocumentId === documentId && 
    ref.referenceType === 'frozen'
  );
  
  if (liveRefs.length === 0 && frozenRefs.length === 0) {
    return null;
  }
  
  return (
    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <div className="flex items-start gap-3">
        <Activity className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-400 mb-2">
            Version Impact Analysis
          </div>
          
          {liveRefs.length > 0 && (
            <div className="mb-2">
              <div className="text-sm text-gray-300">
                <strong>{liveRefs.length}</strong> live reference{liveRefs.length !== 1 ? 's' : ''} will need update:
              </div>
              <div className="mt-1 space-y-1">
                {liveRefs.slice(0, 5).map(ref => (
                  <div key={ref.id} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded ${moduleConfig[ref.context.module]?.bgClass}`}>
                      {moduleConfig[ref.context.module]?.label}
                    </span>
                    <span>{ref.context.recordName}</span>
                  </div>
                ))}
                {liveRefs.length > 5 && (
                  <div className="text-xs text-gray-500">
                    +{liveRefs.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
          
          {frozenRefs.length > 0 && (
            <div className="text-sm text-gray-400">
              <Lock className="w-3.5 h-3.5 inline mr-1" />
              {frozenRefs.length} frozen reference{frozenRefs.length !== 1 ? 's' : ''} will not be affected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DOCUMENT LINEAGE SUMMARY BADGE
// =============================================================================

export interface DocumentLineageBadgeProps {
  documentId: string;
  compact?: boolean;
}

/**
 * Compact badge showing lineage status for document list views
 */
export function DocumentLineageBadge({ documentId, compact = false }: DocumentLineageBadgeProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  const docRefs = references.filter(ref => ref.sourceDocumentId === documentId);
  
  if (docRefs.length === 0) return null;
  
  // Count stale
  let staleCount = 0;
  docRefs.forEach(ref => {
    const comparison = compareVersions(ref.id);
    if (comparison && !comparison.isCurrent && ref.referenceType === 'live') {
      staleCount++;
    }
  });
  
  const moduleCount = new Set(docRefs.map(r => r.context.module)).size;
  
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
        ${staleCount > 0 
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
          : 'bg-gray-700/50 text-gray-400 border border-gray-600'}`}
        title={`Referenced in ${moduleCount} module${moduleCount !== 1 ? 's' : ''}${staleCount > 0 ? `, ${staleCount} stale` : ''}`}
      >
        <Link2 className="w-3 h-3" />
        {docRefs.length}
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500">
        <Link2 className="w-3.5 h-3.5 inline mr-1" />
        {docRefs.length} ref{docRefs.length !== 1 ? 's' : ''}
      </span>
      {staleCount > 0 && (
        <span className="text-amber-400">
          <AlertTriangle className="w-3 h-3 inline mr-0.5" />
          {staleCount} stale
        </span>
      )}
    </div>
  );
}

// =============================================================================
// BULK UPDATE PANEL
// =============================================================================

export interface BulkUpdatePanelProps {
  documentId: string;
  currentVersion: string;
  onUpdateAll?: () => void;
}

/**
 * Panel for bulk updating all stale references to current version
 */
export function BulkUpdatePanel({ documentId, currentVersion, onUpdateAll }: BulkUpdatePanelProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  const updateReference = useDocumentLineageStore(state => state.updateReference);
  
  // Find stale live references
  const staleRefs = useMemo(() => {
    return references.filter(ref => {
      if (ref.sourceDocumentId !== documentId || ref.referenceType !== 'live') return false;
      const comparison = compareVersions(ref.id);
      return comparison && !comparison.isCurrent;
    });
  }, [references, documentId, compareVersions]);
  
  if (staleRefs.length === 0) return null;
  
  const handleUpdateAll = () => {
    staleRefs.forEach(ref => {
      updateReference({ id: ref.id, sourceVersion: currentVersion });
    });
    onUpdateAll?.();
  };
  
  return (
    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm font-medium text-blue-400">
              {staleRefs.length} Reference{staleRefs.length !== 1 ? 's' : ''} Out of Date
            </div>
            <div className="text-xs text-gray-400">
              Update all live references to v{currentVersion}
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleUpdateAll}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Update All
        </Button>
      </div>
    </div>
  );
}

export default CrossModulePresencePanel;
