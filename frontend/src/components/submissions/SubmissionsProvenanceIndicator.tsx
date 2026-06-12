
/**
 * Submissions Provenance Indicator
 * =================================
 * Integration component for showing document lineage status in submission document lists.
 * Handles frozen documents, regulatory holds, and version tracking for submitted documents.
 * 
 * @version 0.14.5
 * @since 2026-01-08
 */


import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Lock, Shield, GitBranch, FileCheck } from 'lucide-react';
import { useDocumentLineageStore } from '@/store/useDocumentLineageStore';
import type { VersionComparisonResult } from '@/types/document-lineage';

// =============================================================================
// TYPES
// =============================================================================

export interface SubmissionsProvenanceIndicatorProps {
  /** Document ID to check for lineage */
  documentId: string;
  /** Document version displayed in submission */
  documentVersion: string;
  /** Document title for tooltips */
  documentTitle: string;
  /** Submission ID this document belongs to */
  submissionId?: string;
  /** Whether this document is frozen for submission */
  isFrozen?: boolean;
  /** Click handler to view full provenance details */
  onViewProvenance?: () => void;
}

// =============================================================================
// STALENESS STYLING
// =============================================================================

const stalenessConfig: Record<VersionComparisonResult['staleness'], {
  icon: typeof CheckCircle;
  badgeClass: string;
  textClass: string;
  label: string;
}> = {
  'current': {
    icon: CheckCircle,
    badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
    textClass: 'text-green-400',
    label: 'Current',
  },
  'minor-update': {
    icon: Clock,
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400',
    label: 'Update Available',
  },
  'major-update': {
    icon: AlertTriangle,
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    textClass: 'text-orange-400',
    label: 'Major Update',
  },
  'critical-update': {
    icon: AlertTriangle,
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    textClass: 'text-red-400',
    label: 'Critical Update',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SubmissionsProvenanceIndicator({
  documentId,
  documentVersion,
  documentTitle,
  submissionId,
  isFrozen = false,
  onViewProvenance,
}: SubmissionsProvenanceIndicatorProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find reference for this document in submissions context
  const reference = references.find(ref => 
    ref.context.module === 'submissions' && 
    (ref.context.recordId === documentId || 
     (submissionId && ref.context.recordId === submissionId))
  );
  
  // No lineage tracking - show appropriate default
  if (!reference) {
    // If explicitly frozen, show frozen indicator
    if (isFrozen) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-blue-400">
          <Lock className="w-2.5 h-2.5" />
          v{documentVersion}
        </span>
      );
    }
    // Otherwise just show version
    return (
      <span className="text-[10px] text-gray-400">v{documentVersion}</span>
    );
  }
  
  // Get version comparison
  const comparison = compareVersions(reference.id);
  
  if (!comparison) {
    return (
      <span className="text-[10px] text-gray-400">v{documentVersion}</span>
    );
  }
  
  const config = stalenessConfig[comparison.staleness];
  const Icon = config.icon;
  
  // Frozen for submission - this is expected and normal
  if (reference.referenceType === 'frozen') {
    const sourceHasUpdate = !comparison.isCurrent;
    
    return (
      <button
        onClick={onViewProvenance}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
          ${sourceHasUpdate 
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}
          hover:brightness-110 transition-all`}
        title={sourceHasUpdate 
          ? `Frozen at v${reference.sourceVersion}. Source now at v${comparison.currentVersion}` 
          : `Frozen at v${reference.sourceVersion} for submission`}
      >
        <Lock className="w-2.5 h-2.5" />
        <span>v{reference.sourceVersion}</span>
        {sourceHasUpdate && (
          <>
            <GitBranch className="w-2.5 h-2.5 opacity-60" />
            <span className="opacity-75">v{comparison.currentVersion}</span>
          </>
        )}
      </button>
    );
  }
  
  // Regulatory hold
  if (reference.regulatoryHold) {
    return (
      <button
        onClick={onViewProvenance}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
          bg-red-500/20 text-red-400 border border-red-500/30
          hover:brightness-110 transition-all"
        title="Document under regulatory hold"
      >
        <Shield className="w-2.5 h-2.5" />
        <span>v{reference.sourceVersion}</span>
        <span className="opacity-60">hold</span>
      </button>
    );
  }
  
  // Live reference with version status
  return (
    <button
      onClick={onViewProvenance}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border
        ${config.badgeClass} hover:brightness-110 transition-all`}
      title={comparison.statusMessage}
    >
      <Icon className="w-2.5 h-2.5" />
      <span>v{reference.sourceVersion}</span>
      {!comparison.isCurrent && (
        <>
          <GitBranch className="w-2.5 h-2.5 opacity-60" />
          <span className="opacity-75">v{comparison.currentVersion}</span>
        </>
      )}
    </button>
  );
}

// =============================================================================
// SUBMISSION DOCUMENT STATUS BADGE
// =============================================================================

export interface SubmissionDocumentStatusProps {
  documentId: string;
  submissionId: string;
  showFrozenStatus?: boolean;
}

/**
 * Shows whether a document was frozen at submission time
 * and if the source has been updated since
 */
export function SubmissionDocumentStatus({ 
  documentId, 
  submissionId,
  showFrozenStatus = true 
}: SubmissionDocumentStatusProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  const reference = references.find(ref => 
    ref.context.module === 'submissions' && 
    ref.context.recordId === submissionId
  );
  
  if (!reference) return null;
  
  const comparison = compareVersions(reference.id);
  if (!comparison) return null;
  
  // Only show if frozen and source has updates
  if (reference.referenceType !== 'frozen') return null;
  if (comparison.isCurrent) {
    if (!showFrozenStatus) return null;
    
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-blue-400">
        <FileCheck className="w-3 h-3" />
        Submitted
      </span>
    );
  }
  
  // Source has updates since submission
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
      <AlertTriangle className="w-3 h-3" />
      Source Updated
    </span>
  );
}

// =============================================================================
// SUBMISSION STALENESS SUMMARY
// =============================================================================

export interface SubmissionStalenessSummaryProps {
  submissionId: string;
}

/**
 * Shows a summary of how many documents in a submission have stale sources
 */
export function SubmissionStalenessSummary({ submissionId }: SubmissionStalenessSummaryProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find all references for this submission
  const submissionRefs = references.filter(ref => 
    ref.context.module === 'submissions' && 
    ref.context.recordId === submissionId
  );
  
  if (submissionRefs.length === 0) return null;
  
  // Count stale documents
  let staleCount = 0;
  let criticalCount = 0;
  
  submissionRefs.forEach(ref => {
    const comparison = compareVersions(ref.id);
    if (comparison && !comparison.isCurrent) {
      staleCount++;
      if (comparison.staleness === 'critical-update') {
        criticalCount++;
      }
    }
  });
  
  if (staleCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckCircle className="w-3.5 h-3.5" />
        All documents current
      </span>
    );
  }
  
  if (criticalCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        {criticalCount} critical update{criticalCount !== 1 ? 's' : ''}, {staleCount} total stale
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
      <Clock className="w-3.5 h-3.5" />
      {staleCount} document{staleCount !== 1 ? 's' : ''} have source updates
    </span>
  );
}

export default SubmissionsProvenanceIndicator;
