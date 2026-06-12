
/**
 * Document Number Link
 * ====================
 * Clickable document number that navigates to Document Control source.
 * Standard pattern for linking to source documents throughout the app.
 * 
 * Behavior:
 * - Live references: Link to current version in Document Control
 * - Frozen references: Show lock icon, still links but indicates frozen state
 * - Optional: Show version comparison if stale
 * 
 * @version 0.15.1
 * @since 2026-01-08
 */


import React from 'react';
import { ExternalLink, Lock, FileText } from 'lucide-react';
import { useModuleNavigation } from '@/hooks/useModuleNavigation';
import { useDocumentLineageStore } from '@/store/useDocumentLineageStore';

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentNumberLinkProps {
  /** Document number to display */
  documentNumber: string;
  /** Document ID in the source system (Document Control) */
  sourceDocumentId?: string;
  /** Whether this is a frozen reference */
  isFrozen?: boolean;
  /** Optional version to show */
  version?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show external link icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DocumentNumberLink({
  documentNumber,
  sourceDocumentId,
  isFrozen = false,
  version,
  size = 'sm',
  showIcon = false,
  className = '',
}: DocumentNumberLinkProps) {
  const { navigateTo } = useModuleNavigation();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    navigateTo({
      module: 'document-control',
      selection: sourceDocumentId ? { documentId: sourceDocumentId } : undefined,
    });
  };
  
  const sizeClasses = size === 'sm' 
    ? 'text-sm' 
    : 'text-base';
  
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 font-mono text-blue-400 hover:text-blue-300 
        hover:underline transition-colors ${sizeClasses} ${className}`}
      title={isFrozen 
        ? `View ${documentNumber} in Document Control (frozen at ${version || 'current'})` 
        : `View ${documentNumber} in Document Control`}
    >
      {isFrozen && <Lock className="w-3 h-3 text-blue-400/60" />}
      <span>{documentNumber}</span>
      {showIcon && <ExternalLink className="w-3 h-3 opacity-60" />}
    </button>
  );
}

// =============================================================================
// LINEAGE-AWARE VARIANT
// =============================================================================

export interface LineageAwareDocumentLinkProps {
  /** Document number to display */
  documentNumber: string;
  /** Reference ID in the lineage store (if tracked) */
  referenceId?: string;
  /** Document ID to look up if referenceId not provided */
  documentId?: string;
  /** Module context for finding the reference */
  module?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show version status indicator */
  showVersionStatus?: boolean;
}

/**
 * Document link that checks lineage store for frozen/stale status
 */
export function LineageAwareDocumentLink({
  documentNumber,
  referenceId,
  documentId,
  module,
  size = 'sm',
  showVersionStatus = false,
}: LineageAwareDocumentLinkProps) {
  const { navigateTo } = useModuleNavigation();
  const references = useDocumentLineageStore(state => state.references);
  const compareVersions = useDocumentLineageStore(state => state.compareVersions);
  
  // Find the reference
  const reference = referenceId 
    ? references.find(r => r.id === referenceId)
    : references.find(r => 
        r.documentNumber === documentNumber && 
        (!module || r.context.module === module)
      );
  
  const comparison = reference ? compareVersions(reference.id) : null;
  const isFrozen = reference?.referenceType === 'frozen';
  const isStale = comparison && !comparison.isCurrent;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    navigateTo({
      module: 'document-control',
      selection: reference?.sourceDocumentId 
        ? { documentId: reference.sourceDocumentId } 
        : undefined,
    });
  };
  
  const sizeClasses = size === 'sm' ? 'text-sm' : 'text-base';
  
  // Determine color based on status
  const colorClass = isFrozen 
    ? 'text-blue-400 hover:text-blue-300' 
    : isStale 
      ? 'text-amber-400 hover:text-amber-300'
      : 'text-blue-400 hover:text-blue-300';
  
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 font-mono hover:underline transition-colors ${sizeClasses} ${colorClass}`}
      title={isFrozen 
        ? `Frozen reference - View source in Document Control` 
        : isStale
          ? `Stale reference (v${reference?.sourceVersion} → v${comparison?.currentVersion}) - View source`
          : `View in Document Control`}
    >
      {isFrozen && <Lock className="w-3 h-3 opacity-60" />}
      <span>{documentNumber}</span>
      {showVersionStatus && reference && (
        <span className="text-xs opacity-60">
          v{reference.sourceVersion}
          {isStale && !isFrozen && ` → v${comparison?.currentVersion}`}
        </span>
      )}
    </button>
  );
}

export default DocumentNumberLink;
