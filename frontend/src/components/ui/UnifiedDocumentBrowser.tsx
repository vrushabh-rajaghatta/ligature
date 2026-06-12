

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Eye,
  Download,
  ExternalLink,
  Clock,
  User,
  Calendar,
  Tag,
  MoreHorizontal,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Check,
  AlertCircle,
  FileCheck,
  FileClock,
  FileX,
  Building2,
  Shield,
  Beaker,
} from 'lucide-react';
import { Badge } from './Badge';
import { Button, IconButton } from './Button';
import { SearchInput } from './Input';
import { EmptyState } from './EmptyState';
import type { BadgeColor } from './Badge';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentStatus = 
  | 'draft'
  | 'pending-review'
  | 'approved'
  | 'effective'
  | 'superseded'
  | 'archived'
  | 'expired';

export type DocumentCategory =
  | 'regulatory'
  | 'clinical'
  | 'quality'
  | 'safety'
  | 'manufacturing'
  | 'labeling'
  | 'correspondence';

export interface DocumentItem {
  id: string;
  title: string;
  documentNumber?: string;
  version?: string;
  status: DocumentStatus;
  category: DocumentCategory;
  effectiveDate?: string;
  expirationDate?: string;
  author?: string;
  owner?: string;
  lastModified: string;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'xml' | 'other';
  fileSize?: string;
  tags?: string[];
  parentId?: string | null;
  path?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  documentCount?: number;
  icon?: React.ReactNode;
  color?: string;
}

