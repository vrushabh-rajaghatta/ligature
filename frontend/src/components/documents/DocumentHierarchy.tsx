
// Document Hierarchy Component - v148
// Expandable/collapsible tree view with Submission/Discipline toggle


import { useState, useMemo, useCallback } from 'react';
import { 
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText,
  Package, FlaskConical, FileCheck, AlertTriangle, Settings, FileStack
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { 
  ectdHierarchy, edmHierarchy, 
  mapDocumentToECTD, mapDocumentToEDM,
  type HierarchyView, type ECTDNode, type EDMNode 
} from '@/data/document-hierarchy';
import type { EnterpriseDocument } from '@/domains/document-control/contracts';

interface DocumentHierarchyProps {
  documents: EnterpriseDocument[];
  onDocumentSelect: (document: EnterpriseDocument) => void;
  selectedDocumentId?: string | null;
  productName?: string;
}

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

export function DocumentHierarchy({ 
  documents, 
  onDocumentSelect,
  selectedDocumentId,
  productName = 'Nexavant (LIG-2847)'
}: DocumentHierarchyProps) {
  const [hierarchyView, setHierarchyView] = useState<HierarchyView>('ectd');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'module-2', 'module-5', 'edm-clinical', 'edm-regulatory']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptyNodes, setShowEmptyNodes] = useState(false);
  
  const documentsByNode = useMemo(() => {
    const mapping: Record<string, EnterpriseDocument[]> = {};
    documents.forEach(doc => {
      const nodeIds = hierarchyView === 'ectd' 
        ? mapDocumentToECTD(doc.category, doc.title)
        : mapDocumentToEDM(doc.category, doc.title);
      nodeIds.forEach(nodeId => {
        if (!mapping[nodeId]) mapping[nodeId] = [];
        mapping[nodeId].push(doc);
      });
    });
    return mapping;
  }, [documents, hierarchyView]);
  
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
    collectIds(hierarchyView === 'ectd' ? ectdHierarchy : edmHierarchy);
    setExpandedNodes(allIds);
  };
  
  const collapseAll = () => setExpandedNodes(new Set(['root']));
  
  const hierarchy = hierarchyView === 'ectd' ? ectdHierarchy : edmHierarchy;
  
  // Filter based on search
  const matchesSearch = (doc: EnterpriseDocument) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return doc.title.toLowerCase().includes(q) || 
           doc.documentId.toLowerCase().includes(q) ||
           doc.category.toLowerCase().includes(q);
  };

  return (
    <div className="h-full flex flex-col bg-surface-elevated border-r border-border">
      <div className="flex-none p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Document Hierarchy</span>
          <div className="flex items-center gap-1">
            <button onClick={expandAll} className="p-1 text-text-muted hover:text-text-primary" title="Expand all">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button onClick={collapseAll} className="p-1 text-text-muted hover:text-text-primary" title="Collapse all">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3 p-1 bg-surface rounded-lg">
          <button
            onClick={() => setHierarchyView('ectd')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              hierarchyView === 'ectd' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
            title="eCTD Module Structure (M1-M5)"
          >
            Submission
          </button>
          <button
            onClick={() => setHierarchyView('edm')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              hierarchyView === 'edm' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
            title="DIA EDM Reference Model - By Functional Area"
          >
            Discipline
          </button>
        </div>
        
        <SearchInput 
          placeholder="Search documents..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-1">
          <button
            onClick={() => toggleNode('root')}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-lg bg-accent-blue/10 text-accent-blue font-medium"
          >
            {expandedNodes.has('root') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Package className="w-4 h-4" />
            <span className="flex-1 text-left truncate">{productName}</span>
            <Badge color="blue" size="xs">{documents.length}</Badge>
          </button>
          
          {expandedNodes.has('root') && (
            <div className="mt-1">
              {hierarchy.map(node => (
                <HierarchyNode
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
                  hierarchyView={hierarchyView}
                  searchQuery={searchQuery}
                  matchesSearch={matchesSearch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-none p-2 border-t border-border">
        <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-muted cursor-pointer hover:text-text-secondary">
          <input 
            type="checkbox" 
            checked={showEmptyNodes}
            onChange={(e) => setShowEmptyNodes(e.target.checked)}
            className="rounded border-border"
          />
          Show empty nodes
        </label>
      </div>
    </div>
  );
}

interface HierarchyNodeProps {
  node: ECTDNode | EDMNode;
  depth: number;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  documentsByNode: Record<string, EnterpriseDocument[]>;
  getNodeDocumentCount: (nodeId: string, children?: (ECTDNode | EDMNode)[]) => number;
  onDocumentSelect: (document: EnterpriseDocument) => void;
  selectedDocumentId?: string | null;
  showEmptyNodes: boolean;
  hierarchyView: HierarchyView;
  searchQuery: string;
  matchesSearch: (doc: EnterpriseDocument) => boolean;
}

function HierarchyNode({
  node, depth, expandedNodes, toggleNode, documentsByNode, getNodeDocumentCount,
  onDocumentSelect, selectedDocumentId, showEmptyNodes, hierarchyView, searchQuery, matchesSearch
}: HierarchyNodeProps) {
  const hasChildren = !!(node as any).children?.length;
  const allDocs = documentsByNode[node.id] || [];
  const documents = allDocs.filter(matchesSearch);
  const totalCount = getNodeDocumentCount(node.id, (node as any).children);
  const isExpanded = expandedNodes.has(node.id);
  
  if (!showEmptyNodes && totalCount === 0 && !hasChildren) return null;
  
  const isECTD = hierarchyView === 'ectd';
  const moduleLabel = isECTD ? (node as ECTDNode).module : null;
  
  return (
    <div className="ml-3">
      <button
        onClick={() => (hasChildren || documents.length > 0) && toggleNode(node.id)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-colors ${
          totalCount > 0 ? 'text-text-secondary hover:bg-surface-card hover:text-text-primary' : 'text-text-muted'
        }`}
      >
        {(hasChildren || documents.length > 0) ? (
          isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-none" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-none" />
        ) : (
          <span className="w-3.5 flex-none" />
        )}
        
        {isExpanded && (hasChildren || documents.length > 0) ? (
          <FolderOpen className="w-4 h-4 text-amber-400 flex-none" />
        ) : (
          <Folder className="w-4 h-4 text-text-muted flex-none" />
        )}
        
        {isECTD && moduleLabel && (
          <span className="text-xs text-text-muted w-10 flex-none">{moduleLabel}</span>
        )}
        
        <span className="flex-1 text-left truncate">{node.title}</span>
        
        {totalCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-surface text-text-muted">{totalCount}</span>
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-0.5">
          {hasChildren && (node as any).children.map((child: ECTDNode | EDMNode) => (
            <HierarchyNode
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
              hierarchyView={hierarchyView}
              searchQuery={searchQuery}
              matchesSearch={matchesSearch}
            />
          ))}
          
          {documents.length > 0 && (
            <div className="ml-3 mt-0.5 space-y-0.5">
              {documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentSelect(doc)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedDocumentId === doc.id
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
                  }`}
                >
                  <span className="w-3.5 flex-none" />
                  {categoryIcons[doc.category] || <FileText className="w-4 h-4 text-text-muted" />}
                  <span className="flex-1 text-left truncate">{doc.title}</span>
                  <span className="text-xs text-text-muted">v{doc.version}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
