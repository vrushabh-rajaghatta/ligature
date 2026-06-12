
// =============================================================================
// eCTD VIEWER PANEL - v0.9.14
// =============================================================================
// Integrated eCTD document viewer with collapsible navigation tree and
// document preview. Combines CTDTree navigation with inline document viewing.
// =============================================================================


import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Folder,
  Eye,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import {
  useECTDPublishingStore,
  useDocumentList,
} from '@/store/useECTDPublishingStore';
import { CTD_MODULE_CONFIG, parseSectionNumber, type ECTDLeafDocument } from '@/store/ectd-publishing-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ECTDViewerPanelProps {
  sequenceId: string;
  initialDocumentId?: string;
  onClose?: () => void;
}

interface TreeNode {
  id: string;
  label: string;
  module: string;
  section: string;
  documents: ECTDLeafDocument[];
  children: TreeNode[];
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const MODULE_COLORS: Record<string, string> = {
  m1: 'border-purple-500 bg-purple-50',
  m2: 'border-blue-500 bg-blue-50',
  m3: 'border-green-500 bg-green-50',
  m4: 'border-amber-500 bg-amber-50',
  m5: 'border-red-500 bg-red-50',
};

function buildDocumentTree(documents: ECTDLeafDocument[]): TreeNode[] {
  const moduleMap = new Map<string, TreeNode>();
  
  // Group documents by module
  for (const doc of documents) {
    // Parse module from sectionId (e.g., "m1.1.2" → "m1")
    const { module } = doc.sectionId ? parseSectionNumber(doc.sectionId) : { module: 'm1' as const };
    
    if (!moduleMap.has(module)) {
      const config = CTD_MODULE_CONFIG[module as keyof typeof CTD_MODULE_CONFIG];
      moduleMap.set(module, {
        id: module,
        label: config?.title || `Module ${module.toUpperCase()}`,
        module,
        section: module,
        documents: [],
        children: [],
      });
    }
    
    const moduleNode = moduleMap.get(module)!;
    
    // Group by section within module
    const sectionId = doc.sectionId || 'unsectioned';
    let sectionNode = moduleNode.children.find(c => c.id === sectionId);
    
    if (!sectionNode) {
      sectionNode = {
        id: sectionId,
        label: doc.sectionId || 'Documents',
        module,
        section: sectionId,
        documents: [],
        children: [],
      };
      moduleNode.children.push(sectionNode);
    }
    
    sectionNode.documents.push(doc);
  }
  
  // Sort modules
  return Array.from(moduleMap.values()).sort((a, b) => a.module.localeCompare(b.module));
}

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

function TreeNodeItem({
  node,
  depth,
  expanded,
  onToggle,
  onSelectDocument,
  selectedDocumentId,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelectDocument: (doc: ECTDLeafDocument) => void;
  selectedDocumentId?: string;
}) {
  const isExpanded = expanded.has(node.id);
  const hasContent = node.documents.length > 0 || node.children.length > 0;
  const moduleColor = MODULE_COLORS[node.module] || 'border-gray-400 bg-gray-50';
  
  return (
    <div>
      <button
        onClick={() => hasContent && onToggle(node.id)}
        className={`
          w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm
          hover:bg-surface-hover rounded-md transition-colors
          ${depth === 0 ? 'font-medium' : ''}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasContent ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-content-tertiary flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-content-tertiary flex-shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        
        {depth === 0 ? (
          <FolderOpen className={`w-4 h-4 flex-shrink-0 ${isExpanded ? 'text-content-secondary' : 'text-content-tertiary'}`} />
        ) : (
          <Folder className="w-4 h-4 text-content-tertiary flex-shrink-0" />
        )}
        
        <span className={`truncate ${depth === 0 ? 'text-content-primary' : 'text-content-secondary'}`}>
          {node.label}
        </span>
        
        {(node.documents.length > 0 || node.children.length > 0) && (
          <span className="ml-auto text-xs text-content-tertiary">
            {node.documents.length + node.children.reduce((sum, c) => sum + c.documents.length, 0)}
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div>
          {/* Nested sections */}
          {node.children.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelectDocument={onSelectDocument}
              selectedDocumentId={selectedDocumentId}
            />
          ))}
          
          {/* Documents in this section */}
          {node.documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              className={`
                w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm
                hover:bg-surface-hover rounded-md transition-colors
                ${selectedDocumentId === doc.id ? 'bg-accent-blue/10 text-accent-blue' : ''}
              `}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{doc.title || doc.fileName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavigationPane({
  tree,
  expanded,
  onToggle,
  onSelectDocument,
  selectedDocumentId,
  searchQuery,
  onSearchChange,
  collapsed,
  onToggleCollapse,
}: {
  tree: TreeNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelectDocument: (doc: ECTDLeafDocument) => void;
  selectedDocumentId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  if (collapsed) {
    return (
      <div className="w-10 border-r border-subtle flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-surface-hover rounded-md"
          title="Expand navigation"
        >
          <ChevronRight className="w-4 h-4 text-content-secondary" />
        </button>
      </div>
    );
  }
  
  return (
    <div className="w-72 border-r border-subtle flex flex-col bg-surface-secondary/30">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-subtle">
        <span className="font-medium text-content-primary text-sm">Document Tree</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-surface-hover rounded"
          title="Collapse navigation"
        >
          <ChevronLeft className="w-4 h-4 text-content-tertiary" />
        </button>
      </div>
      
      {/* Search */}
      <div className="p-2 border-b border-subtle">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-primary border border-subtle rounded-md
                     focus:outline-none focus:border-accent-blue"
          />
        </div>
      </div>
      
      {/* Tree */}
      <div className="flex-1 overflow-auto p-2">
        {tree.map(node => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={onToggle}
            onSelectDocument={onSelectDocument}
            selectedDocumentId={selectedDocumentId}
          />
        ))}
        
        {tree.length === 0 && (
          <div className="text-center py-8 text-content-tertiary text-sm">
            No documents in this sequence
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentPreviewPane({
  document,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDownload,
  onOpenExternal,
}: {
  document: ECTDLeafDocument | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onDownload: () => void;
  onOpenExternal: () => void;
}) {
  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-secondary/20">
        <div className="text-center">
          <Eye className="w-12 h-12 mx-auto mb-3 text-content-tertiary opacity-50" />
          <p className="text-content-secondary">Select a document to preview</p>
          <p className="text-sm text-content-tertiary mt-1">
            Use the navigation tree on the left
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-subtle bg-surface-secondary/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-content-secondary" />
          <span className="font-medium text-content-primary text-sm truncate max-w-md">
            {document.title || document.fileName}
          </span>
          {document.operation && (
            <span className={`
              text-xs px-1.5 py-0.5 rounded
              ${document.operation === 'new' ? 'bg-green-100 text-green-700' : ''}
              ${document.operation === 'replace' ? 'bg-amber-100 text-amber-700' : ''}
              ${document.operation === 'append' ? 'bg-blue-100 text-blue-700' : ''}
              ${document.operation === 'delete' ? 'bg-red-100 text-red-700' : ''}
            `}>
              {document.operation}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="p-1.5 hover:bg-surface-hover rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-content-secondary" />
          </button>
          <span className="text-xs text-content-tertiary px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={onZoomIn}
            className="p-1.5 hover:bg-surface-hover rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-content-secondary" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1.5 hover:bg-surface-hover rounded"
            title="Reset zoom"
          >
            <RotateCcw className="w-4 h-4 text-content-secondary" />
          </button>
          <div className="w-px h-4 bg-subtle mx-1" />
          <button
            onClick={onDownload}
            className="p-1.5 hover:bg-surface-hover rounded"
            title="Download document"
          >
            <Download className="w-4 h-4 text-content-secondary" />
          </button>
          <button
            onClick={onOpenExternal}
            className="p-1.5 hover:bg-surface-hover rounded"
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4 text-content-secondary" />
          </button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-neutral-100 p-4">
        <div 
          className="mx-auto bg-white shadow-lg rounded"
          style={{ 
            width: `${zoom * 100}%`,
            maxWidth: '1200px',
            minHeight: '800px',
          }}
        >
          {/* Simulated document preview */}
          <div className="p-8">
            <div className="border-b pb-4 mb-6">
              <h1 className="text-xl font-semibold text-gray-800">
                {document.title || document.fileName}
              </h1>
              <div className="mt-2 text-sm text-gray-500 space-y-1">
                <p>File: {document.fileName}</p>
                <p>Section: {document.sectionId || 'N/A'}</p>
                {document.checksum && <p>Checksum: {document.checksum.substring(0, 16)}...</p>}
              </div>
            </div>
            
            {/* Placeholder content */}
            <div className="space-y-4 text-gray-600">
              <p className="text-sm italic text-gray-400">
                PDF preview would be rendered here using a PDF viewer library.
              </p>
              <div className="h-[600px] bg-gray-50 rounded border-2 border-dashed border-gray-200 
                            flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400">Document Preview</p>
                  <p className="text-xs text-gray-300 mt-1">{document.fileName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ECTDViewerPanel({
  sequenceId,
  initialDocumentId,
  onClose,
}: ECTDViewerPanelProps) {
  const documents = useDocumentList(sequenceId);
  
  // State
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>(initialDocumentId);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['m1', 'm2', 'm3', 'm4', 'm5']));
  const [searchQuery, setSearchQuery] = useState('');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Derived state
  const tree = useMemo(() => buildDocumentTree(documents), [documents]);
  const selectedDocument = documents.find(d => d.id === selectedDocId) || null;
  
  // Handlers
  const handleToggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleSelectDocument = useCallback((doc: ECTDLeafDocument) => {
    setSelectedDocId(doc.id);
  }, []);
  
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.25, 2));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - 0.25, 0.5));
  }, []);
  
  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);
  
  const handleDownload = useCallback(() => {
    if (selectedDocument) {
      // In production, this would trigger actual file download
      /* Download action */
    }
  }, [selectedDocument]);
  
  const handleOpenExternal = useCallback(() => {
    if (selectedDocument) {
      // In production, this would open in new window
      /* Open external action */
    }
  }, [selectedDocument]);
  
  return (
    <div className="h-full flex flex-col bg-surface-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-accent-blue" />
          <h2 className="font-semibold text-content-primary">eCTD Document Viewer</h2>
          <span className="text-sm text-content-tertiary">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-md"
          >
            <X className="w-5 h-5 text-content-secondary" />
          </button>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <NavigationPane
          tree={tree}
          expanded={expanded}
          onToggle={handleToggle}
          onSelectDocument={handleSelectDocument}
          selectedDocumentId={selectedDocId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed(!navCollapsed)}
        />
        
        <DocumentPreviewPane
          document={selectedDocument}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onDownload={handleDownload}
          onOpenExternal={handleOpenExternal}
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------

export type { ECTDViewerPanelProps };
