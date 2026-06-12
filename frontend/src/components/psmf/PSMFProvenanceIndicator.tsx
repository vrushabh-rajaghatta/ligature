
/**
 * PSMF Provenance Indicator
 * ==========================
 * Integration component for showing document lineage status in PSMF SOP index.
 * Connects PSMF SOP references to their QMS source documents.
 * 
 * @version 0.14.6
 * @since 2026-01-08
 */


import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Lock, Shield, GitBranch, FileCheck, ExternalLink } from 'lucide-react';
import { useDocumentLineageStore } from '@/store/useDocumentLineageStore';
import type { VersionComparisonResult } from '@/types/document-lineage';

// =============================================================================
// TYPES
// =============================================================================

export interface PSMFProvenanceIndicatorProps {
  /** SOP ID to check for lineage */
  sopId: string;
  /** SOP document number */
  sopDocumentNumber: string;
  /** SOP version displayed in PSMF */
  sopVersion: string;
  /** SOP title for tooltips */
  sopTitle: string;
  /** Click handler to view full provenance or navigate to QMS */
  onViewSource?: () => void;
}

// =============================================================================
// STALENESS STYLING
// =============================================================================

const stalenessConfig: Record<VersionComparisonResult['staleness'], {
  icon: typeof CheckCircle;
  badgeClass: string;
  textClass: string;
  rowClass: string;
  label: string;
}> = {
  'current': {
    icon: CheckCircle,
    badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
    textClass: 'text-green-400',
    rowClass: '',
    label: 'Current',
  },
  'minor-update': {
    icon: Clock,
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400',
    rowClass: 'bg-amber-500/5',
    label: 'Update Available',
  },
  'major-update': {
    icon: AlertTriangle,
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    textClass: 'text-orange-400',
    rowClass: 'bg-orange-500/5',
    label: 'Major Update',
  },
  'critical-update': {
    icon: AlertTriangle,
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    textClass: 'text-red-400',
    rowClass: 'bg-red-500/5',
    label: 'Critical - Update Required',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PSMFProvenanceIndicator({
  sopId,
  sopDocumentNumber,
  sopVersion,
  sopTitle,
  onViewSource,
}: PSMFProvenanceIndicatorProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find reference for this SOP in PSMF context
  const reference = references.find(ref => 
    ref.context.module === 'psmf' && 
    (ref.context.recordId === sopId || ref.documentNumber === sopDocumentNumber)
  );
  
  // No lineage tracking - just show version
  if (!reference) {
    return (
      <span className="text-sm text-gray-400">{sopVersion}</span>
    );
  }
  
  // Get version comparison
  const comparison = compareVersions(reference.id);
  
  if (!comparison) {
    return (
      <span className="text-sm text-gray-400">{sopVersion}</span>
    );
  }
  
  const config = stalenessConfig[comparison.staleness];
  const Icon = config.icon;
  
  // Current version - simple indicator
  if (comparison.isCurrent) {
    return (
      <button
        onClick={onViewSource}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-sm
          text-green-400 hover:bg-green-500/10 transition-colors"
        title="SOP is at current version"
      >
        <CheckCircle className="w-3.5 h-3.5" />
        <span>{reference.sourceVersion}</span>
      </button>
    );
  }
  
  // Stale - show warning with version diff
  return (
    <button
      onClick={onViewSource}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-sm border
        ${config.badgeClass} hover:brightness-110 transition-all`}
      title={`${config?.label ?? ''}: QMS has v${comparison.currentVersion}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{reference.sourceVersion}</span>
      <GitBranch className="w-3 h-3 opacity-60" />
      <span className="opacity-75">{comparison.currentVersion}</span>
    </button>
  );
}

// =============================================================================
// TABLE ROW HIGHLIGHT HELPER
// =============================================================================

export interface PSMFSOPRowClassProps {
  sopId: string;
  sopDocumentNumber: string;
}

/**
 * Returns additional CSS class for table row based on staleness
 */
export function usePSMFSOPRowClass({ sopId, sopDocumentNumber }: PSMFSOPRowClassProps): string {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  const reference = references.find(ref => 
    ref.context.module === 'psmf' && 
    (ref.context.recordId === sopId || ref.documentNumber === sopDocumentNumber)
  );
  
  if (!reference) return '';
  
  const comparison = compareVersions(reference.id);
  if (!comparison || comparison.isCurrent) return '';
  
  return stalenessConfig[comparison.staleness]?.rowClass;
}

// =============================================================================
// PSMF COMPLIANCE ALERT
// =============================================================================

export interface PSMFComplianceAlertProps {
  /** Check all SOPs in PSMF for staleness */
  sopIds?: string[];
}

/**
 * Shows alert banner if any PSMF-referenced SOPs are stale
 */
export function PSMFComplianceAlert({ sopIds }: PSMFComplianceAlertProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Get all PSMF references
  const psmfRefs = references.filter(ref => ref.context.module === 'psmf');
  
  if (psmfRefs.length === 0) return null;
  
  // Count stale SOPs
  let staleCount = 0;
  let criticalCount = 0;
  
  psmfRefs.forEach(ref => {
    const comparison = compareVersions(ref.id);
    if (comparison && !comparison.isCurrent) {
      staleCount++;
      if (comparison.staleness === 'critical-update') {
        criticalCount++;
      }
    }
  });
  
  if (staleCount === 0) return null;
  
  if (criticalCount > 0) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-medium text-red-400">
            PSMF Compliance Alert: Critical SOP Updates Required
          </div>
          <div className="text-sm text-gray-300 mt-1">
            {criticalCount} SOP{criticalCount !== 1 ? 's' : ''} referenced in this PSMF {criticalCount !== 1 ? 'have' : 'has'} critical updates in QMS.
            {staleCount > criticalCount && ` ${staleCount - criticalCount} additional SOP${staleCount - criticalCount !== 1 ? 's' : ''} have minor updates.`}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Update PSMF Annex C references to maintain regulatory compliance.
          </div>
        </div>
        <button className="px-3 py-1.5 rounded-lg text-xs font-medium
          bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0">
          Review Updates
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-medium text-amber-400">
          SOP Updates Available
        </div>
        <div className="text-sm text-gray-300 mt-1">
          {staleCount} SOP{staleCount !== 1 ? 's' : ''} referenced in this PSMF {staleCount !== 1 ? 'have' : 'has'} newer versions in QMS.
        </div>
      </div>
      <button className="px-3 py-1.5 rounded-lg text-xs font-medium
        bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex-shrink-0">
        View Changes
      </button>
    </div>
  );
}

// =============================================================================
// ANNEX C SUMMARY
// =============================================================================

export interface AnnexCLineageSummaryProps {
  /** Total SOPs in PSMF */
  totalSOPs: number;
}

/**
 * Shows lineage status summary for PSMF Annex C
 */
export function AnnexCLineageSummary({ totalSOPs }: AnnexCLineageSummaryProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  const psmfRefs = references.filter(ref => ref.context.module === 'psmf');
  
  // Calculate stats
  let tracked = psmfRefs.length;
  let current = 0;
  let stale = 0;
  
  psmfRefs.forEach(ref => {
    const comparison = compareVersions(ref.id);
    if (comparison) {
      if (comparison.isCurrent) {
        current++;
      } else {
        stale++;
      }
    }
  });
  
  const untracked = totalSOPs - tracked;
  
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <FileCheck className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-gray-400">{tracked} tracked</span>
      </div>
      {current > 0 && (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400">{current} current</span>
        </div>
      )}
      {stale > 0 && (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400">{stale} stale</span>
        </div>
      )}
      {untracked > 0 && (
        <div className="flex items-center gap-1.5 text-gray-500">
          <span>{untracked} untracked</span>
        </div>
      )}
    </div>
  );
}

export default PSMFProvenanceIndicator;
