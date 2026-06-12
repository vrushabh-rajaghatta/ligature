
/**
 * CTMS & Safety Provenance Indicators
 * =====================================
 * Integration components for showing document lineage status in:
 * - CTMS protocol document references
 * - Safety case narrative source documents
 * 
 * @version 0.14.7
 * @since 2026-01-08
 */


import React from 'react';
import { 
  AlertTriangle, CheckCircle, Clock, Lock, Shield, GitBranch, 
  FileText, ClipboardList, Beaker, FileCheck 
} from 'lucide-react';
import { useDocumentLineageStore } from '@/store/useDocumentLineageStore';
import type { VersionComparisonResult, LineageModule } from '@/types/document-lineage';

// =============================================================================
// SHARED STALENESS CONFIG
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
// CTMS PROTOCOL PROVENANCE
// =============================================================================

export interface CTMSProtocolProvenanceProps {
  /** Study ID */
  studyId: string;
  /** Protocol number */
  protocolNumber: string;
  /** Protocol version */
  protocolVersion: string;
  /** Click to view source document */
  onViewSource?: () => void;
}

/**
 * Shows protocol document lineage status in CTMS study cards
 */
export function CTMSProtocolProvenance({
  studyId,
  protocolNumber,
  protocolVersion,
  onViewSource,
}: CTMSProtocolProvenanceProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find reference for this protocol in CTMS
  const reference = references.find(ref => 
    ref.context.module === 'ctms' && 
    (ref.context.recordId === studyId || ref.documentNumber === protocolNumber)
  );
  
  // No lineage tracking
  if (!reference) {
    return (
      <span className="text-xs font-mono text-gray-400">
        Protocol v{protocolVersion}
      </span>
    );
  }
  
  const comparison = compareVersions(reference.id);
  if (!comparison) {
    return (
      <span className="text-xs font-mono text-gray-400">
        Protocol v{protocolVersion}
      </span>
    );
  }
  
  const config = stalenessConfig[comparison.staleness];
  const Icon = config.icon;
  
  if (comparison.isCurrent) {
    return (
      <button
        onClick={onViewSource}
        className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:bg-green-500/10 px-2 py-0.5 rounded transition-colors"
        title="Protocol is at current version"
      >
        <ClipboardList className="w-3.5 h-3.5" />
        <span className="font-mono">v{reference.sourceVersion}</span>
        <CheckCircle className="w-3 h-3" />
      </button>
    );
  }
  
  return (
    <button
      onClick={onViewSource}
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border transition-all
        ${config.badgeClass} hover:brightness-110`}
      title={`${config?.label ?? ''}: Document Control has v${comparison.currentVersion}`}
    >
      <ClipboardList className="w-3.5 h-3.5" />
      <span className="font-mono">v{reference.sourceVersion}</span>
      <GitBranch className="w-3 h-3 opacity-60" />
      <span className="font-mono opacity-75">v{comparison.currentVersion}</span>
    </button>
  );
}

// =============================================================================
// SAFETY CASE DOCUMENT PROVENANCE
// =============================================================================

export interface SafetyCaseProvenanceProps {
  /** Case ID */
  caseId: string;
  /** Source document ID (e.g., protocol, IB) */
  sourceDocumentId?: string;
  /** Document type label */
  documentType?: string;
  /** Version referenced in case */
  referencedVersion: string;
  /** Click to view source */
  onViewSource?: () => void;
}

/**
 * Shows source document lineage for safety case narratives
 */
export function SafetyCaseProvenance({
  caseId,
  sourceDocumentId,
  documentType = 'Document',
  referencedVersion,
  onViewSource,
}: SafetyCaseProvenanceProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find reference for this case in safety module
  const reference = references.find(ref => 
    ref.context.module === 'safety' && 
    (ref.context.recordId === caseId || ref.sourceDocumentId === sourceDocumentId)
  );
  
  if (!reference) {
    return (
      <span className="text-xs text-gray-500">
        {documentType} v{referencedVersion}
      </span>
    );
  }
  
  const comparison = compareVersions(reference.id);
  if (!comparison) {
    return (
      <span className="text-xs text-gray-500">
        {documentType} v{referencedVersion}
      </span>
    );
  }
  
  const config = stalenessConfig[comparison.staleness];
  const Icon = config.icon;
  
  if (comparison.isCurrent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <FileCheck className="w-3 h-3" />
        {documentType} v{reference.sourceVersion}
      </span>
    );
  }
  
  return (
    <button
      onClick={onViewSource}
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border
        ${config.badgeClass} hover:brightness-110 transition-all`}
      title={`Source ${documentType.toLowerCase()} updated to v${comparison.currentVersion}`}
    >
      <Icon className="w-3 h-3" />
      <span>{documentType} v{reference.sourceVersion}</span>
      <span className="opacity-60">→</span>
      <span className="opacity-75">v{comparison.currentVersion}</span>
    </button>
  );
}

