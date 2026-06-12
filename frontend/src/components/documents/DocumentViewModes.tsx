
// Document View Modes - v152
// Provides Grid, Submission (eCTD), and Discipline (EDM) views for Document Control


import { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Grid, List,
  Layers, Network, Package, FlaskConical, FileCheck, AlertTriangle, Settings,
  FileStack, Eye, Download, MoreHorizontal, Tag, Clock, CheckCircle, FileX,
  Lock, Unlock, Filter
} from 'lucide-react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import {
  ectdHierarchy, edmHierarchy,
  mapDocumentToECTD, mapDocumentToEDM,
  type HierarchyView, type ECTDNode, type EDMNode
} from '@/data/document-hierarchy';
import type { EnterpriseDocument, DocumentStatus, DocumentCategory, FileFormat } from '@/domains/document-control/contracts';

// ============================================
// Types
// ============================================

export type DocumentViewMode = 'grid' | 'submission' | 'discipline';

interface DocumentViewModeToggleProps {
  mode: DocumentViewMode;
  onChange: (mode: DocumentViewMode) => void;
}

interface DocumentTreeViewProps {
  documents: EnterpriseDocument[];
  onDocumentSelect: (document: EnterpriseDocument) => void;
  selectedDocumentId?: string | null;
  productName?: string;
  hierarchyType: 'ectd' | 'edm';
  searchQuery?: string;
}

// ============================================
// Color Maps (matching DocumentControlScreen)
// ============================================

const documentStatusColorMap: Record<string, BadgeColor> = {
  draft: 'slate', 'in-review': 'amber', 'pending-approval': 'orange', approved: 'blue',
  effective: 'green', superseded: 'purple', retired: 'slate', archived: 'slate',
  'on-hold': 'red', rejected: 'red',
};

const documentCategoryColorMap: Record<string, BadgeColor> = {
  regulatory: 'blue', clinical: 'teal', safety: 'red', quality: 'green',
  manufacturing: 'purple', nonclinical: 'amber', cmc: 'orange', labeling: 'cyan',
  correspondence: 'slate', administrative: 'slate', training: 'violet',
  reference: 'slate', template: 'teal', archive: 'slate',
};

// ============================================
// Category Icons
// ============================================

const categoryIcons: Record<string, React.ReactNode> = {
  clinical: <FlaskConical className="w-4 h-4 text-teal-400" />,
  regulatory: <FileCheck className="w-4 h-4 text-blue-400" />,
  safety: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  quality: <FileStack className="w-4 h-4 text-green-400" />,
  cmc: <Settings className="w-4 h-4 text-purple-400" />,
  manufacturing: <Package className="w-4 h-4 text-orange-400" />,
  nonclinical: <FlaskConical className="w-4 h-4 text-violet-400" />,
  labeling: <FileText className="w-4 h-4 text-cyan-400" />,
};

// ============================================
// Helper Functions
// ============================================

const getStatusBadge = (status: DocumentStatus) => {
  const labels: Record<string, string> = {
    draft: 'Draft', 'in-review': 'In Review', 'pending-approval': 'Pending',
    approved: 'Approved', effective: 'Effective', superseded: 'Superseded',
    retired: 'Retired', archived: 'Archived', 'on-hold': 'Hold', rejected: 'Rejected',
  };
  return <Badge color={documentStatusColorMap[status] || 'slate'} size="xs">{labels[status] || status}</Badge>;
};

const getCategoryBadge = (category: DocumentCategory) => (
  <Badge color={documentCategoryColorMap[category] || 'slate'} size="xs">
    {category.charAt(0).toUpperCase() + category.slice(1)}
  </Badge>
);

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return `${Math.floor(diff / (1000 * 60))}m ago`;
    return `${hours}h ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const getFileIcon = (format: FileFormat): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    docx: <FileText className="w-4 h-4 text-accent-blue" />,
    pdf: <FileText className="w-4 h-4 text-red-400" />,
    xlsx: <FileText className="w-4 h-4 text-green-400" />,
    pptx: <FileText className="w-4 h-4 text-orange-400" />,
  };
  return icons[format] || <FileText className="w-4 h-4 text-slate-400" />;
};

// ============================================
// View Mode Toggle Component
// ============================================

export function DocumentViewModeToggle({ mode, onChange }: DocumentViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border">
      <button
        onClick={() => onChange('grid')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
          mode === 'grid'
            ? 'bg-accent-blue text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
        }`}
        title="Grid/Table View"
      >
        <Grid className="w-3.5 h-3.5" />
        <span>Grid</span>
      </button>
      <button
        onClick={() => onChange('submission')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
          mode === 'submission'
            ? 'bg-accent-blue text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
        }`}
        title="eCTD Module Structure View"
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Submission</span>
      </button>
      <button
        onClick={() => onChange('discipline')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
          mode === 'discipline'
            ? 'bg-accent-blue text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
        }`}
        title="Discipline/Functional Area View"
      >
        <Network className="w-3.5 h-3.5" />
        <span>Discipline</span>
      </button>
    </div>
  );
}

