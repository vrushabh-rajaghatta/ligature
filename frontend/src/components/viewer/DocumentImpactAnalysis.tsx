

import { useState, useMemo } from 'react';
import {
  AlertTriangle, ChevronDown, ChevronRight, FileText, 
  GitBranch, ArrowRight, ArrowUpRight, Shield, AlertCircle,
  CheckCircle, Clock, Edit3, ExternalLink, X, Layers,
  TrendingUp, RefreshCw, Filter, Search, Eye
} from 'lucide-react';
import { useCrossReferenceStore } from '@/store/useCrossReferenceStore';
import {
  DocumentCrossReference,
  CrossReferenceType,
  crossReferenceTypeLabels,
} from '@/utils/document-converters';

// ============================================================================
// TYPES
// ============================================================================

interface ImpactChain {
  documentId: string;
  documentTitle: string;
  depth: number;
  referenceType: CrossReferenceType;
  impactLevel: 'critical' | 'major' | 'minor' | 'informational';
  relationship: string;
  children: ImpactChain[];
}

interface ImpactSummary {
  totalAffected: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  byType: Record<CrossReferenceType, number>;
}

interface DocumentImpactAnalysisProps {
  documentId: string;
  documentTitle: string;
  onViewDocument?: (documentId: string) => void;
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// IMPACT CALCULATION
// ============================================================================

function calculateImpactLevel(refType: CrossReferenceType, depth: number): ImpactChain['impactLevel'] {
  // Critical: Documents that directly depend on source
  if (depth === 1 && ['derived-from', 'prerequisite', 'supersedes'].includes(refType)) {
    return 'critical';
  }
  // Major: Direct references or second-level critical
  if (depth === 1 || (depth === 2 && ['derived-from', 'prerequisite'].includes(refType))) {
    return 'major';
  }
  // Minor: Third level or see-also/references at any level
  if (depth <= 3 || ['see-also', 'references'].includes(refType)) {
    return 'minor';
  }
  return 'informational';
}

function buildImpactTree(
  documentId: string,
  references: DocumentCrossReference[],
  visited: Set<string> = new Set(),
  depth: number = 0,
  maxDepth: number = 4
): ImpactChain[] {
  if (depth >= maxDepth || visited.has(documentId)) {
    return [];
  }
  
  visited.add(documentId);
  
  // Find all documents that reference this document (incoming)
  const dependents = references.filter(r => r.targetDocumentId === documentId);
  
  return dependents.map(ref => {
    const impactLevel = calculateImpactLevel(ref.referenceType, depth + 1);
    
    return {
      documentId: ref.sourceDocumentId,
      documentTitle: ref.sourceDocumentTitle,
      depth: depth + 1,
      referenceType: ref.referenceType,
      impactLevel,
      relationship: getRelationshipDescription(ref.referenceType),
      children: buildImpactTree(ref.sourceDocumentId, references, new Set(visited), depth + 1, maxDepth),
    };
  });
}

function getRelationshipDescription(type: CrossReferenceType): string {
  const descriptions: Record<CrossReferenceType, string> = {
    'cites': 'cites this document',
    'references': 'references this document',
    'supersedes': 'is superseded by this',
    'amends': 'is amended by this',
    'supports': 'is supported by this',
    'derived-from': 'is derived from this',
    'see-also': 'is related to this',
    'prerequisite': 'requires this as prerequisite',
  };
  return descriptions[type];
}

function calculateSummary(tree: ImpactChain[]): ImpactSummary {
  const summary: ImpactSummary = {
    totalAffected: 0,
    criticalCount: 0,
    majorCount: 0,
    minorCount: 0,
    byType: {} as Record<CrossReferenceType, number>,
  };
  
  const countNode = (node: ImpactChain) => {
    summary.totalAffected++;
    
    if (node.impactLevel === 'critical') summary.criticalCount++;
    else if (node.impactLevel === 'major') summary.majorCount++;
    else if (node.impactLevel === 'minor') summary.minorCount++;
    
    summary.byType[node.referenceType] = (summary.byType[node.referenceType] || 0) + 1;
    
    node.children.forEach(countNode);
  };
  
  tree.forEach(countNode);
  return summary;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ImpactLevelBadge({ level }: { level: ImpactChain['impactLevel'] }) {
  const config = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical' },
    major: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Major' },
    minor: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Minor' },
    informational: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Info' },
  };
  
  const { bg, text, label } = config[level];
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${bg} ${text}`}>{label}</span>
  );
}

function ImpactTreeNode({
  node,
  expanded,
  onToggle,
  onView,
}: {
  node: ImpactChain;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onView?: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.documentId);
  
  return (
    <div className="ml-4">
      <div className="flex items-start gap-2 py-2 group">
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.documentId)}
            className="p-0.5 hover:bg-surface-card rounded mt-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ImpactLevelBadge level={node.impactLevel} />
            <span className="text-xs text-text-muted">
              {crossReferenceTypeLabels[node.referenceType]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span className="text-sm text-text-primary truncate">{node.documentTitle}</span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 italic">{node.relationship}</p>
        </div>
        
        {/* View button */}
        {onView && (
          <button
            onClick={() => onView(node.documentId)}
            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-surface-card rounded transition-opacity"
            title="View Document"
          >
            <Eye className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-border ml-2 pl-2">
          {node.children.map(child => (
            <ImpactTreeNode
              key={child.documentId}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentImpactAnalysis({
  documentId,
  documentTitle,
  onViewDocument,
  onClose,
  className = '',
}: DocumentImpactAnalysisProps) {
  const references = useCrossReferenceStore(s => s.references);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<ImpactChain['impactLevel'] | 'all'>('all');
  const [showDirectOnly, setShowDirectOnly] = useState(false);
  
  // Build impact tree
  const impactTree = useMemo(() => {
    return buildImpactTree(documentId, references);
  }, [documentId, references]);
  
  // Calculate summary
  const summary = useMemo(() => calculateSummary(impactTree), [impactTree]);
  
  // Filter tree
  const filteredTree = useMemo(() => {
    if (filterLevel === 'all' && !showDirectOnly) return impactTree;
    
    const filterNode = (node: ImpactChain): ImpactChain | null => {
      if (filterLevel !== 'all' && node.impactLevel !== filterLevel) return null;
      if (showDirectOnly && node.depth > 1) return null;
      
      const filteredChildren = showDirectOnly ? [] : node.children
        .map(filterNode)
        .filter((n): n is ImpactChain => n !== null);
      
      return { ...node, children: filteredChildren };
    };
    
    return impactTree
      .map(filterNode)
      .filter((n): n is ImpactChain => n !== null);
  }, [impactTree, filterLevel, showDirectOnly]);
  
  // Toggle expansion
  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Expand all
  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: ImpactChain[]) => {
      nodes.forEach(n => {
        allIds.add(n.documentId);
        collect(n.children);
      });
    };
    collect(impactTree);
    setExpanded(allIds);
  };
  
  // Collapse all
  const collapseAll = () => setExpanded(new Set());

  return (
    <div className={`flex flex-col h-full bg-surface ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-blue" />
            Impact Analysis
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Changes to "{documentTitle}" may affect:
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-border">
        <div className="bg-surface-card border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-text-primary">{summary.totalAffected}</div>
          <div className="text-xs text-text-muted">Total Affected</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{summary.criticalCount}</div>
          <div className="text-xs text-red-400">Critical</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{summary.majorCount}</div>
          <div className="text-xs text-amber-400">Major</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{summary.minorCount}</div>
          <div className="text-xs text-blue-400">Minor</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as typeof filterLevel)}
            className="text-sm bg-surface-card border border-border rounded px-2 py-1 focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical Only</option>
            <option value="major">Major Only</option>
            <option value="minor">Minor Only</option>
          </select>
          
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showDirectOnly}
              onChange={(e) => setShowDirectOnly(e.target.checked)}
              className="rounded border-border"
            />
            Direct impact only
          </label>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-card rounded"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-card rounded"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      {/* Impact Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTree.length > 0 ? (
          <div className="space-y-1">
            {filteredTree.map(node => (
              <ImpactTreeNode
                key={node.documentId}
                node={node}
                expanded={expanded}
                onToggle={toggleExpanded}
                onView={onViewDocument}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="w-12 h-12 text-text-muted mb-3 opacity-50" />
            <p className="text-sm text-text-muted">
              {impactTree.length === 0 
                ? "No documents depend on this document"
                : "No documents match the current filters"
              }
            </p>
            <p className="text-xs text-text-muted mt-1">
              {impactTree.length === 0
                ? "Changes can be made safely without affecting other documents"
                : "Try adjusting your filters"
              }
            </p>
          </div>
        )}
      </div>
      
      {/* Recommendations */}
      {summary.criticalCount > 0 && (
        <div className="p-4 border-t border-border bg-surface-elevated">
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-400">Critical Dependencies Detected</h4>
              <p className="text-xs text-text-secondary mt-1">
                {summary.criticalCount} document{summary.criticalCount > 1 ? 's are' : ' is'} critically dependent 
                on this document. Changes may require updates to these documents before submission.
              </p>
              <div className="mt-2 flex gap-2">
                <button className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">
                  Review Critical Documents
                </button>
                <button className="text-xs px-2 py-1 text-text-secondary hover:text-text-primary">
                  Create Change Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentImpactAnalysis;