// =============================================================================
// STUDY DOCUMENTS SUMMARY
// =============================================================================

export interface StudyDocumentsSummaryProps {
  /** Study ID */
  studyId: string;
}

/**
 * Shows summary of document staleness for a study across modules
 */
export function StudyDocumentsSummary({ studyId }: StudyDocumentsSummaryProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find all references that might be related to this study
  // This is a simplified check - in production would use actual study linking
  const studyRefs = references.filter(ref => 
    ref.context.recordId === studyId ||
    ref.documentNumber?.includes(studyId.split('-')[0] || '')
  );
  
  if (studyRefs.length === 0) {
    return null;
  }
  
  let current = 0;
  let stale = 0;
  let critical = 0;
  
  studyRefs.forEach(ref => {
    const comparison = compareVersions(ref.id);
    if (comparison) {
      if (comparison.isCurrent) {
        current++;
      } else {
        stale++;
        if (comparison.staleness === 'critical-update') {
          critical++;
        }
      }
    }
  });
  
  if (stale === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckCircle className="w-3 h-3" />
        {studyRefs.length} docs current
      </span>
    );
  }
  
  if (critical > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400">
        <AlertTriangle className="w-3 h-3" />
        {critical} critical, {stale} stale
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
      <Clock className="w-3 h-3" />
      {stale} doc{stale !== 1 ? 's' : ''} stale
    </span>
  );
}

// =============================================================================
// CROSS-MODULE DOCUMENT ALERT
// =============================================================================

export interface CrossModuleDocumentAlertProps {
  /** Source document ID */
  documentId: string;
  /** Document title */
  documentTitle: string;
  /** Modules to check for references */
  checkModules?: LineageModule[];
}

/**
 * Alert when a document is referenced across multiple modules with version mismatches
 */
export function CrossModuleDocumentAlert({ 
  documentId, 
  documentTitle,
  checkModules = ['ctms', 'safety', 'tmf', 'submissions']
}: CrossModuleDocumentAlertProps) {
  const getCrossModulePresence = useDocumentLineageStore(state => state.getCrossModulePresence);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  const references = useDocumentLineageStore(state => state.references);
  
  const presence = getCrossModulePresence(documentId);
  const relevantPresence = presence.filter(p => checkModules.includes(p.module));
  
  if (relevantPresence.length <= 1) return null;
  
  // Check for version mismatches
  const moduleVersions: { module: LineageModule; version: string; isCurrent: boolean }[] = [];
  
  relevantPresence.forEach(p => {
    const ref = references.find(r => 
      r.sourceDocumentId === documentId && r.context.module === p.module
    );
    if (ref) {
      const comparison = compareVersions(ref.id);
      moduleVersions.push({
        module: p.module,
        version: ref.sourceVersion,
        isCurrent: comparison?.isCurrent ?? true,
      });
    }
  });
  
  const hasVersionMismatch = moduleVersions.some(v => !v.isCurrent);
  
  if (!hasVersionMismatch) return null;
  
  const moduleLabels: Partial<Record<LineageModule, string>> = {
    'ctms': 'CTMS',
    'safety': 'Safety',
    'tmf': 'TMF',
    'submissions': 'Submissions',
  };
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <div className="font-medium text-amber-400">Cross-Module Version Mismatch</div>
        <div className="text-gray-300 mt-1">
          "{documentTitle}" has different versions across modules:
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {moduleVersions.map(mv => (
            <span 
              key={mv.module}
              className={`px-2 py-0.5 rounded ${
                mv.isCurrent 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {moduleLabels[mv.module]}: v{mv.version}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CTMSProtocolProvenance;
