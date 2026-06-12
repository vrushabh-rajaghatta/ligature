
/**
 * TMF Document Provenance Indicator
 * ==================================
 * Integration component for showing document lineage status in TMF artifact rows.
 * Connects TMF artifacts to the Document Lineage Store.
 * 
 * @version 0.14.4
 * @since 2026-01-08
 */


import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Lock, Shield, GitBranch } from 'lucide-react';
import { useDocumentLineageStore } from '@/store/useDocumentLineageStore';
import type { VersionComparisonResult } from '@/types/document-lineage';

// =============================================================================
// TYPES
// =============================================================================

export interface TMFProvenanceIndicatorProps {
  /** TMF artifact ID to check for lineage */
  artifactId: string;
  /** Artifact version displayed in TMF */
  artifactVersion: string;
  /** Artifact title for tooltips */
  artifactTitle: string;
  /** Click handler to view full provenance details */
  onViewProvenance?: () => void;
}

// =============================================================================
// STALENESS STYLING (Static classes for Tailwind JIT)
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

export function TMFProvenanceIndicator({
  artifactId,
  artifactVersion,
  artifactTitle,
  onViewProvenance,
}: TMFProvenanceIndicatorProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find a reference for this artifact in the lineage store
  // Match by recordId (the TMF artifact ID)
  const reference = references.find(ref => 
    ref.context.module === 'tmf' && ref.context.recordId === artifactId
  );
  
  // No lineage tracking for this artifact - just show version
  if (!reference) {
    return (
      <span className="text-gray-400 text-xs">
        v{artifactVersion}
      </span>
    );
  }
  
  // Get version comparison
  const comparison = compareVersions(reference.id);
  
  if (!comparison) {
    return (
      <span className="text-gray-400 text-xs">
        v{artifactVersion}
      </span>
    );
  }
  
  const config = stalenessConfig[comparison.staleness];
  const Icon = config.icon;
  
  // If frozen, show frozen badge
  if (reference.referenceType === 'frozen') {
    return (
      <button
        onClick={onViewProvenance}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs
          bg-blue-500/20 text-blue-400 border border-blue-500/30
          hover:bg-blue-500/30 transition-colors"
        title={`Frozen at v${reference.sourceVersion}${reference.freezeReason ? `: ${reference.freezeReason}` : ''}`}
      >
        <Lock className="w-3 h-3" />
        <span>v{reference.sourceVersion}</span>
        <span className="text-blue-300/60">frozen</span>
      </button>
    );
  }
  
  // If regulatory hold
  if (reference.regulatoryHold) {
    return (
      <button
        onClick={onViewProvenance}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs
          bg-red-500/20 text-red-400 border border-red-500/30
          hover:bg-red-500/30 transition-colors"
        title="Under regulatory hold"
      >
        <Shield className="w-3 h-3" />
        <span>v{reference.sourceVersion}</span>
        <span className="text-red-300/60">hold</span>
      </button>
    );
  }
  
  // Normal provenance badge
  return (
    <button
      onClick={onViewProvenance}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border
        ${config.badgeClass} hover:brightness-110 transition-all`}
      title={comparison.statusMessage}
    >
      <Icon className="w-3 h-3" />
      <span>v{reference.sourceVersion}</span>
      {!comparison.isCurrent && (
        <>
          <GitBranch className="w-3 h-3 opacity-60" />
          <span className="opacity-75">v{comparison.currentVersion}</span>
        </>
      )}
    </button>
  );
}

// =============================================================================
// STALENESS ALERT FOR TMF ARTIFACT DETAIL
// =============================================================================

export interface TMFStalenessAlertProps {
  artifactId: string;
  onUpdate?: () => void;
  onViewSource?: () => void;
}

export function TMFStalenessAlert({ artifactId, onUpdate, onViewSource }: TMFStalenessAlertProps) {
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  const reference = references.find(ref => 
    ref.context.module === 'tmf' && ref.context.recordId === artifactId
  );
  
  if (!reference) return null;
  
  const comparison = compareVersions(reference.id);
  if (!comparison || comparison.isCurrent) return null;
  
  const config = stalenessConfig[comparison.staleness];
  const Icon = config.icon;
  
  // Use explicit background classes based on staleness
  const bgClasses: Record<VersionComparisonResult['staleness'], string> = {
    'current': 'bg-green-500/10 border-green-500/20',
    'minor-update': 'bg-amber-500/10 border-amber-500/20',
    'major-update': 'bg-orange-500/10 border-orange-500/20',
    'critical-update': 'bg-red-500/10 border-red-500/20',
  };
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgClasses[comparison.staleness]}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textClass}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${config.textClass}`}>
          {config.label}: Newer Version Available
        </div>
        <div className="text-sm text-gray-300 mt-0.5">
          Source document updated from v{comparison.referencedVersion} to v{comparison.currentVersion}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Source: {reference.documentTitle} in Document Control
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onViewSource && (
          <button
            onClick={onViewSource}
            className="px-3 py-1.5 rounded-lg text-xs font-medium
              bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            View Source
          </button>
        )}
        {onUpdate && (
          <button
            onClick={onUpdate}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${config.badgeClass.replace('border-', 'hover:border-')}`}
          >
            Update
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CROSS-MODULE PRESENCE INDICATOR
// =============================================================================

export interface TMFCrossModulePresenceProps {
  sourceDocumentId: string;
}

export function TMFCrossModulePresence({ sourceDocumentId }: TMFCrossModulePresenceProps) {
  const getCrossModulePresence = useDocumentLineageStore(state => state.getCrossModulePresence);
  const presence = getCrossModulePresence(sourceDocumentId);
  
  if (presence.length <= 1) return null;
  
  const moduleLabels: Record<string, string> = {
    'document-control': 'Doc Control',
    'tmf': 'TMF',
    'submissions': 'Submissions',
    'psmf': 'PSMF',
    'ctms': 'CTMS',
    'safety': 'Safety',
    'qms': 'QMS',
    'eln': 'ELN',
    'authoring': 'Authoring',
    'publishing': 'Publishing',
  };
  
  const otherModules = presence.filter(p => p.module !== 'tmf');
  
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span>Also in:</span>
      {otherModules.slice(0, 3).map((ctx, idx) => (
        <span key={idx} className="px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
          {moduleLabels[ctx.module] || ctx.module}
        </span>
      ))}
      {otherModules.length > 3 && (
        <span className="text-gray-500">+{otherModules.length - 3}</span>
      )}
    </div>
  );
}

export default TMFProvenanceIndicator;
