/**
 * Document Provenance Badge
 * =========================
 * Reusable UI component showing document lineage status.
 * Displays source, version status, staleness warnings, and cross-module presence.
 * 
 * @version 0.14.3
 * @since 2026-01-08
 */


import React, { useState } from 'react';
import {
  FileText,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Link2,
  Eye,
  History,
} from 'lucide-react';
import type {
  DocumentReference,
  VersionComparisonResult,
  ReferenceContext,
  LineageModule,
} from '@/types/document-lineage';

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentProvenanceBadgeProps {
  /** The document reference to display */
  reference: DocumentReference;
  
  /** Version comparison result */
  comparison: VersionComparisonResult;
  
  /** Cross-module presence contexts */
  crossModulePresence?: ReferenceContext[];
  
  /** Show cross-module presence count */
  showCrossModuleCount?: boolean;
  
  /** Compact mode (icon only) */
  compact?: boolean;
  
  /** Show expanded details by default */
  defaultExpanded?: boolean;
  
  /** Click handler to navigate to source */
  onNavigateToSource?: () => void;
  
  /** Click handler to view all references */
  onViewAllReferences?: () => void;
  
  /** Click handler to view version diff */
  onViewVersionDiff?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const moduleLabels: Record<LineageModule, string> = {
  'document-control': 'Document Control',
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

// Static class mappings for Tailwind JIT compatibility
const moduleStyles: Record<LineageModule, string> = {
  'document-control': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'tmf': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'submissions': 'bg-green-500/20 text-green-400 border-green-500/30',
  'psmf': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'ctms': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'safety': 'bg-red-500/20 text-red-400 border-red-500/30',
  'qms': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'eln': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'authoring': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'publishing': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const stalenessStyles: Record<VersionComparisonResult['staleness'], { badge: string; text: string; bg: string }> = {
  'current': { 
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    text: 'text-green-400',
    bg: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20'
  },
  'minor-update': { 
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20'
  },
  'major-update': { 
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    text: 'text-orange-400',
    bg: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20'
  },
  'critical-update': { 
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    text: 'text-red-400',
    bg: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20'
  },
};

function getStatusIcon(staleness: VersionComparisonResult['staleness']) {
  switch (staleness) {
    case 'current': return CheckCircle;
    case 'minor-update': return Clock;
    case 'major-update': return AlertTriangle;
    case 'critical-update': return AlertTriangle;
    default: return FileText;
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ModuleBadgeProps {
  module: LineageModule;
  size?: 'sm' | 'md';
}

function ModuleBadge({ module, size = 'sm' }: ModuleBadgeProps) {
  const styles = moduleStyles[module];
  const label = moduleLabels[module];
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium border
        ${styles}
        ${size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5'}`}
    >
      <Layers className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label}
    </span>
  );
}

interface VersionStatusBadgeProps {
  comparison: VersionComparisonResult;
  size?: 'sm' | 'md';
}

function VersionStatusBadge({ comparison, size = 'sm' }: VersionStatusBadgeProps) {
  const styles = stalenessStyles[comparison.staleness];
  const Icon = getStatusIcon(comparison.staleness);
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium border
        ${styles.badge}
        ${size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5'}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {comparison.isCurrent ? 'Current' : `v${comparison.referencedVersion}`}
    </span>
  );
}

interface ReferenceTypeBadgeProps {
  type: DocumentReference['referenceType'];
  regulatoryHold?: boolean;
}

function ReferenceTypeBadge({ type, regulatoryHold }: ReferenceTypeBadgeProps) {
  if (regulatoryHold) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        bg-red-500/20 text-red-400 border border-red-500/30">
        <Shield className="w-3 h-3" />
        Regulatory Hold
      </span>
    );
  }
  
  if (type === 'frozen') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <Lock className="w-3 h-3" />
        Frozen
      </span>
    );
  }
  
  if (type === 'superseded') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        bg-gray-500/20 text-gray-400 border border-gray-500/30">
        <History className="w-3 h-3" />
        Superseded
      </span>
    );
  }
  
  return null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DocumentProvenanceBadge({
  reference,
  comparison,
  crossModulePresence = [],
  showCrossModuleCount = true,
  compact = false,
  defaultExpanded = false,
  onNavigateToSource,
  onViewAllReferences,
  onViewVersionDiff,
}: DocumentProvenanceBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const styles = stalenessStyles[comparison.staleness];
  const StatusIcon = getStatusIcon(comparison.staleness);
  const otherModules = crossModulePresence.filter(ctx => ctx.module !== reference.context.module);
  
  // Compact mode - just an icon with tooltip behavior
  if (compact) {
    return (
      <div className="relative group">
        <button
          className={`p-1.5 rounded-lg transition-colors border ${styles?.bg ?? ''}`}
          onClick={onNavigateToSource}
          title={comparison.statusMessage}
        >
          <StatusIcon className="w-4 h-4" />
        </button>
        
        {/* Hover tooltip */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
          hidden group-hover:block w-64 p-3 rounded-lg
          bg-gray-800 border border-gray-700 shadow-xl">
          <div className="text-xs text-gray-300">
            <div className="font-medium text-white mb-1">{reference.documentTitle}</div>
            <div className="text-gray-400">v{reference.sourceVersion}</div>
            {!comparison.isCurrent && (
              <div className={`mt-1 ${styles?.text ?? ''}`}>
                {comparison.statusMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header Row */}
      <div className="px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-white truncate">
            {reference.documentNumber}
          </span>
          <VersionStatusBadge comparison={comparison} />
          <ReferenceTypeBadge type={reference.referenceType} regulatoryHold={reference.regulatoryHold} />
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {showCrossModuleCount && otherModules.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              bg-gray-700/50 text-gray-400 border border-gray-600">
              <Link2 className="w-3 h-3" />
              +{otherModules.length}
            </span>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-700/50 space-y-3">
          {/* Source Info */}
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Source</div>
            <div className="flex items-center gap-2">
              <ModuleBadge module={reference.context.module} />
              <span className="text-sm text-gray-300">{reference.context.recordName}</span>
            </div>
            {reference.context.location && (
              <div className="text-xs text-gray-500 ml-1">
                📍 {reference.context.location}
              </div>
            )}
          </div>
          
          {/* Version Status */}
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Version Status</div>
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${styles?.text ?? ''}`} />
              <span className={`text-sm ${styles?.text ?? ''}`}>
                {comparison.statusMessage}
              </span>
            </div>
            {!comparison.isCurrent && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <GitBranch className="w-3 h-3" />
                <span>Referenced: v{comparison.referencedVersion}</span>
                <span>→</span>
                <span>Current: v{comparison.currentVersion}</span>
              </div>
            )}
          </div>
          
          {/* Cross-Module Presence */}
          {otherModules.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Also Referenced In</div>
              <div className="flex flex-wrap gap-1.5">
                {otherModules.map((ctx, idx) => (
                  <ModuleBadge key={`${ctx.module}-${idx}`} module={ctx.module} />
                ))}
              </div>
            </div>
          )}
          
          {/* Freeze Reason */}
          {reference.freezeReason && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Freeze Reason</div>
              <div className="text-sm text-gray-300">{reference.freezeReason}</div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
            {onNavigateToSource && (
              <button
                onClick={onNavigateToSource}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                  bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Source
              </button>
            )}
            {onViewVersionDiff && !comparison.isCurrent && (
              <button
                onClick={onViewVersionDiff}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                  bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
                View Changes
              </button>
            )}
            {onViewAllReferences && otherModules.length > 0 && (
              <button
                onClick={onViewAllReferences}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                  bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                All References
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// INLINE VARIANT
// =============================================================================

export interface InlineProvenanceBadgeProps {
  reference: DocumentReference;
  comparison: VersionComparisonResult;
  onClick?: () => void;
}

/**
 * Inline variant for use in table rows or compact lists
 */
export function InlineProvenanceBadge({ reference, comparison, onClick }: InlineProvenanceBadgeProps) {
  const styles = stalenessStyles[comparison.staleness];
  const StatusIcon = getStatusIcon(comparison.staleness);
  
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors border ${styles?.bg ?? ''}`}
    >
      <StatusIcon className="w-3.5 h-3.5" />
      <span className="font-medium">v{reference.sourceVersion}</span>
      {!comparison.isCurrent && (
        <>
          <span className="text-gray-500">→</span>
          <span>v{comparison.currentVersion}</span>
        </>
      )}
      {reference.referenceType === 'frozen' && (
        <Lock className="w-3 h-3 ml-0.5" />
      )}
      {reference.regulatoryHold && (
        <Shield className="w-3 h-3 ml-0.5 text-red-400" />
      )}
    </button>
  );
}

// =============================================================================
// STALENESS ALERT
// =============================================================================

export interface StalenessAlertProps {
  comparison: VersionComparisonResult;
  documentTitle: string;
  onUpdate?: () => void;
  onDismiss?: () => void;
}

/**
 * Alert banner for stale document notifications
 */
export function StalenessAlert({ comparison, documentTitle, onUpdate, onDismiss }: StalenessAlertProps) {
  if (comparison.isCurrent) return null;
  
  const styles = stalenessStyles[comparison.staleness];
  const Icon = getStatusIcon(comparison.staleness);
  
  // Use explicit classes based on staleness level
  const alertBgClasses: Record<VersionComparisonResult['staleness'], string> = {
    'current': 'bg-green-500/10 border-green-500/20',
    'minor-update': 'bg-amber-500/10 border-amber-500/20',
    'major-update': 'bg-orange-500/10 border-orange-500/20',
    'critical-update': 'bg-red-500/10 border-red-500/20',
  };
  
  const buttonBgClasses: Record<VersionComparisonResult['staleness'], string> = {
    'current': 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
    'minor-update': 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30',
    'major-update': 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30',
    'critical-update': 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  };
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${alertBgClasses[comparison.staleness]}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles?.text ?? ''}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${styles?.text ?? ''}`}>
          Newer Version Available
        </div>
        <div className="text-sm text-gray-300 mt-0.5">
          {documentTitle} has been updated from v{comparison.referencedVersion} to v{comparison.currentVersion}
        </div>
        {comparison.changeSummary && comparison.changeSummary.length > 0 && (
          <ul className="mt-2 text-xs text-gray-400 list-disc list-inside">
            {comparison.changeSummary.slice(0, 3).map((change, idx) => (
              <li key={idx}>{change}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onUpdate && (
          <button
            onClick={onUpdate}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${buttonBgClasses[comparison.staleness]}`}
          >
            Update Reference
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700/50 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default DocumentProvenanceBadge;
