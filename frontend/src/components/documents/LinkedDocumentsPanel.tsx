

// ============================================================================
// LinkedDocumentsPanel - v172: Cross-Module Document Links UI
// ============================================================================
// Reusable panel/drawer component for displaying and managing document links
// across all modules. Provides consistent UI for viewing, creating, and
// navigating document relationships.
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  Link2,
  ExternalLink,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  FileText,
  FolderArchive,
  Shield,
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  FlaskConical,
  BookOpen,
  Send,
  Filter,
  Search,
  RefreshCw,
  Trash2,
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  MoreVertical,
} from 'lucide-react';
import {
  useDocumentLinkStore,
  type DocumentLink,
  type LinkableModule,
  type LinkType,
  type LinkStatus,
} from '@/store/useDocumentLinkStore';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import type { BadgeColor } from '@/components/ui/Badge';

// ============================================================================
// TYPES
// ============================================================================

interface LinkedDocumentsPanelProps {
  // Current document context
  module: LinkableModule;
  documentId: string;
  documentTitle?: string;
  
  // Display options
  mode?: 'panel' | 'drawer' | 'inline';
  direction?: 'outgoing' | 'incoming' | 'both';
  showCreateButton?: boolean;
  showFilters?: boolean;
  maxHeight?: string;
  
  // Callbacks
  onNavigateToDocument?: (module: LinkableModule, documentId: string) => void;
  onCreateLink?: () => void;
  onClose?: () => void;
}

interface LinkGroupProps {
  title: string;
  links: DocumentLink[];
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (module: LinkableModule, documentId: string) => void;
  onDelete: (linkId: string) => void;
  currentModule: LinkableModule;
  currentDocumentId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_ICONS: Record<LinkableModule, React.ReactNode> = {
  tmf: <FolderArchive className="w-4 h-4" />,
  ectd: <Send className="w-4 h-4" />,
  safety: <AlertTriangle className="w-4 h-4" />,
  haq: <HelpCircle className="w-4 h-4" />,
  qms: <ClipboardList className="w-4 h-4" />,
  ctms: <FlaskConical className="w-4 h-4" />,
  authoring: <BookOpen className="w-4 h-4" />,
  publishing: <FileText className="w-4 h-4" />,
};

const MODULE_LABELS: Record<LinkableModule, string> = {
  tmf: 'Trial Master File',
  ectd: 'eCTD Submission',
  safety: 'Safety/PV',
  haq: 'HAQ Response',
  qms: 'Quality Management',
  ctms: 'Clinical Trials',
  authoring: 'Document Authoring',
  publishing: 'Publishing',
};

const MODULE_COLORS: Record<LinkableModule, BadgeColor> = {
  tmf: 'purple',
  ectd: 'blue',
  safety: 'red',
  haq: 'amber',
  qms: 'teal',
  ctms: 'emerald',
  authoring: 'slate',
  publishing: 'orange',
};

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  'tmf-to-ectd': 'TMF → eCTD',
  'ectd-to-tmf': 'eCTD → TMF',
  'safety-to-clinical': 'Safety → Clinical',
  'clinical-to-safety': 'Clinical → Safety',
  'haq-to-source': 'HAQ → Source',
  'source-to-haq': 'Source → HAQ',
  'qms-to-trial': 'QMS → Trial',
  'trial-to-qms': 'Trial → QMS',
  'reference': 'Reference',
  'supersedes': 'Supersedes',
  'derives-from': 'Derived From',
  'supports': 'Supports',
};

const STATUS_COLORS: Record<LinkStatus, BadgeColor> = {
  active: 'emerald',
  pending: 'amber',
  broken: 'red',
  archived: 'slate',
};

const STATUS_ICONS: Record<LinkStatus, React.ReactNode> = {
  active: <CheckCircle2 className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
  broken: <XCircle className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
};

// ============================================================================
// LINK GROUP COMPONENT
// ============================================================================