// ============================================
// Document Tree View (Shared for Submission/Discipline)
// ============================================

export function DocumentTreeView({
  documents,
  onDocumentSelect,
  selectedDocumentId,
  productName = 'Nexavant (LIG-2847)',
  hierarchyType,
  searchQuery = ''
}: DocumentTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Default expanded nodes based on hierarchy type
    if (hierarchyType === 'ectd') {
      return new Set(['root', 'module-2', 'module-3', 'module-5']);
    }
    return new Set(['root', 'edm-clinical', 'edm-regulatory', 'edm-quality']);
  });
  const [showEmptyNodes, setShowEmptyNodes] = useState(false);

  // Map documents to hierarchy nodes
  const documentsByNode = useMemo(() => {
    const mapping: Record<string, EnterpriseDocument[]> = {};
    documents.forEach(doc => {
      const nodeIds = hierarchyType === 'ectd'
        ? mapDocumentToECTD(doc.category, doc.title)
        : mapDocumentToEDM(doc.category, doc.title);
      nodeIds.forEach(nodeId => {
        if (!mapping[nodeId]) mapping[nodeId] = [];
        mapping[nodeId].push(doc);
      });
    });
    return mapping;
  }, [documents, hierarchyType]);

  // Recursive document count
  const getNodeDocumentCount = useCallback((nodeId: string, children?: (ECTDNode | EDMNode)[]): number => {
    let count = documentsByNode[nodeId]?.length || 0;
    if (children) {
      children.forEach(child => {
        count += getNodeDocumentCount(child.id, (child as any).children);
      });
    }
    return count;
  }, [documentsByNode]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>(['root']);
    const collectIds = (nodes: (ECTDNode | EDMNode)[]) => {
      nodes.forEach(n => {
        allIds.add(n.id);
        if ((n as any).children) collectIds((n as any).children);
      });
    };
    collectIds(hierarchyType === 'ectd' ? ectdHierarchy : edmHierarchy);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => setExpandedNodes(new Set(['root']));

  const hierarchy = hierarchyType === 'ectd' ? ectdHierarchy : edmHierarchy;

  // Filter based on search
  const matchesSearch = useCallback((doc: EnterpriseDocument) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return doc.title.toLowerCase().includes(q) ||
           doc.documentId.toLowerCase().includes(q) ||
           doc.category.toLowerCase().includes(q);
  }, [searchQuery]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-border bg-surface-elevated">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            {hierarchyType === 'ectd' ? 'eCTD Module Structure' : 'Discipline View (EDM)'}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={expandAll} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-card rounded" title="Expand all">
              <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={collapseAll} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-card rounded" title="Collapse all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          {hierarchyType === 'ectd' 
            ? 'Documents organized by CTD module for submission' 
            : 'Documents organized by functional discipline'}
        </p>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Root Product Node */}
        <div className="mb-1">
          <button
            onClick={() => toggleNode('root')}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg bg-accent-blue/10 text-accent-blue font-medium hover:bg-accent-blue/15 transition-colors"
          >
            {expandedNodes.has('root') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Package className="w-4 h-4" />
            <span className="flex-1 text-left truncate">{productName}</span>
            <Badge color="blue" size="sm">{documents.length}</Badge>
          </button>

          {expandedNodes.has('root') && (
            <div className="mt-1 ml-2">
              {hierarchy.map(node => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={1}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  documentsByNode={documentsByNode}
                  getNodeDocumentCount={getNodeDocumentCount}
                  onDocumentSelect={onDocumentSelect}
                  selectedDocumentId={selectedDocumentId}
                  showEmptyNodes={showEmptyNodes}
                  hierarchyType={hierarchyType}
                  matchesSearch={matchesSearch}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Options */}
      <div className="flex-none p-3 border-t border-border bg-surface">
        <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer hover:text-text-secondary">
          <input
            type="checkbox"
            checked={showEmptyNodes}
            onChange={(e) => setShowEmptyNodes(e.target.checked)}
            className="rounded border-border"
          />
          Show empty sections
        </label>
      </div>
    </div>
  );
}

// ============================================
// Tree Node Component
// ============================================

interface TreeNodeProps {
  node: ECTDNode | EDMNode;
  depth: number;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  documentsByNode: Record<string, EnterpriseDocument[]>;
  getNodeDocumentCount: (nodeId: string, children?: (ECTDNode | EDMNode)[]) => number;
  onDocumentSelect: (document: EnterpriseDocument) => void;
  selectedDocumentId?: string | null;
  showEmptyNodes: boolean;
  hierarchyType: 'ectd' | 'edm';
  matchesSearch: (doc: EnterpriseDocument) => boolean;
}

function TreeNode({
  node, depth, expandedNodes, toggleNode, documentsByNode, getNodeDocumentCount,
  onDocumentSelect, selectedDocumentId, showEmptyNodes, hierarchyType, matchesSearch
}: TreeNodeProps) {
  const hasChildren = !!(node as any).children?.length;
  const allDocs = documentsByNode[node.id] || [];
  const documents = allDocs.filter(matchesSearch);
  const totalCount = getNodeDocumentCount(node.id, (node as any).children);
  const isExpanded = expandedNodes.has(node.id);

  // Skip empty nodes unless showing them
  if (!showEmptyNodes && totalCount === 0 && !hasChildren) return null;

  const isECTD = hierarchyType === 'ectd';
  const moduleLabel = isECTD ? (node as ECTDNode).module : null;

  return (
    <div style={{ marginLeft: depth > 1 ? '12px' : '0' }}>
      <button
        onClick={() => (hasChildren || documents.length > 0) && toggleNode(node.id)}
        className={`w-full flex items-center gap-1.5 px-2 py-2 text-sm rounded-lg transition-colors ${
          totalCount > 0 
            ? 'text-text-secondary hover:bg-surface-card hover:text-text-primary' 
            : 'text-text-muted opacity-60'
        }`}
      >
        {/* Expand/Collapse Icon */}
        {(hasChildren || documents.length > 0) ? (
          isExpanded 
            ? <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-none" /> 
            : <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-none" />
        ) : (
          <span className="w-3.5 flex-none" />
        )}

        {/* Folder Icon */}
        {isExpanded && (hasChildren || documents.length > 0) ? (
          <FolderOpen className="w-4 h-4 text-amber-400 flex-none" />
        ) : (
          <Folder className="w-4 h-4 text-text-muted flex-none" />
        )}

        {/* Module Number (eCTD only) */}
        {isECTD && moduleLabel && (
          <span className="text-xs font-mono text-text-muted w-12 flex-none">{moduleLabel}</span>
        )}

        {/* Node Title */}
        <span className="flex-1 text-left truncate">{node.title}</span>

        {/* Document Count */}
        {totalCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-text-muted font-medium">
            {totalCount}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-0.5">
          {/* Child Nodes */}
          {hasChildren && (node as any).children.map((child: ECTDNode | EDMNode) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              documentsByNode={documentsByNode}
              getNodeDocumentCount={getNodeDocumentCount}
              onDocumentSelect={onDocumentSelect}
              selectedDocumentId={selectedDocumentId}
              showEmptyNodes={showEmptyNodes}
              hierarchyType={hierarchyType}
              matchesSearch={matchesSearch}
            />
          ))}

          {/* Documents in this node */}
          {documents.length > 0 && (
            <div className="ml-6 mt-1 space-y-0.5">
              {documents.map(doc => (
                <DocumentTreeItem
                  key={doc.id}
                  document={doc}
                  isSelected={selectedDocumentId === doc.id}
                  onClick={() => onDocumentSelect(doc)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Document Tree Item Component
// ============================================

interface DocumentTreeItemProps {
  document: EnterpriseDocument;
  isSelected: boolean;
  onClick: () => void;
}

function DocumentTreeItem({ document, isSelected, onClick }: DocumentTreeItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all group ${
        isSelected
          ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/30'
          : 'text-text-secondary hover:bg-surface-card hover:text-text-primary border border-transparent'
      }`}
    >
      {/* File Icon */}
      {categoryIcons[document.category] || <FileText className="w-4 h-4 text-text-muted" />}

      {/* Document Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="truncate font-medium">{document.title}</div>
        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
          <span>{document.documentId}</span>
          <span>•</span>
          <span>{formatDate(document.updatedAt)}</span>
        </div>
      </div>

      {/* Status & Version */}
      <div className="flex items-center gap-2 flex-none">
        {getStatusBadge(document.status)}
        <span className="text-xs text-text-muted">v{document.version}</span>
      </div>

      {/* Hover Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 text-text-muted hover:text-text-primary hover:bg-surface rounded">
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </button>
  );
}

// ============================================
// Exports
// ============================================

export { getStatusBadge, getCategoryBadge, formatDate, getFileIcon };
