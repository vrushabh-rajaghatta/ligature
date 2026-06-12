
import { useState } from 'react';
import { 
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { ECTDDocument, CTD_STRUCTURE, CTDNode, CTD_MODULES } from '@/types/ectd';

interface CTDTreeProps {
  documents: ECTDDocument[];
  onSelectDocument: (doc: ECTDDocument) => void;
  onOpenDocument: (doc: ECTDDocument) => void;
  selectedDocumentId?: string;
  viewMode?: 'sequence' | 'cumulative' | 'current' | 'lifecycle';
}

// Group documents by their section path
function groupDocumentsBySection(documents: ECTDDocument[]): Map<string, ECTDDocument[]> {
  const grouped = new Map<string, ECTDDocument[]>();
  
  documents.forEach(doc => {
    const section = doc.section || doc.module;
    if (!grouped.has(section)) {
      grouped.set(section, []);
    }
    grouped.get(section)!.push(doc);
  });
  
  return grouped;
}

// Check if a node or any of its children have documents
function nodeHasDocuments(node: CTDNode, docsBySection: Map<string, ECTDDocument[]>): boolean {
  if (docsBySection.has(node.id)) return true;
  if (node.children) {
    return node.children.some(child => nodeHasDocuments(child, docsBySection));
  }
  return false;
}

// Get documents for a node (considering partial matches like 3.2.P matching 3.2.P.2)
function getDocumentsForNode(nodeId: string, docsBySection: Map<string, ECTDDocument[]>): ECTDDocument[] {
  const docs: ECTDDocument[] = [];
  docsBySection.forEach((sectionDocs, sectionId) => {
    if (sectionId === nodeId || sectionId.startsWith(nodeId + '.')) {
      docs.push(...sectionDocs);
    }
  });
  return docs;
}

interface TreeNodeProps {
  node: CTDNode;
  depth: number;
  docsBySection: Map<string, ECTDDocument[]>;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onSelectDocument: (doc: ECTDDocument) => void;
  onOpenDocument: (doc: ECTDDocument) => void;
  selectedDocumentId?: string;
  moduleColor: string;
}

function TreeNode({
  node,
  depth,
  docsBySection,
  expandedNodes,
  onToggle,
  onSelectDocument,
  onOpenDocument,
  selectedDocumentId,
  moduleColor
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const directDocs = docsBySection.get(node.id) || [];
  const hasDocuments = nodeHasDocuments(node, docsBySection);
  
  // Filter children to only show those with documents
  const relevantChildren = node.children?.filter(child => nodeHasDocuments(child, docsBySection)) || [];
  
  if (!hasDocuments) return null;

  const getFileIcon = (fileType: ECTDDocument['fileType']) => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'xml': return '📋';
      case 'xpt': return '📊';
      default: return '📁';
    }
  };

  const getOperationBadge = (operation: ECTDDocument['operation']) => {
    const colors = {
      new: 'bg-accent-green/20 text-accent-green',
      replace: 'bg-accent-amber/20 text-accent-amber',
      append: 'bg-accent-blue/20 text-accent-blue',
      delete: 'bg-accent-red/20 text-accent-red',
    };
    return colors[operation];
  };

  return (
    <div>
      {/* Node Header */}
      <button
        onClick={() => onToggle(node.id)}
        className="w-full flex items-center gap-2 py-1.5 px-2 hover:bg-surface-elevated rounded transition-colors text-left"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {(hasChildren && relevantChildren.length > 0) || directDocs.length > 0 ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: moduleColor }} />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0" style={{ color: moduleColor }} />
        )}
        
        <span className="text-sm text-text-primary truncate">
          <span className="text-text-muted">{node.id}</span>
          <span className="mx-1.5">—</span>
          {node.name}
        </span>
        
        {directDocs.length > 0 && (
          <span className="text-xs text-text-muted bg-surface px-1.5 py-0.5 rounded flex-shrink-0">
            {directDocs.length}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div>
          {/* Direct documents */}
          {directDocs.map(doc => (
            <button
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              onDoubleClick={() => onOpenDocument(doc)}
              className={`w-full flex items-center gap-2 py-1.5 px-2 hover:bg-surface-elevated rounded transition-colors text-left ${
                selectedDocumentId === doc.id ? 'bg-accent-blue/10' : ''
              }`}
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              <span className="w-4" />
              <span className="text-base flex-shrink-0">{getFileIcon(doc.fileType)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">{doc.title}</div>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${getOperationBadge(doc.operation)}`}>
                {doc.operation}
              </span>
            </button>
          ))}
          
          {/* Child nodes */}
          {relevantChildren.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              docsBySection={docsBySection}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelectDocument={onSelectDocument}
              onOpenDocument={onOpenDocument}
              selectedDocumentId={selectedDocumentId}
              moduleColor={moduleColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CTDTree({ 
  documents, 
  onSelectDocument, 
  onOpenDocument,
  selectedDocumentId,
  viewMode = 'sequence'
}: CTDTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1', '2', '3', '5', '3.2', '3.2.P', '3.2.S', '5.3']));
  
  const docsBySection = groupDocumentsBySection(documents);
  
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Group documents by module first
  const docsByModule = new Map<string, ECTDDocument[]>();
  documents.forEach(doc => {
    if (!docsByModule.has(doc.module)) {
      docsByModule.set(doc.module, []);
    }
    docsByModule.get(doc.module)!.push(doc);
  });

  // View mode indicator colors
  const viewModeStyles = {
    sequence: { badge: 'bg-slate-500/20 text-slate-400', label: 'This Sequence' },
    cumulative: { badge: 'bg-accent-purple/20 text-accent-purple', label: 'Cumulative' },
    current: { badge: 'bg-accent-green/20 text-accent-green', label: 'Current State' },
    lifecycle: { badge: 'bg-accent-blue/20 text-accent-blue', label: 'Lifecycle View' },
  };

  return (
    <div className="space-y-1">
      {/* View mode indicator */}
      {viewMode !== 'sequence' && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${viewModeStyles[viewMode]?.badge}`}>
          <span className="font-medium">{viewModeStyles[viewMode]?.label}</span>
          <span className="text-xs opacity-75">
            {viewMode === 'cumulative' && '— Showing all documents submitted up to this sequence'}
            {viewMode === 'current' && '— Showing active documents after applying lifecycle operations'}
            {viewMode === 'lifecycle' && '— Showing document history with version tracking'}
          </span>
        </div>
      )}
      
      {['1', '2', '3', '4', '5'].map(moduleNum => {
        const moduleStructure = CTD_STRUCTURE[moduleNum];
        const moduleInfo = CTD_MODULES[moduleNum];
        const moduleDocs = docsByModule.get(moduleNum) || [];
        
        if (moduleDocs.length === 0) {
          // Show empty module as disabled
          return (
            <div 
              key={moduleNum} 
              className="flex items-center gap-2 py-2 px-2 opacity-40"
            >
              <span className="w-4" />
              <Folder className="w-5 h-5" style={{ color: moduleInfo.color }} />
              <span className="text-sm text-text-muted">
                Module {moduleNum} — {moduleInfo.name}
              </span>
            </div>
          );
        }

        const isExpanded = expandedNodes.has(moduleNum);

        return (
          <div key={moduleNum} className="bg-surface-card rounded-lg">
            {/* Module Header */}
            <button
              onClick={() => toggleNode(moduleNum)}
              className="w-full flex items-center gap-2 p-3 hover:bg-surface-elevated transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-5 h-5" style={{ color: moduleInfo.color }} />
              ) : (
                <Folder className="w-5 h-5" style={{ color: moduleInfo.color }} />
              )}
              <span className="text-sm font-medium text-text-primary">
                Module {moduleNum}
              </span>
              <span className="text-sm text-text-muted">— {moduleInfo.name}</span>
              <span className="ml-auto text-xs text-text-muted bg-surface px-2 py-0.5 rounded">
                {moduleDocs.length} docs
              </span>
            </button>

            {/* Module Content */}
            {isExpanded && moduleStructure.children && (
              <div className="border-t border-border py-1">
                {moduleStructure.children
                  .filter(child => nodeHasDocuments(child, docsBySection))
                  .map(child => (
                    <TreeNode
                      key={child.id}
                      node={child}
                      depth={1}
                      docsBySection={docsBySection}
                      expandedNodes={expandedNodes}
                      onToggle={toggleNode}
                      onSelectDocument={onSelectDocument}
                      onOpenDocument={onOpenDocument}
                      selectedDocumentId={selectedDocumentId}
                      moduleColor={moduleInfo.color}
                    />
                  ))
                }
                
                {/* Documents without specific section placement */}
                {moduleDocs.filter(d => !d.section || d.section === moduleNum).map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    onDoubleClick={() => onOpenDocument(doc)}
                    className={`w-full flex items-center gap-2 py-1.5 px-2 hover:bg-surface-elevated rounded transition-colors text-left ${
                      selectedDocumentId === doc.id ? 'bg-accent-blue/10' : ''
                    }`}
                    style={{ paddingLeft: '32px' }}
                  >
                    <span className="w-4" />
                    <span className="text-base">
                      {doc.fileType === 'pdf' ? '📄' : doc.fileType === 'xml' ? '📋' : doc.fileType === 'xpt' ? '📊' : '📁'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{doc.title}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      doc.operation === 'new' ? 'bg-accent-green/20 text-accent-green' :
                      doc.operation === 'replace' ? 'bg-accent-amber/20 text-accent-amber' :
                      doc.operation === 'append' ? 'bg-accent-blue/20 text-accent-blue' :
                      'bg-accent-red/20 text-accent-red'
                    }`}>
                      {doc.operation}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