export interface UnifiedDocumentBrowserProps {
  documents: DocumentItem[];
  folders?: DocumentFolder[];
  title?: string;
  description?: string;
  onDocumentSelect?: (doc: DocumentItem) => void;
  onDocumentView?: (doc: DocumentItem) => void;
  onDocumentDownload?: (doc: DocumentItem) => void;
  onFolderSelect?: (folder: DocumentFolder) => void;
  selectedDocumentId?: string | null;
  selectedFolderId?: string | null;
  showFolderTree?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  allowMultiSelect?: boolean;
  viewMode?: 'list' | 'grid' | 'tree';
  className?: string;
  emptyStateMessage?: string;
  loading?: boolean;
  customActions?: (doc: DocumentItem) => React.ReactNode;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const statusConfig: Record<DocumentStatus, { label: string; color: BadgeColor; icon: React.ReactNode }> = {
  'draft': { label: 'Draft', color: 'slate', icon: <FileClock className="w-3.5 h-3.5" /> },
  'pending-review': { label: 'Pending Review', color: 'amber', icon: <Clock className="w-3.5 h-3.5" /> },
  'approved': { label: 'Approved', color: 'blue', icon: <FileCheck className="w-3.5 h-3.5" /> },
  'effective': { label: 'Effective', color: 'emerald', icon: <Check className="w-3.5 h-3.5" /> },
  'superseded': { label: 'Superseded', color: 'purple', icon: <FileText className="w-3.5 h-3.5" /> },
  'archived': { label: 'Archived', color: 'gray', icon: <FileX className="w-3.5 h-3.5" /> },
  'expired': { label: 'Expired', color: 'red', icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const categoryConfig: Record<DocumentCategory, { label: string; color: string; icon: React.ReactNode }> = {
  'regulatory': { label: 'Regulatory', color: 'text-amber-400', icon: <Shield className="w-4 h-4" /> },
  'clinical': { label: 'Clinical', color: 'text-emerald-400', icon: <Beaker className="w-4 h-4" /> },
  'quality': { label: 'Quality', color: 'text-teal-400', icon: <FileCheck className="w-4 h-4" /> },
  'safety': { label: 'Safety', color: 'text-red-400', icon: <AlertCircle className="w-4 h-4" /> },
  'manufacturing': { label: 'Manufacturing', color: 'text-blue-400', icon: <Building2 className="w-4 h-4" /> },
  'labeling': { label: 'Labeling', color: 'text-purple-400', icon: <Tag className="w-4 h-4" /> },
  'correspondence': { label: 'Correspondence', color: 'text-cyan-400', icon: <FileText className="w-4 h-4" /> },
};

const fileTypeIcons: Record<string, string> = {
  'pdf': '📄',
  'docx': '📝',
  'xlsx': '📊',
  'xml': '📋',
  'other': '📁',
};

// ============================================================================
// FOLDER TREE COMPONENT
// ============================================================================

interface FolderTreeProps {
  folders: DocumentFolder[];
  selectedFolderId: string | null;
  onFolderSelect: (folder: DocumentFolder) => void;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
}

function FolderTree({ folders, selectedFolderId, onFolderSelect, expandedFolders, onToggleExpand }: FolderTreeProps) {
  const rootFolders = folders.filter(f => !f.parentId);
  
  const handleKeyDown = (e: React.KeyboardEvent, folder: DocumentFolder, hasChildren: boolean) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFolderSelect(folder);
    } else if (e.key === 'ArrowRight' && hasChildren) {
      e.preventDefault();
      if (!expandedFolders.has(folder.id)) {
        onToggleExpand(folder.id);
      }
    } else if (e.key === 'ArrowLeft' && hasChildren) {
      e.preventDefault();
      if (expandedFolders.has(folder.id)) {
        onToggleExpand(folder.id);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Focus next folder
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Focus previous folder
    }
  };
  
  const renderFolder = (folder: DocumentFolder, depth: number = 0) => {
    const children = folders.filter(f => f.parentId === folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    
    return (
      <div key={folder.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
        <button
          onClick={() => onFolderSelect(folder)}
          onKeyDown={(e) => handleKeyDown(e, folder, hasChildren)}
          tabIndex={0}
          aria-label={`${folder.name}${folder.documentCount !== undefined ? `, ${folder.documentCount} documents` : ''}`}
          className={`
            w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors
            ${isSelected 
              ? 'bg-accent-blue/20 text-accent-blue' 
              : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
            }
            focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:ring-inset
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              aria-label={isExpanded ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
              className="p-0.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-4" aria-hidden="true" />}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-400" aria-hidden="true" />
          ) : (
            <Folder className="w-4 h-4 text-amber-400" aria-hidden="true" />
          )}
          <span className="truncate flex-1 text-left">{folder.name}</span>
          {folder.documentCount !== undefined && (
            <span className="text-xs text-text-muted" aria-hidden="true">{folder.documentCount}</span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <div role="group">
            {children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-0.5" role="tree" aria-label="Folder navigation">
      {rootFolders.map(folder => renderFolder(folder))}
    </div>
  );
}

// ============================================================================
// DOCUMENT ROW COMPONENT (List View)
// ============================================================================

interface DocumentRowProps {
  document: DocumentItem;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onDownload: () => void;
  customActions?: React.ReactNode;
}

function DocumentRow({ document, isSelected, onSelect, onView, onDownload, customActions }: DocumentRowProps) {
  const status = statusConfig[document.status];
  const category = categoryConfig[document.category];
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      onSelect();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Focus next document
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Focus previous document
    }
  };
  
  return (
    <div
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={`
        group flex items-center gap-4 px-4 py-3 border-b border-border cursor-pointer transition-colors
        ${isSelected 
          ? 'bg-accent-blue/10 border-l-2 border-l-accent-blue' 
          : 'hover:bg-surface-card border-l-2 border-l-transparent'
        }
        focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:ring-inset
      `}
    >
      {/* File Icon */}
      <div className="text-2xl flex-shrink-0" aria-hidden="true">
        {fileTypeIcons[document.fileType] || fileTypeIcons.other}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">{document.title}</span>
          {document.version && (
            <span className="text-xs text-text-muted">v{document.version}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          {document.documentNumber && (
            <span className="font-mono">{document.documentNumber}</span>
          )}
          <span className={category.color}>{category.label}</span>
          {document.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" aria-hidden="true" />
              {document.author}
            </span>
          )}
        </div>
      </div>
      
      {/* Status Badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge color={status.color} size="sm" icon={status.icon}>
          <span className="sr-only">Status: </span>{status.label}
        </Badge>
      </div>
      
      {/* Date */}
      <div className="text-xs text-text-muted flex-shrink-0 w-24 text-right">
        <span className="sr-only">Last modified: </span>
        {new Date(document.lastModified).toLocaleDateString()}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
        <IconButton
          icon={<Eye className="w-4 h-4" />}
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          label="View"
        />
        <IconButton
          icon={<Download className="w-4 h-4" />}
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          label="Download"
        />
        {customActions}
      </div>
    </div>
  );
}

// ============================================================================
// DOCUMENT CARD COMPONENT (Grid View)
// ============================================================================

interface DocumentCardProps {
  document: DocumentItem;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onDownload: () => void;
}

function DocumentCard({ document, isSelected, onSelect, onView, onDownload }: DocumentCardProps) {
  const status = statusConfig[document.status];
  const category = categoryConfig[document.category];
  
  return (
    <div
      onClick={onSelect}
      className={`
        group p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'bg-accent-blue/10 border-accent-blue ring-2 ring-accent-blue/30' 
          : 'bg-surface-card border-border hover:border-border-hover hover:shadow-md'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="text-3xl">{fileTypeIcons[document.fileType] || fileTypeIcons.other}</div>
        <Badge color={status.color} size="xs">{status.label}</Badge>
      </div>
      
      {/* Title */}
      <h4 className="font-medium text-text-primary text-sm line-clamp-2 mb-1">
        {document.title}
      </h4>
      
      {/* Meta */}
      <div className="text-xs text-text-muted space-y-1">
        {document.documentNumber && (
          <div className="font-mono">{document.documentNumber}</div>
        )}
        <div className={`flex items-center gap-1 ${category?.color ?? ''}`}>
          {category.icon}
          {category.label}
        </div>
        {document.version && <div>Version {document.version}</div>}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs text-text-muted">
          {new Date(document.lastModified).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            icon={<Eye className="w-3.5 h-3.5" />}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            label="View"
          />
          <IconButton
            icon={<Download className="w-3.5 h-3.5" />}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            label="Download"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL PANEL COMPONENT
// ============================================================================

interface DocumentDetailPanelProps {
  document: DocumentItem;
  onView: () => void;
  onDownload: () => void;
  customActions?: React.ReactNode;
}

function DocumentDetailPanel({ document, onView, onDownload, customActions }: DocumentDetailPanelProps) {
  const status = statusConfig[document.status];
  const category = categoryConfig[document.category];
  
  return (
    <div className="h-full flex flex-col bg-surface-elevated border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="text-4xl">{fileTypeIcons[document.fileType] || fileTypeIcons.other}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary text-sm">{document.title}</h3>
            {document.documentNumber && (
              <p className="text-xs text-text-muted font-mono mt-0.5">{document.documentNumber}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Badge color={status.color} size="sm" icon={status.icon}>
            {status.label}
          </Badge>
          <span className={`text-xs px-2 py-0.5 rounded ${category?.color ?? ''} bg-current/10`}>
            {category.label}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Version */}
        {document.version && (
          <DetailRow label="Version" value={document.version} />
        )}
        
        {/* Dates */}
        <DetailRow 
          label="Last Modified" 
          value={new Date(document.lastModified).toLocaleDateString()} 
        />
        {document.effectiveDate && (
          <DetailRow 
            label="Effective Date" 
            value={new Date(document.effectiveDate).toLocaleDateString()} 
          />
        )}
        {document.expirationDate && (
          <DetailRow 
            label="Expiration Date" 
            value={new Date(document.expirationDate).toLocaleDateString()} 
          />
        )}
        
        {/* People */}
        {document.author && <DetailRow label="Author" value={document.author} />}
        {document.owner && <DetailRow label="Owner" value={document.owner} />}
        
        {/* File Info */}
        <DetailRow label="File Type" value={document.fileType.toUpperCase()} />
        {document.fileSize && <DetailRow label="File Size" value={document.fileSize} />}
        
        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Tags</div>
            <div className="flex flex-wrap gap-1">
              {document.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-surface-card border border-border rounded-full text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Metadata */}
        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Metadata</div>
            <div className="space-y-2">
              {Object.entries(document.metadata).map(([key, value]) => (
                <DetailRow key={key} label={key} value={String(value)} />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button variant="primary" fullWidth icon={<Eye className="w-4 h-4" />} onClick={onView}>
          View Document
        </Button>
        <Button variant="secondary" fullWidth icon={<Download className="w-4 h-4" />} onClick={onDownload}>
          Download
        </Button>
        {customActions}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-text-primary">{value}</div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnifiedDocumentBrowser({
  documents,
  folders = [],
  title = 'Documents',
  description,
  onDocumentSelect,
  onDocumentView,
  onDocumentDownload,
  onFolderSelect,
  selectedDocumentId = null,
  selectedFolderId = null,
  showFolderTree = true,
  showFilters = true,
  showSearch = true,
  allowMultiSelect = false,
  viewMode: initialViewMode = 'list',
  className = '',
  emptyStateMessage = 'No documents found',
  loading = false,
  customActions,
}: UnifiedDocumentBrowserProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(initialViewMode === 'tree' ? 'list' : initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [sortField, setSortField] = useState<'title' | 'lastModified' | 'status'>('lastModified');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [internalSelectedFolderId, setInternalSelectedFolderId] = useState<string | null>(selectedFolderId);

  // Use external or internal folder selection
  const activeFolderId = selectedFolderId ?? internalSelectedFolderId;

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];
    
    // Filter by folder
    if (activeFolderId) {
      result = result.filter(d => d.parentId === activeFolderId);
    }
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.documentNumber?.toLowerCase().includes(q) ||
        d.author?.toLowerCase().includes(q) ||
        d.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(d => d.category === categoryFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'lastModified':
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [documents, activeFolderId, searchQuery, statusFilter, categoryFilter, sortField, sortDirection]);

  // Selected document
  const selectedDocument = useMemo(() => 
    documents.find(d => d.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  // Handlers
  const handleFolderSelect = useCallback((folder: DocumentFolder) => {
    setInternalSelectedFolderId(folder.id);
    onFolderSelect?.(folder);
  }, [onFolderSelect]);

  const handleToggleFolderExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleDocumentSelect = useCallback((doc: DocumentItem) => {
    onDocumentSelect?.(doc);
  }, [onDocumentSelect]);

  const handleDocumentView = useCallback((doc: DocumentItem) => {
    onDocumentView?.(doc);
  }, [onDocumentView]);

  const handleDocumentDownload = useCallback((doc: DocumentItem) => {
    onDocumentDownload?.(doc);
  }, [onDocumentDownload]);

  const toggleSort = useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // Active filter count
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0);

  return (
    <div className={`flex h-full bg-surface ${className}`}>
      {/* Folder Tree Sidebar */}
      {showFolderTree && folders.length > 0 && (
        <div className="w-64 border-r border-border flex flex-col bg-surface-elevated">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
          </div>
          <div className="flex-1 overflow-auto p-2">
            <FolderTree
              folders={folders}
              selectedFolderId={activeFolderId}
              onFolderSelect={handleFolderSelect}
              expandedFolders={expandedFolders}
              onToggleExpand={handleToggleFolderExpand}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border bg-surface-elevated flex items-center gap-3">
          {/* Search */}
          {showSearch && (
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents"
              className="w-64"
            />
          )}

          {/* Filters */}
          {showFilters && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
                aria-label="Filter by status"
                className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              >
                <option value="all">All Statuses</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory | 'all')}
                aria-label="Filter by category"
                className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              >
                <option value="all">All Categories</option>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="text-xs text-accent-blue hover:underline"
                >
                  Clear ({activeFilterCount})
                </button>
              )}
            </>
          )}

          <div className="flex-1" />

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-card rounded-lg border border-border p-0.5" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${
                viewMode === 'list' ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <List className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">List view</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${
                viewMode === 'grid' ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Grid3X3 className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Grid view</span>
            </button>
          </div>

          {/* Sort */}
          <button
            onClick={() => toggleSort('lastModified')}
            aria-label={`Sort by date ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 rounded"
          >
            {sortDirection === 'asc' ? <SortAsc className="w-4 h-4" aria-hidden="true" /> : <SortDesc className="w-4 h-4" aria-hidden="true" />}
            <span className="sr-only">Sort by date</span>
            Sort
          </button>

          {/* Count */}
          <span className="text-xs text-text-muted" aria-live="polite">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Document List/Grid */}
        <div className="flex-1 flex overflow-hidden">
          <div className={`flex-1 overflow-auto ${selectedDocument ? 'border-r border-border' : ''}`}>
            {filteredDocuments.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  type="no-results"
                  title={emptyStateMessage}
                  description={searchQuery ? 'Try adjusting your search or filters' : undefined}
                />
              </div>
            ) : viewMode === 'list' ? (
              <div role="listbox" aria-label="Documents list">
                {filteredDocuments.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    isSelected={doc.id === selectedDocumentId}
                    onSelect={() => handleDocumentSelect(doc)}
                    onView={() => handleDocumentView(doc)}
                    onDownload={() => handleDocumentDownload(doc)}
                    customActions={customActions?.(doc)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" role="listbox" aria-label="Documents grid">
                {filteredDocuments.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    isSelected={doc.id === selectedDocumentId}
                    onSelect={() => handleDocumentSelect(doc)}
                    onView={() => handleDocumentView(doc)}
                    onDownload={() => handleDocumentDownload(doc)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedDocument && (
            <div className="w-80 flex-shrink-0">
              <DocumentDetailPanel
                document={selectedDocument}
                onView={() => handleDocumentView(selectedDocument)}
                onDownload={() => handleDocumentDownload(selectedDocument)}
                customActions={customActions?.(selectedDocument)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { statusConfig, categoryConfig, fileTypeIcons };