function LinkGroup({
  title,
  links,
  isExpanded,
  onToggle,
  onNavigate,
  onDelete,
  currentModule,
  currentDocumentId,
}: LinkGroupProps) {
  if (links.length === 0) return null;
  
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {title}
          </span>
        </div>
        <Badge color="slate" size="sm">
          {links.length}
        </Badge>
      </button>
      
      {isExpanded && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {links.map((link) => {
            // Determine which end of the link to show
            const isSource = link.sourceModule === currentModule && link.sourceId === currentDocumentId;
            const targetModule = isSource ? link.targetModule : link.sourceModule;
            const targetId = isSource ? link.targetId : link.sourceId;
            const targetTitle = isSource ? link.targetTitle : link.sourceTitle;
            const targetVersion = isSource ? link.targetVersion : link.sourceVersion;
            
            return (
              <div
                key={link.id}
                className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-500">
                        {MODULE_ICONS[targetModule]}
                      </span>
                      <button
                        onClick={() => onNavigate(targetModule, targetId)}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {targetTitle}
                      </button>
                      {targetVersion && (
                        <Badge color="slate" size="sm">
                          v{targetVersion}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Badge color={MODULE_COLORS[targetModule]} size="sm">
                        {MODULE_LABELS[targetModule]}
                      </Badge>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {STATUS_ICONS[link.status]}
                        {link.status}
                      </span>
                      {link.direction === 'bidirectional' && (
                        <>
                          <span>•</span>
                          <ArrowLeftRight className="w-3 h-3" />
                        </>
                      )}
                    </div>
                    
                    {link.context?.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {link.context.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => onNavigate(targetModule, targetId)}
                      className="text-slate-400 hover:text-blue-500"
                      title="Open document"
                      label="Open"
                    />
                    <IconButton
                      icon={<Trash2 className="w-3 h-3" />}
                      onClick={() => onDelete(link.id)}
                      className="text-slate-400 hover:text-red-500"
                      title="Remove link"
                      label="Delete"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LinkedDocumentsPanel({
  module,
  documentId,
  documentTitle,
  mode = 'panel',
  direction = 'both',
  showCreateButton = true,
  showFilters = true,
  maxHeight = '400px',
  onNavigateToDocument,
  onCreateLink,
  onClose,
}: LinkedDocumentsPanelProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModules, setSelectedModules] = useState<LinkableModule[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<LinkStatus[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['outgoing', 'incoming']));
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  
  // Store
  const getLinksFromSource = useDocumentLinkStore(state => state.getLinksFromSource);
  const getLinksToTarget = useDocumentLinkStore(state => state.getLinksToTarget);
  const deleteLink = useDocumentLinkStore(state => state.deleteLink);
  
  // Get links
  const outgoingLinks = useMemo(() => {
    if (direction === 'incoming') return [];
    return getLinksFromSource(module, documentId);
  }, [module, documentId, direction, getLinksFromSource]);
  
  const incomingLinks = useMemo(() => {
    if (direction === 'outgoing') return [];
    return getLinksToTarget(module, documentId);
  }, [module, documentId, direction, getLinksToTarget]);
  
  // Filter links
  const filterLinks = useCallback((links: DocumentLink[]) => {
    return links.filter(link => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!link.sourceTitle.toLowerCase().includes(query) &&
            !link.targetTitle.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Module filter
      if (selectedModules.length > 0) {
        if (!selectedModules.includes(link.sourceModule) &&
            !selectedModules.includes(link.targetModule)) {
          return false;
        }
      }
      
      // Status filter
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(link.status)) {
          return false;
        }
      }
      
      return true;
    });
  }, [searchQuery, selectedModules, selectedStatuses]);
  
  const filteredOutgoing = useMemo(() => filterLinks(outgoingLinks), [outgoingLinks, filterLinks]);
  const filteredIncoming = useMemo(() => filterLinks(incomingLinks), [incomingLinks, filterLinks]);
  
  const totalLinks = filteredOutgoing.length + filteredIncoming.length;
  
  // Handlers
  const handleToggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };
  
  const handleNavigate = (targetModule: LinkableModule, targetId: string) => {
    onNavigateToDocument?.(targetModule, targetId);
  };
  
  const handleDelete = (linkId: string) => {
    if (confirm('Remove this document link?')) {
      deleteLink(linkId);
    }
  };
  
  const handleToggleModuleFilter = (mod: LinkableModule) => {
    setSelectedModules(prev => 
      prev.includes(mod) 
        ? prev.filter(m => m !== mod)
        : [...prev, mod]
    );
  };
  
  const handleToggleStatusFilter = (status: LinkStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedModules([]);
    setSelectedStatuses([]);
  };
  
  // Group links by target module for better organization
  const groupedOutgoing = useMemo(() => {
    const groups: Record<LinkableModule, DocumentLink[]> = {
      tmf: [], ectd: [], safety: [], haq: [], qms: [], ctms: [], authoring: [], publishing: [],
    };
    filteredOutgoing.forEach(link => {
      groups[link.targetModule].push(link);
    });
    return groups;
  }, [filteredOutgoing]);
  
  const groupedIncoming = useMemo(() => {
    const groups: Record<LinkableModule, DocumentLink[]> = {
      tmf: [], ectd: [], safety: [], haq: [], qms: [], ctms: [], authoring: [], publishing: [],
    };
    filteredIncoming.forEach(link => {
      groups[link.sourceModule].push(link);
    });
    return groups;
  }, [filteredIncoming]);
  
  // Render
  const containerClass = mode === 'drawer' 
    ? 'fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col'
    : mode === 'inline'
    ? 'w-full'
    : 'w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700';
  
  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            Linked Documents
          </h3>
          <Badge color="blue" size="sm">{totalLinks}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {showFilters && (
            <IconButton
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={showFiltersPanel ? 'text-blue-500' : 'text-slate-400'}
              title="Toggle filters"
              label="Filter"
            />
          )}
          {showCreateButton && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onCreateLink}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Link
            </Button>
          )}
          {mode === 'drawer' && onClose && (
            <IconButton
              icon={<X className="w-4 h-4" />}
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              title="Close panel"
              label="Close"
            />
          )}
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && showFiltersPanel && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search linked documents..."
          />
          
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
              Filter by Module
            </label>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(MODULE_LABELS) as LinkableModule[]).map(mod => (
                <button
                  key={mod}
                  onClick={() => handleToggleModuleFilter(mod)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedModules.includes(mod)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {MODULE_LABELS[mod]}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
              Filter by Status
            </label>
            <div className="flex flex-wrap gap-1">
              {(['active', 'pending', 'broken', 'archived'] as LinkStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => handleToggleStatusFilter(status)}
                  className={`px-2 py-1 text-xs rounded-full capitalize transition-colors ${
                    selectedStatuses.includes(status)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          {(selectedModules.length > 0 || selectedStatuses.length > 0 || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
      
      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: mode === 'drawer' ? undefined : maxHeight }}
      >
        {totalLinks === 0 ? (
          <EmptyState
            icon={<Link2 className="w-12 h-12" />}
            title="No linked documents"
            description={
              searchQuery || selectedModules.length > 0 || selectedStatuses.length > 0
                ? "No documents match your current filters."
                : "This document has no links to other documents yet."
            }
            action={
              showCreateButton && !searchQuery ? (
                <Button variant="secondary" size="sm" onClick={onCreateLink}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create First Link
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Outgoing Links */}
            {direction !== 'incoming' && filteredOutgoing.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <ArrowRight className="w-4 h-4" />
                  <span>Outgoing Links ({filteredOutgoing.length})</span>
                </div>
                <div className="space-y-2">
                  {(Object.keys(groupedOutgoing) as LinkableModule[]).map(mod => (
                    groupedOutgoing[mod].length > 0 && (
                      <LinkGroup
                        key={`outgoing-${mod}`}
                        title={MODULE_LABELS[mod]}
                        links={groupedOutgoing[mod]}
                        isExpanded={expandedGroups.has(`outgoing-${mod}`)}
                        onToggle={() => handleToggleGroup(`outgoing-${mod}`)}
                        onNavigate={handleNavigate}
                        onDelete={handleDelete}
                        currentModule={module}
                        currentDocumentId={documentId}
                      />
                    )
                  ))}
                </div>
              </div>
            )}
            
            {/* Incoming Links */}
            {direction !== 'outgoing' && filteredIncoming.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Incoming Links ({filteredIncoming.length})</span>
                </div>
                <div className="space-y-2">
                  {(Object.keys(groupedIncoming) as LinkableModule[]).map(mod => (
                    groupedIncoming[mod].length > 0 && (
                      <LinkGroup
                        key={`incoming-${mod}`}
                        title={MODULE_LABELS[mod]}
                        links={groupedIncoming[mod]}
                        isExpanded={expandedGroups.has(`incoming-${mod}`)}
                        onToggle={() => handleToggleGroup(`incoming-${mod}`)}
                        onNavigate={handleNavigate}
                        onDelete={handleDelete}
                        currentModule={module}
                        currentDocumentId={documentId}
                      />
                    )
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer Stats */}
      {totalLinks > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {filteredOutgoing.length} outgoing • {filteredIncoming.length} incoming
            </span>
            <span>
              {outgoingLinks.length + incomingLinks.length} total links
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT LINK BADGE (for inline use in tables/cards)
// ============================================================================

interface LinkedDocumentsBadgeProps {
  module: LinkableModule;
  documentId: string;
  onClick?: () => void;
}

export function LinkedDocumentsBadge({ module, documentId, onClick }: LinkedDocumentsBadgeProps) {
  const getLinksFromSource = useDocumentLinkStore(state => state.getLinksFromSource);
  const getLinksToTarget = useDocumentLinkStore(state => state.getLinksToTarget);
  
  const outgoing = getLinksFromSource(module, documentId);
  const incoming = getLinksToTarget(module, documentId);
  const total = outgoing.length + incoming.length;
  
  if (total === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
    >
      <Link2 className="w-3 h-3" />
      <span>{total}</span>
    </button>
  );
}

// ============================================================================
// LINK CREATION MODAL
// ============================================================================

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceModule: LinkableModule;
  sourceId: string;
  sourceTitle: string;
}

const LINK_TYPE_OPTIONS: { value: LinkType; label: string; description: string }[] = [
  { value: 'reference',      label: 'Reference',      description: 'Generic reference between documents' },
  { value: 'supports',       label: 'Supports',       description: 'This document provides supporting evidence' },
  { value: 'derives-from',   label: 'Derives From',   description: 'This document is derived from the target' },
  { value: 'supersedes',     label: 'Supersedes',     description: 'This document supersedes the target' },
  { value: 'haq-to-source',  label: 'HAQ → Source',  description: 'HAQ response cites this source document' },
  { value: 'safety-to-clinical', label: 'Safety → Clinical', description: 'Safety signal linked to trial data' },
  { value: 'tmf-to-ectd',   label: 'TMF → eCTD',    description: 'TMF artifact sourced to eCTD sequence' },
  { value: 'qms-to-trial',  label: 'QMS → Trial',   description: 'QMS deviation linked to trial event' },
];

export function CreateLinkModal({
  isOpen,
  onClose,
  sourceModule,
  sourceId,
  sourceTitle,
}: CreateLinkModalProps) {
  const createLink = useDocumentLinkStore(state => state.createLink);
  const [targetModule, setTargetModule] = useState<LinkableModule>('authoring');
  const [targetId, setTargetId] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('reference');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!targetId.trim() || !targetTitle.trim()) return;
    setIsSubmitting(true);
    try {
      createLink({
        sourceModule,
        sourceId,
        sourceType: sourceModule,
        sourceTitle,
        targetModule,
        targetId: targetId.trim(),
        targetType: targetModule,
        targetTitle: targetTitle.trim(),
        linkType,
        direction: 'forward',
        status: 'active',
        context: context.trim() || undefined,
        createdBy: 'current-user',
      });
      setTargetId('');
      setTargetTitle('');
      setContext('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [createLink, sourceModule, sourceId, sourceTitle, targetModule, targetId, targetTitle, linkType, context, onClose]);

  if (!isOpen) return null;

  const canSubmit = targetId.trim().length > 0 && targetTitle.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-surface-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-text-primary">Create Document Link</h3>
            <p className="text-xs text-text-muted mt-0.5">From: <span className="text-text-secondary">{sourceTitle}</span></p>
          </div>
          <IconButton icon={<X className="w-4 h-4" />} onClick={onClose} label="Close" className="text-text-muted hover:text-text-primary" />
        </div>

        <div className="p-5 space-y-4">
          {/* Target module */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Target Module</label>
            <select
              value={targetModule}
              onChange={e => setTargetModule(e.target.value as LinkableModule)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            >
              {(Object.keys(MODULE_LABELS) as LinkableModule[]).map(m => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
          </div>

          {/* Target ID */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Target Document ID</label>
            <input
              type="text"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              placeholder="e.g. DOC-2025-0042"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* Target title */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Target Document Title</label>
            <input
              type="text"
              value={targetTitle}
              onChange={e => setTargetTitle(e.target.value)}
              placeholder="Document title"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* Link type */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Link Type</label>
            <select
              value={linkType}
              onChange={e => setLinkType(e.target.value as LinkType)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            >
              {LINK_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
              ))}
            </select>
          </div>

          {/* Context (optional) */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Context <span className="normal-case font-normal">(optional)</span></label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Describe the relationship or rationale for this link..."
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Link'}
          </Button>
        </div>
      </div>
    </div>
  );
}
