

import { useState, useMemo, useEffect } from 'react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
// v112: Use enhanced StatCard from Card.tsx
// v126: Added Card, CardHeader, CardContent for full migration
import { StatCard, Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
// v116: Breadcrumb navigation
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ScrollFadeContainer } from '@/components/ui/ScrollFadeContainer';
// v126: Skeleton components for loading states
import { StatCardGridSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
// v149: Resizable panels (nav panel removed)
import { useResizablePanel, PANEL_PRESETS } from '@/hooks/useResizablePanel';
import {
  FileText, Search, Plus, ChevronRight, ChevronDown, Download, Eye, Edit, Clock,
  CheckCircle, AlertCircle, Share2, History, MoreHorizontal, Grid, List, ArrowUpDown,
  FileCheck, FileClock, FileX, Calendar, File, FileCode, FileSpreadsheet, Presentation,
  Archive, Star, Copy, Settings, RefreshCw, Filter, FolderOpen, Folder, FolderTree,
  Lock, Unlock, Tag, Users, GitBranch, Shield, Workflow, BookOpen, Layers, Database,
  Upload, Trash2, RotateCcw, Link2, X, Sparkles, Zap, GitCompare, ExternalLink,
  SlidersHorizontal, Inbox,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { LixInlineAlert } from '@/components/lix/LixPanel';
import { useLixAgent } from '@/hooks/useLixAgent';
import { useDocumentControlStore } from '@/store/useDocumentControlStore';
import { useDocumentControlPersistence } from '@/hooks/useDocumentControlPersistence';
import { useAuthoringDocBridge } from '@/hooks/useAuthoringDocBridge';
import { useQMSDocBridge } from '@/hooks/useQMSDocBridge';
import type { 
  EnterpriseDocument, DocumentStatus, DocumentCategory, FileFormat, DocumentControlView
} from '@/domains/document-control/contracts';
import { DOCUMENT_STATUS_LABELS, DOCUMENT_CATEGORY_LABELS } from '@/domains/document-control/contracts';
// v112: Cross-module navigation
import { useIncomingNavigation, DocumentControlViewMode } from '@/hooks/useModuleNavigation';
// v145: Document hierarchy and viewer components
import { DocumentHierarchy } from '@/components/documents/DocumentHierarchy';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
// v152: Multi-view modes (Grid, Submission, Discipline)
import { DocumentViewModeToggle, DocumentTreeView, type DocumentViewMode } from '@/components/documents/DocumentViewModes';
// v192: Enhanced Document Versioning
import { EnhancedDocumentVersioning } from './EnhancedDocumentVersioning';
// v0.13.41: Document Upload Panel
import { DocumentUploadPanel, type UploadResult, type UploadContext } from '@/components/documents/DocumentUploadPanel';
// v0.13.42: Upload to Document Service
import { createDocumentFromUpload, createDocumentsFromBatchUpload } from '@/services/upload-to-document-service';
// v0.13.43: Version Creation Wizard
import { VersionCreationWizard, type VersionCreationData } from '@/components/documents/VersionCreationWizard';
// v0.13.53: Approval Status in document list
import { ApprovalStatusIndicator } from '@/components/documents/ApprovalStatusIndicator';
import { getMockApprovalRequest, getMockApprovalRequestsForUser } from '@/lib/mock-approval-data';
import type { ApprovalRequest } from '@/types/approval';
// v0.13.55: Approval Queue Dashboard
import { ApprovalQueueDashboard } from '@/components/documents/ApprovalQueueDashboard';
import { currentUser } from '@/data/users-data';
// v0.15.0: Document Lineage Integration
import { CrossModulePresencePanel, DocumentLineageBadge, BulkUpdatePanel } from '@/components/documents/DocumentControlLineageIntegration';

// Badge utilities extracted to document-badges.tsx to break circular dep
import { getDocumentStatusBadge, getDocumentCategoryBadge, getClassificationBadge, getSecurityBadge, getArchiveStatusBadge, getReviewStatusBadge } from '@/components/documents/document-badges';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProductFilter } from '@/hooks/useProductFilter';
import { DocumentArtifactViewer, ArtifactDocumentList, MOCK_ARTIFACT_DOCUMENTS } from '@/components/documents/DocumentArtifactViewer';
import type { ArtifactDocument } from '@/components/documents/DocumentArtifactViewer';

// ============================================
// Types
// ============================================

type ListViewMode = 'list' | 'grid'; // For grid view internal toggle
type SortBy = 'title' | 'updatedAt' | 'status' | 'category';
type SearchScope = 'all' | 'metadata' | 'content' | 'tags';

interface FilterState {
  product?: string;
  therapeuticArea?: string;
  modality?: string;
  region?: string;
  stage?: string;
}

interface DocumentControlScreenProps {
  filters: FilterState;
}

// ============================================
// Helper Functions
// ============================================

const getFileIcon = (format: FileFormat): React.ReactNode => {
  const icons: Record<FileFormat, React.ReactNode> = {
    docx: <FileText className="w-4 h-4 text-accent-blue" />,
    pdf: <File className="w-4 h-4 text-red-400" />,
    xlsx: <FileSpreadsheet className="w-4 h-4 text-green-400" />,
    pptx: <Presentation className="w-4 h-4 text-orange-400" />,
    xml: <FileCode className="w-4 h-4 text-purple-400" />,
    json: <FileCode className="w-4 h-4 text-yellow-400" />,
    txt: <FileText className="w-4 h-4 text-slate-400" />,
    rtf: <FileText className="w-4 h-4 text-slate-400" />,
    html: <FileCode className="w-4 h-4 text-accent-teal" />,
    md: <FileText className="w-4 h-4 text-slate-300" />
  };
  return icons[format] || <FileText className="w-4 h-4 text-slate-400" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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

// v0.13.53: Get approval request for a document
// Uses mock data based on document status for demo purposes
const getDocumentApprovalRequest = (doc: EnterpriseDocument): ApprovalRequest | null => {
  // Map document status to mock approval scenarios
  switch (doc.status) {
    case 'pending-approval':
      return getMockApprovalRequest('in-progress');
    case 'in-review':
      // Show overdue for some documents to demonstrate escalation
      return doc.id.includes('5') || doc.id.includes('8') 
        ? getMockApprovalRequest('overdue')
        : getMockApprovalRequest('in-progress');
    case 'approved':
    case 'effective':
      return getMockApprovalRequest('approved');
    case 'draft':
      // Some drafts may have pending approval requests
      return doc.id.includes('3') ? getMockApprovalRequest('pending') : null;
    default:
      return null;
  }
};

// ============================================
// Main Component
// ============================================

export function DocumentControlScreen({ filters }: DocumentControlScreenProps) {
  // v152: Document view mode (grid/submission/discipline)
    const { deadClick } = useDeadClick();
  const { selectedProduct } = useProductFilter();
  const activeProductName = selectedProduct
    ? `${selectedProduct.brandName ?? selectedProduct.name} (${selectedProduct.name})`
    : 'Nexavant (LIG-2847)';
  const [documentViewMode, setDocumentViewMode] = useState<DocumentViewMode>('grid');
  const [listViewMode, setListViewMode] = useState<ListViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortDesc, setSortDesc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  // v0.125.32: Co-display artifact viewer state
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDocument>(MOCK_ARTIFACT_DOCUMENTS[0]);
  
  // v152: Hierarchy panel only visible in grid mode (tree views have built-in hierarchy)
  const [hierarchyVisible, setHierarchyVisible] = useState(true);
  const [viewingDocument, setViewingDocument] = useState<EnterpriseDocument | null>(null);
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
  
  // v149: Resizable panel widths with persistence (nav panel removed)
  const hierarchyPanel = useResizablePanel({
    ...PANEL_PRESETS.hierarchy,
    storageKey: 'doc-control-hierarchy',
  });
  const viewerPanel = useResizablePanel({
    ...PANEL_PRESETS.viewer,
    storageKey: 'doc-control-viewer',
  });
  
  // v0.13.41: Upload panel state
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  // v0.125.97: Track which approval request triggered the viewer (enables review mode)
  const [reviewingApprovalId, setReviewingApprovalId] = useState<string | null>(null);

  // v0.125.94: docFilters state — was missing, causing ReferenceError on mount
  const [docFilters, setDocFilters] = useState({
    program: '', application: '', status: '', category: '', owner: '', dateRange: '',
  });
  const setFilter = (key: keyof typeof docFilters, value: string) =>
    setDocFilters(prev => ({ ...prev, [key]: value }));
  const activeFilterCount = Object.values(docFilters).filter(Boolean).length;
  
  // v0.13.43: Version wizard state
  const [showVersionWizard, setShowVersionWizard] = useState(false);
  
  // v129: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    // v0.117.5: Hydrate from backend; fall back to mock on failure
    persistence.fetchDocuments()
      .then(result => {
        if (!result || !result.documents || result.documents.length === 0) loadMockData();
      })
      .catch(() => loadMockData())
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // v0.117.5: Persistence
  const persistence = useDocumentControlPersistence();
  const lix = useLixAgent('TMF');  // document-resolution agent

  // v112: Cross-module navigation
  const { getContext } = useIncomingNavigation();
  
  // v0.21.8: Toast notifications
  const toast = useToast();

  // Store
  const documentsRecord = useDocumentControlStore(s => s.documents);
  // v0.44.12: Sync approved authoring + effective QMS docs into Document Control automatically
  useAuthoringDocBridge();
  useQMSDocBridge();
  const templatesRecord = useDocumentControlStore(s => s.templates);
  const componentsRecord = useDocumentControlStore(s => s.components);
  const reviewCyclesRecord = useDocumentControlStore(s => s.reviewCycles);
  const workflowsRecord = useDocumentControlStore(s => s.workflows);
  const selectedDocumentId = useDocumentControlStore(s => s.selectedDocumentId);
  const activeView = useDocumentControlStore(s => s.activeView);
  const loadMockData = useDocumentControlStore(s => s.loadMockData);
  const setSelectedDocumentId = useDocumentControlStore(s => s.setSelectedDocumentId);
  const setActiveView = useDocumentControlStore(s => s.setActiveView);
  // v0.13.42: Upload to document store action
  const createDocumentFromUploadStore = useDocumentControlStore(s => s.createDocumentFromUpload);
  // v0.13.43: Version creation store action
  const createVersion = useDocumentControlStore(s => s.createVersion);
  // v0.21.8: Baseline creation store action
  const createBaseline = useDocumentControlStore(s => s.createBaseline);
  // v0.21.9: Approval actions for approval queue
  const approveDocument = useDocumentControlStore(s => s.approveDocument);
  const rejectDocument = useDocumentControlStore(s => s.rejectDocument);
  
  // v0.13.42: Upload context state
  const [uploadContext, setUploadContext] = useState<UploadContext>('general');
  
  // v112: Apply incoming navigation context on mount
  useEffect(() => {
    const context = getContext();
    if (context) {
      if (context.viewMode) {
        const viewModeMap: Record<string, DocumentControlView> = {
          'overview': 'documents',
          'documents': 'documents',
          'workflows': 'workflows',
          'archive': 'archive',
          'versioning': 'versioning',
        };
        const targetView = viewModeMap[context.viewMode] || 'documents';
        setActiveView(targetView);
      }
    }
  }, [getContext, setActiveView]);

  const documents = useMemo(() => Object.values(documentsRecord), [documentsRecord]);
  const templates = useMemo(() => Object.values(templatesRecord), [templatesRecord]);
  const components = useMemo(() => Object.values(componentsRecord), [componentsRecord]);
  const reviewCycles = useMemo(() => Object.values(reviewCyclesRecord), [reviewCyclesRecord]);
  const workflows = useMemo(() => Object.values(workflowsRecord), [workflowsRecord]);
  const selectedDocument = selectedDocumentId ? documentsRecord[selectedDocumentId] : null;

  const handleLoadData = () => { if (documents.length === 0) loadMockData(); };

  // v149: Navigation sections moved to DocumentHierarchy component


  // v0.125.73: Derive filter option lists from live document set
  const filterOptions = useMemo(() => {
    const programs = Array.from(new Set(documents.flatMap(d => d.folders.slice(0,1)).filter(Boolean))).sort();
    const applications = Array.from(new Set(documents.flatMap(d =>
      d.folders.filter(f => /IND|NDA|MAA|CTA|BLA/i.test(f)).map(f => {
        const m = f.match(/IND|NDA|MAA|CTA|BLA/i);
        return m ? m[0].toUpperCase() : '';
      })
    ).filter(Boolean))).sort();
    const owners = Array.from(new Set(documents.map(d => d.ownerName).filter(Boolean))).sort();
    return { programs, applications, owners };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const cutoff = docFilters.dateRange
      ? new Date(Date.now() - parseInt(docFilters.dateRange) * 24 * 60 * 60 * 1000)
      : null;

    let result = documents.filter(doc => {
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inMeta = doc.title.toLowerCase().includes(q)
          || doc.documentId.toLowerCase().includes(q)
          || doc.description.toLowerCase().includes(q)
          || doc.ownerName.toLowerCase().includes(q)
          || doc.authorName.toLowerCase().includes(q);
        const inTags = doc.tags.some(t => t.toLowerCase().includes(q))
          || doc.keywords.some(k => k.toLowerCase().includes(q));
        if (searchScope === 'metadata' && !inMeta) return false;
        if (searchScope === 'tags' && !inTags) return false;
        if (searchScope === 'all' && !inMeta && !inTags) return false;
      }
      // Structured filters
      if (docFilters.program && doc.folders[0] !== docFilters.program) return false;
      if (docFilters.application) {
        const hasApp = doc.folders.some(f => new RegExp(docFilters.application, 'i').test(f));
        if (!hasApp) return false;
      }
      if (docFilters.status && doc.status !== docFilters.status) return false;
      if (docFilters.category && doc.category !== docFilters.category) return false;
      if (docFilters.owner && doc.ownerName !== docFilters.owner) return false;
      if (cutoff && new Date(doc.updatedAt) < cutoff) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'updatedAt': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
      }
      return sortDesc ? -cmp : cmp;
    });
    return result;
  }, [documents, searchQuery, searchScope, sortBy, sortDesc, docFilters]);

  const stats = useMemo(() => ({
    total: documents.length,
    draft: documents.filter(d => d.status === 'draft').length,
    inReview: documents.filter(d => d.status === 'in-review' || d.status === 'pending-approval').length,
    effective: documents.filter(d => d.status === 'effective').length,
    templates: templates.length,
    components: components.length,
  }), [documents, templates, components]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* v0.50.0: ScreenHeader adoption — standardized header with ViewOnlyBanner */}
      <ScreenHeader
        moduleId="document-control"
        title="Document Control"
        subtitle={`${stats.total} documents · ${stats.draft} draft · ${stats.inReview} in review · ${stats.effective} effective`}
        icon={<FileText className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <DocumentViewModeToggle 
              mode={documentViewMode} 
              onChange={setDocumentViewMode} 
            />
            {documentViewMode === 'grid' && (
              <button 
                onClick={() => setHierarchyVisible(!hierarchyVisible)}
                className={`px-3 py-1.5 text-xs flex items-center gap-1.5 border border-border rounded-lg transition-colors ${hierarchyVisible ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30' : 'text-text-muted hover:bg-surface-card'}`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hierarchy</span>
              </button>
            )}
      {lix.status !== 'monitoring' && (
        <LixInlineAlert
          moduleScope="TMF"
          message={lix.message}
          severity={lix.severity}
          actionLabel={lix.actionLabel ?? undefined}
          onAction={lix.actionLabel ? () => useAppStore.getState().setActiveModule('agent-hub') : undefined}
          className="mx-4 md:mx-6 mt-2"
        />
      )}

            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} className="hidden sm:inline-flex" onClick={handleLoadData}>
              {documents.length === 0 ? 'Load Data' : 'Sync'}
            </Button>

            <Button
              variant="secondary" 
              size="sm" 
              icon={<Upload className="w-4 h-4" />}
              className="hidden sm:inline-flex"
              onClick={() => setShowUploadPanel(true)}
            >
              Upload
            </Button>
            <CapabilityGate moduleId="document-control" capability="author">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowUploadPanel(true)}>
              <span className="hidden sm:inline">New Document</span>
            </Button>
            </CapabilityGate>
          </div>
        }
      />
      {/* Header nav area */}
      <div className="bg-surface-elevated border-b border-border px-6 py-2">
        {/* v116: Breadcrumb navigation */}
        <Breadcrumb 
          moduleId="document-control" 
          viewLabel={activeView === 'documents' ? 'Documents' : activeView === 'templates' ? 'Templates' : activeView === 'components' ? 'Components' : activeView === 'reviews' ? 'Review Cycles' : activeView === 'workflows' ? 'Workflows' : activeView === 'archive' ? 'Archive' : activeView === 'versioning' ? 'Version Compare' : 'Search'}
          className="mb-2"
        />
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border -mb-px overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveView('documents')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeView === 'documents' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
          <button
            onClick={() => setActiveView('approvals' as DocumentControlView)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeView === ('approvals' as DocumentControlView) ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
          >
            <Inbox className="w-4 h-4" />
            My Approvals
          </button>
          <button
            onClick={() => setActiveView('versioning')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeView === 'versioning' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
          >
            <GitCompare className="w-4 h-4" />
            Version Compare
          </button>
          <button
            onClick={() => setActiveView('co-display' as DocumentControlView)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeView === ('co-display' as DocumentControlView) ? 'border-violet-500 text-violet-400' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
          >
            <Layers className="w-4 h-4" />
            Co-Display
          </button>
        </div>
      </div>

      {/* v192: Enhanced Versioning View */}
      {activeView === 'versioning' && (
        <div className="flex-1 overflow-hidden">
          <EnhancedDocumentVersioning />
        </div>
      )}

      {/* v0.13.55: My Approvals View */}
      {activeView === ('approvals' as DocumentControlView) && (
        <div className="flex-1 overflow-auto p-6">
          <ApprovalQueueDashboard
            currentUserId={currentUser.id}
            currentUserName={currentUser.name}
            approvalRequests={getMockApprovalRequestsForUser(currentUser.id, currentUser.name)}
            onViewDocument={(documentId, approvalRequestId) => {
              // Find the document and open viewer in review mode
              // Fall back to first available document if exact ID not found
              const doc = documentsRecord[documentId] ?? Object.values(documentsRecord)[0];
              if (doc) {
                setViewingDocument(doc);
                setReviewingApprovalId(approvalRequestId);
              }
            }}
            onTakeAction={(approvalRequestId, action) => {
              // v0.21.9: Process approval action using store
              const approvalRequests = getMockApprovalRequestsForUser(currentUser.id, currentUser.name);
              const request = approvalRequests.find(r => r.id === approvalRequestId);
              if (request) {
                if (action === 'approve') {
                  approveDocument(request.documentVersionId, currentUser.id, 'Approved via approval queue');
                  persistence.updateDocument(request.documentVersionId, { status: 'approved' }).catch(() => {});
                  toast.success(`Document "${request.documentTitle}" approved`, {
                    action: { label: 'View Document →', onClick: () => useAppStore.getState().setActiveModule('document-control') },
                  });
                } else if (action === 'reject') {
                  rejectDocument(request.documentVersionId, currentUser.id, 'Rejected via approval queue');
                  persistence.updateDocument(request.documentVersionId, { status: 'rejected' }).catch(() => {});
                  toast.success(`Document "${request.documentTitle}" rejected`);
                } else if (action === 'request-revision') {
                  toast.info(`Revision requested for "${request.documentTitle}"`);
                }
              }
            }}
            onViewApprovalDetails={(approvalRequestId) => {
              // v0.21.9: Find the document and show it in the viewer
              const approvalRequests = getMockApprovalRequestsForUser(currentUser.id, currentUser.name);
              const request = approvalRequests.find(r => r.id === approvalRequestId);
              if (request) {
                const doc = documentsRecord[request.documentId] ?? Object.values(documentsRecord)[0];
                if (doc) {
                  setViewingDocument(doc);
                  toast.info(`Viewing approval details for ${request.documentTitle}`);
                }
              }
            }}
            onRefresh={() => {
              // v0.21.9: Refresh approval data (mock refresh for demo)
              toast.info('Approval queue refreshed');
            }}
          />
        </div>
      )}

      {/* Main Content - v152: Conditional rendering based on view mode */}
      {activeView !== 'versioning' && activeView !== ('approvals' as DocumentControlView) && (
      <div className="flex-1 overflow-hidden flex">
        {/* Grid View Mode */}
        {documentViewMode === 'grid' && (
          <>
            {/* v146: Resizable Hierarchy Panel (only in grid mode) */}
            {hierarchyVisible && (
              <div 
                className="relative border-r border-border bg-surface-elevated flex-none"
                style={{ width: hierarchyPanel.width }}
              >
                <DocumentHierarchy
                  documents={documents}
                  onDocumentSelect={(doc) => setViewingDocument(doc)}
                  selectedDocumentId={viewingDocument?.id}
                  productName={activeProductName}
                />
                {/* Resize handle */}
                <div
                  onMouseDown={hierarchyPanel.handleMouseDown}
                  className={`absolute top-0 bottom-0 right-0 w-1 cursor-col-resize group z-10 ${hierarchyPanel.isResizing ? 'bg-accent-blue' : ''}`}
                >
                  <div className={`absolute inset-y-0 -right-0.5 w-1 transition-colors ${hierarchyPanel.isResizing ? 'bg-accent-blue' : 'bg-transparent group-hover:bg-accent-blue/50'}`} />
                  <div className="absolute inset-y-0 -right-1 w-3" />
                </div>
              </div>
            )}

            {/* Document List/Grid */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* v0.125.73: Always-visible filter bar */}
              <div className="px-4 py-2.5 border-b border-border bg-surface-elevated flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0" />

                {/* Program */}
                {filterOptions.programs.length > 0 && (
                  <select
                    value={docFilters.program}
                    onChange={e => setFilter('program', e.target.value)}
                    className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
                  >
                    <option value="">All Programs</option>
                    {filterOptions.programs.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}

                {/* Application type */}
                <select
                  value={docFilters.application}
                  onChange={e => setFilter('application', e.target.value)}
                  className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
                >
                  <option value="">All Applications</option>
                  {['IND','NDA','MAA','CTA','BLA'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                {/* Status */}
                <select
                  value={docFilters.status}
                  onChange={e => setFilter('status', e.target.value)}
                  className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  {(['draft','in-review','pending-approval','approved','effective','superseded','retired','on-hold','rejected'] as const).map(s => (
                    <option key={s} value={s}>{DOCUMENT_STATUS_LABELS[s]}</option>
                  ))}
                </select>

                {/* Category */}
                <select
                  value={docFilters.category}
                  onChange={e => setFilter('category', e.target.value)}
                  className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {(['regulatory','clinical','safety','quality','manufacturing','nonclinical','cmc','labeling','correspondence','administrative','training'] as const).map(c => (
                    <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>

                {/* Owner */}
                {filterOptions.owners.length > 0 && (
                  <select
                    value={docFilters.owner}
                    onChange={e => setFilter('owner', e.target.value)}
                    className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
                  >
                    <option value="">All Owners</option>
                    {filterOptions.owners.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}

                {/* Date range */}
                <select
                  value={docFilters.dateRange}
                  onChange={e => setFilter('dateRange', e.target.value)}
                  className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
                >
                  <option value="">Any Date</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>

                <div className="flex-1" />

                {/* Sort + view toggles */}
                <Button variant="ghost" size="sm" icon={<ArrowUpDown className="w-4 h-4" />} onClick={() => setSortDesc(!sortDesc)} />
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button onClick={() => setListViewMode('list')} className={`p-2 ${listViewMode === 'list' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-card'}`}><List className="w-4 h-4" /></button>
                  <button onClick={() => setListViewMode('grid')} className={`p-2 ${listViewMode === 'grid' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-surface-card'}`}><Grid className="w-4 h-4" /></button>
                </div>
              </div>

              {/* v0.125.73: Active filter chips + result count */}
              <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-2 flex-wrap min-h-[36px]">
                <span className="text-xs text-text-muted flex-shrink-0">
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
                  {searchQuery && <> matching <span className="text-text-primary">"{searchQuery}"</span></>}
                </span>
                {activeFilterCount > 0 && (
                  <>
                    <div className="w-px h-3 bg-border flex-shrink-0" />
                    {docFilters.program && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                        Program: {docFilters.program}
                        <button onClick={() => setFilter('program', '')} className="hover:text-accent-blue/60"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {docFilters.application && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {docFilters.application}
                        <button onClick={() => setFilter('application', '')} className="hover:text-emerald-400/60"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {docFilters.status && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {DOCUMENT_STATUS_LABELS[docFilters.status as keyof typeof DOCUMENT_STATUS_LABELS] ?? docFilters.status}
                        <button onClick={() => setFilter('status', '')} className="hover:text-amber-400/60"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {docFilters.category && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {DOCUMENT_CATEGORY_LABELS[docFilters.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? docFilters.category}
                        <button onClick={() => setFilter('category', '')} className="hover:text-purple-400/60"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {docFilters.owner && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {docFilters.owner}
                        <button onClick={() => setFilter('owner', '')} className="hover:text-teal-400/60"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {docFilters.dateRange && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        Last {docFilters.dateRange}d
                        <button onClick={() => setFilter('dateRange', '')} className="hover:text-slate-400/60"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    <button onClick={clearFilters} className="ml-auto text-[11px] text-text-muted hover:text-text-primary transition-colors">
                      Clear all
                    </button>
                  </>
                )}
              </div>
          <ScrollFadeContainer direction="vertical" className="flex-1 overflow-y-auto">
            {listViewMode === 'list' ? (
              <table className="w-full">
                <thead className="bg-surface-elevated sticky top-0">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Document</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-28">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-32">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-32">Approval</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-24">Version</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-20">Refs</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-32">Modified</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-32">Owner</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} onClick={() => setViewingDocument(doc)}
                      className={`cursor-pointer hover:bg-surface-card transition-colors ${viewingDocument?.id === doc.id ? 'bg-accent-blue/5' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.fileFormat)}
                          <div>
                            <div className="text-sm font-medium text-text-primary">{doc.title}</div>
                            <div className="text-xs text-text-muted flex items-center gap-2">
                              <span>{doc.documentId}</span>
                              {doc.customMetadata?.authoringDocId && (
                                <span className="px-1.5 py-0.5 bg-accent-purple/20 text-accent-purple rounded text-xs font-medium">Authoring</span>
                              )}
                              {doc.customMetadata?.qmsDocId && (
                                <span className="px-1.5 py-0.5 bg-accent-teal/20 text-accent-teal rounded text-xs font-medium">QMS</span>
                              )}
                              {doc.tags.length > 0 && (<><span>•</span><span className="flex items-center gap-1"><Tag className="w-3 h-3" />{doc.tags.slice(0, 2).join(', ')}{doc.tags.length > 2 && ` +${doc.tags.length - 2}`}</span></>)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getDocumentCategoryBadge(doc.category)}</td>
                      <td className="px-4 py-3">{getDocumentStatusBadge(doc.status)}</td>
                      <td className="px-4 py-3">
                        <ApprovalStatusIndicator
                          request={getDocumentApprovalRequest(doc)}
                          variant="inline"
                          showProgress={true}
                          showEscalation={true}
                          onClick={() => setViewingDocument(doc)}
                        />
                      </td>
                      <td className="px-4 py-3"><span className="text-sm text-text-secondary">{doc.version}</span></td>
                      <td className="px-4 py-3">
                        {/* v0.15.0: Document Lineage Badge */}
                        <DocumentLineageBadge documentId={doc.id} compact />
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-text-muted">{formatDate(doc.updatedAt)}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-text-secondary">{doc.ownerName}</span></td>
                      <td className="px-4 py-3">
                        <button 
                          className="p-1.5 text-text-muted hover:bg-surface-elevated rounded transition-colors"
                          onClick={(e) => { e.stopPropagation(); setSelectedDocumentId(doc.id); }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {filteredDocuments.map(doc => (
                  <DocumentCard key={doc.id} document={doc} isSelected={viewingDocument?.id === doc.id} onClick={() => setViewingDocument(doc)} />
                ))}
              </div>
            )}
            {filteredDocuments.length === 0 && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileX className="w-12 h-12 text-text-muted mx-auto" />
                  <h3 className="text-lg font-medium text-text-primary mt-4">{documents.length === 0 ? 'No documents yet' : 'No documents found'}</h3>
                  <p className="text-sm text-text-muted mt-2">{documents.length === 0 ? 'Click "Load Data" to populate sample documents' : 'Try adjusting your search or filters'}</p>
                  {documents.length === 0 && <Button variant="primary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={handleLoadData} className="mt-4">Load Sample Data</Button>}
                </div>
              </div>
            )}
          </ScrollFadeContainer>
        </div>

        {/* v146: Resizable Document Viewer Panel */}
        {viewingDocument && !isViewerFullscreen && (
          <div 
            className="relative border-l border-border bg-surface-elevated flex flex-col overflow-hidden flex-none"
            style={{ width: viewerPanel.width }}
          >
            {/* Left edge resize handle */}
            <div
              onMouseDown={viewerPanel.handleMouseDown}
              className={`absolute top-0 bottom-0 left-0 w-1 cursor-col-resize group z-10 ${viewerPanel.isResizing ? 'bg-accent-blue' : ''}`}
            >
              <div className={`absolute inset-y-0 left-0 w-1 transition-colors ${viewerPanel.isResizing ? 'bg-accent-blue' : 'bg-transparent group-hover:bg-accent-blue/50'}`} />
              <div className="absolute inset-y-0 -left-1 w-3" />
            </div>
            <DocumentViewer 
              document={viewingDocument} 
              onClose={() => { setViewingDocument(null); setReviewingApprovalId(null); }}
              onCreateVersion={() => setShowVersionWizard(true)}
              isFullscreen={false}
              onToggleFullscreen={() => setIsViewerFullscreen(true)}
              reviewMode={!!reviewingApprovalId}
              approvalRequestId={reviewingApprovalId ?? undefined}
              onReviewVerdict={(verdict, comment, sig) => {
                setViewingDocument(null);
                setReviewingApprovalId(null);
              }}
            />
          </div>
        )}
          </>
        )}

        {/* Submission View Mode (eCTD Structure) */}
        {documentViewMode === 'submission' && (
          <>
            {/* Tree View */}
            <div className="flex-1 overflow-hidden">
              <DocumentTreeView
                documents={filteredDocuments}
                onDocumentSelect={(doc) => setViewingDocument(doc)}
                selectedDocumentId={viewingDocument?.id}
                productName={activeProductName}
                hierarchyType="ectd"
                searchQuery={searchQuery}
              />
            </div>
            
            {/* Document Viewer */}
            {viewingDocument && !isViewerFullscreen && (
              <div 
                className="relative border-l border-border bg-surface-elevated flex flex-col overflow-hidden flex-none"
                style={{ width: viewerPanel.width }}
              >
                <div
                  onMouseDown={viewerPanel.handleMouseDown}
                  className={`absolute top-0 bottom-0 left-0 w-1 cursor-col-resize group z-10 ${viewerPanel.isResizing ? 'bg-accent-blue' : ''}`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1 transition-colors ${viewerPanel.isResizing ? 'bg-accent-blue' : 'bg-transparent group-hover:bg-accent-blue/50'}`} />
                  <div className="absolute inset-y-0 -left-1 w-3" />
                </div>
                <DocumentViewer 
                  document={viewingDocument} 
                  onClose={() => { setViewingDocument(null); setReviewingApprovalId(null); }}
                  onCreateVersion={() => setShowVersionWizard(true)}
                  isFullscreen={false}
                  onToggleFullscreen={() => setIsViewerFullscreen(true)}
                  reviewMode={!!reviewingApprovalId}
                  approvalRequestId={reviewingApprovalId ?? undefined}
                  onReviewVerdict={() => { setViewingDocument(null); setReviewingApprovalId(null); }}
                />
              </div>
            )}
          </>
        )}

        {/* Discipline View Mode (EDM Structure) */}
        {documentViewMode === 'discipline' && (
          <>
            {/* Tree View */}
            <div className="flex-1 overflow-hidden">
              <DocumentTreeView
                documents={filteredDocuments}
                onDocumentSelect={(doc) => setViewingDocument(doc)}
                selectedDocumentId={viewingDocument?.id}
                productName={activeProductName}
                hierarchyType="edm"
                searchQuery={searchQuery}
              />
            </div>
            
            {/* Document Viewer */}
            {viewingDocument && !isViewerFullscreen && (
              <div 
                className="relative border-l border-border bg-surface-elevated flex flex-col overflow-hidden flex-none"
                style={{ width: viewerPanel.width }}
              >
                <div
                  onMouseDown={viewerPanel.handleMouseDown}
                  className={`absolute top-0 bottom-0 left-0 w-1 cursor-col-resize group z-10 ${viewerPanel.isResizing ? 'bg-accent-blue' : ''}`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1 transition-colors ${viewerPanel.isResizing ? 'bg-accent-blue' : 'bg-transparent group-hover:bg-accent-blue/50'}`} />
                  <div className="absolute inset-y-0 -left-1 w-3" />
                </div>
                <DocumentViewer 
                  document={viewingDocument} 
                  onClose={() => { setViewingDocument(null); setReviewingApprovalId(null); }}
                  onCreateVersion={() => setShowVersionWizard(true)}
                  isFullscreen={false}
                  onToggleFullscreen={() => setIsViewerFullscreen(true)}
                  reviewMode={!!reviewingApprovalId}
                  approvalRequestId={reviewingApprovalId ?? undefined}
                  onReviewVerdict={() => { setViewingDocument(null); setReviewingApprovalId(null); }}
                />
              </div>
            )}
          </>
        )}
        
        {/* Fullscreen Viewer */}
        {viewingDocument && isViewerFullscreen && (
          <div className="fixed inset-0 z-50 bg-surface-elevated flex flex-col">
            <DocumentViewer 
              document={viewingDocument} 
              onClose={() => { setViewingDocument(null); setReviewingApprovalId(null); }}
              onCreateVersion={() => setShowVersionWizard(true)}
              isFullscreen={true}
              onToggleFullscreen={() => setIsViewerFullscreen(false)}
              reviewMode={!!reviewingApprovalId}
              approvalRequestId={reviewingApprovalId ?? undefined}
              onReviewVerdict={() => { setViewingDocument(null); setReviewingApprovalId(null); }}
            />
          </div>
        )}
      </div>
      )}
      
      {/* v0.13.42: Upload Panel Overlay - Now creates documents from uploads */}
      {showUploadPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadPanel(false)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 bg-surface-elevated rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <DocumentUploadPanel
              context={uploadContext}
              linkedDocumentId={viewingDocument?.id}
              linkedDocumentTitle={viewingDocument?.title}
              onClose={() => setShowUploadPanel(false)}
              onFileComplete={(result) => {
                // Create document for each successful upload
                if (result.success) {
                  const docResult = createDocumentFromUpload({
                    uploadResult: result,
                    context: uploadContext,
                    createAsNewVersion: !!viewingDocument,
                    linkedDocumentId: viewingDocument?.id,
                    owner: {
                      id: 'sarah-chen',
                      name: 'Sarah Chen',
                      department: 'Regulatory Affairs',
                    },
                  });
                  
                  if (docResult.success && docResult.document) {
                    const newDoc = createDocumentFromUploadStore(
                      docResult.document,
                      docResult.versionInfo
                    );
                    // v0.21.9: Replace console.log with toast
                    toast.success(`Document "${newDoc.title}" created`, {
                    action: { label: 'View in Authoring →', onClick: () => useAppStore.getState().setActiveModule('authoring') },
                  });
                  }
                }
              }}
              onUploadComplete={(results) => {
                // v0.21.9: Replace console.log with toast
                toast.success(`Upload complete: ${results.length} file${results.length !== 1 ? 's' : ''} processed`);
              }}
              onAllComplete={() => {
                // Auto-close after a short delay when all uploads complete
                setTimeout(() => {
                  setShowUploadPanel(false);
                }, 1500);
              }}
              isModal
            />
          </div>
        </div>
      )}
      
      {/* v0.13.43: Version Creation Wizard Overlay */}
      {showVersionWizard && viewingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowVersionWizard(false)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-2xl max-h-[85vh] mx-4 bg-surface-elevated rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <VersionCreationWizard
              document={viewingDocument}
              onClose={() => setShowVersionWizard(false)}
              onVersionCreate={(data: VersionCreationData) => {
                // Create the version using store action
                const newVersion = createVersion(
                  viewingDocument.id,
                  data.changeDescription,
                  data.versionType
                );
                
                if (newVersion) {
                  // v0.21.8: Replace console.log with toast notification
                  toast.success(`Version ${newVersion.version} created successfully`);
                  
                  // v0.21.8: If baseline requested, mark it using store action
                  if (data.createBaseline && data.baselineLabel) {
                    createBaseline(newVersion.id, data.baselineLabel);
                    toast.success(`Marked as baseline: ${data.baselineLabel}`);
                  }
                }
                
                setShowVersionWizard(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function DocumentCard({ document, isSelected, onClick }: { document: EnterpriseDocument; isSelected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`p-4 bg-surface-card border rounded-lg text-left transition-all hover:border-accent-blue/50 ${isSelected ? 'border-accent-blue ring-2 ring-accent-blue/20' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-surface rounded-lg">{getFileIcon(document.fileFormat)}</div>
        {getDocumentStatusBadge(document.status)}
      </div>
      <h4 className="text-sm font-medium text-text-primary mb-1 line-clamp-2">{document.title}</h4>
      <p className="text-xs text-text-muted mb-2">{document.documentId}</p>
      {document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {document.tags.slice(0, 3).map(tag => <span key={tag} className="px-1.5 py-0.5 bg-surface rounded text-[10px] text-text-muted">{tag}</span>)}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{document.version}</span>
        <span>{formatDate(document.updatedAt)}</span>
      </div>
    </button>
  );
}

function DocumentDetailPanel({ document, onClose, onCreateVersion, onView, onDownload }: { 
  document: EnterpriseDocument; 
  onClose: () => void; 
  onCreateVersion?: () => void;
  onView?: () => void;
  onDownload?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'activity' | 'relationships'>('details');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // v0.15.25: Download handler - creates downloadable file
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior - create a mock download
      const blob = new Blob([`Document: ${document.title}\nID: ${document.documentId}\nVersion: ${document.version}\n\nThis is a placeholder for the actual document content.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.documentId}-v${document.version}.${document.fileFormat || 'txt'}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // v0.15.25: Share handler - copy link to clipboard
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/documents/${document.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareMenu(false);
      // Could add a toast notification here
    } catch {
      // Copy failed, silent fail
    }
  };

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface rounded-lg">{getFileIcon(document.fileFormat)}</div>
            <div>
              <h3 className="text-sm font-medium text-text-primary">{document.title}</h3>
              <p className="text-xs text-text-muted">{document.documentId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {getDocumentStatusBadge(document.status)}
          <Badge color="slate" size="xs">{document.version}</Badge>
          {getClassificationBadge(document.classification)}
          {getSecurityBadge(document.securityClassification)}
        </div>
      </div>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Button variant="primary" size="sm" icon={<Eye className="w-4 h-4" />} className="flex-1" onClick={onView}>View</Button>
        <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} className="flex-1" onClick={handleDownload}>Download</Button>
        <div className="relative">
          <Button variant="ghost" size="sm" icon={<Share2 className="w-4 h-4" />} onClick={() => setShowShareMenu(!showShareMenu)} />
          {showShareMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-surface-elevated border border-border rounded-lg shadow-lg py-1 z-10">
              <button onClick={handleShare} className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <Button variant="ghost" size="sm" icon={<MoreHorizontal className="w-4 h-4" />} onClick={() => setShowMoreMenu(!showMoreMenu)} />
          {showMoreMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-surface-elevated border border-border rounded-lg shadow-lg py-1 z-10">
              {onCreateVersion && (
                <button onClick={() => { onCreateVersion(); setShowMoreMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Create Version
                </button>
              )}
              <button onClick={() => { handleDownload(); setShowMoreMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 border-b border-border flex items-center gap-1">
        {(['details', 'versions', 'activity', 'relationships'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-4 md:space-y-6">
            <DetailSection title="File Information">
              <DetailRow label="Format" value={document.fileFormat.toUpperCase()} />
              <DetailRow label="Size" value={formatFileSize(document.fileSize)} />
              {document.pageCount && <DetailRow label="Pages" value={document.pageCount.toString()} />}
              {document.wordCount && <DetailRow label="Words" value={document.wordCount.toLocaleString()} />}
              <DetailRow label="Language" value={document.language} />
            </DetailSection>
            <DetailSection title="Ownership">
              <DetailRow label="Owner" value={document.ownerName} />
              <DetailRow label="Department" value={document.ownerDepartment} />
              <DetailRow label="Author" value={document.authorName} />
            </DetailSection>
            <DetailSection title="Classification">
              <DetailRow label="Category" value={document.category} />
              <DetailRow label="Classification" value={document.classification} />
              <DetailRow label="Security" value={document.securityClassification} />
            </DetailSection>
            {document.tags.length > 0 && (
              <DetailSection title="Tags">
                <div className="flex flex-wrap gap-1">{document.tags.map(tag => <span key={tag} className="px-2 py-1 bg-surface rounded text-xs text-text-secondary">{tag}</span>)}</div>
              </DetailSection>
            )}
            {document.keywords.length > 0 && (
              <DetailSection title="Keywords">
                <div className="flex flex-wrap gap-1">{document.keywords.map(kw => <span key={kw} className="px-2 py-1 bg-accent-blue/10 text-accent-blue rounded text-xs">{kw}</span>)}</div>
              </DetailSection>
            )}
            <DetailSection title="Retention">
              <div className="flex items-center gap-2 mb-2">{getArchiveStatusBadge(document.archiveStatus)}</div>
              <DetailRow label="Category" value={document.retentionCategory.replace(/-/g, ' ')} />
              <DetailRow label="Period" value={`${document.retentionPeriodYears} years`} />
            </DetailSection>
            <DetailSection title="Dates">
              <DetailRow label="Created" value={new Date(document.createdAt).toLocaleString()} />
              <DetailRow label="Modified" value={new Date(document.updatedAt).toLocaleString()} />
              {document.effectiveDate && <DetailRow label="Effective" value={new Date(document.effectiveDate).toLocaleDateString()} />}
              {document.expirationDate && <DetailRow label="Expires" value={new Date(document.expirationDate).toLocaleDateString()} />}
            </DetailSection>
          </div>
        )}
        {activeTab === 'versions' && (
          <div className="space-y-3">
            {/* v0.13.43: Create Version button */}
            {onCreateVersion && (
              <Button
                variant="secondary"
                size="sm"
                icon={<GitBranch className="w-4 h-4" />}
                onClick={onCreateVersion}
                className="w-full"
              >
                Create New Version
              </Button>
            )}
            {document.versionHistory.length > 0 ? document.versionHistory.map((version, idx) => (
              <div key={version.versionId} className={`p-3 rounded-lg border transition-colors ${idx === 0 ? 'border-accent-blue bg-accent-blue/5' : 'border-border bg-surface-card'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">v{version.version}</span>
                    {idx === 0 && <Badge color="blue" size="xs">Current</Badge>}
                  </div>
                  {getDocumentStatusBadge(version.status)}
                </div>
                <p className="text-xs text-text-muted mb-2">{version.changeDescription}</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{version.createdBy}</span>
                  <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-text-muted">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No version history</p>
                <p className="text-xs mt-1">This is the initial version</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            <ActivityItem icon={<Edit className="w-3 h-3" />} iconBg="bg-accent-blue/20" iconColor="text-accent-blue" title="Document modified" subtitle={`by ${document.lastModifiedBy}`} time={formatDate(document.updatedAt)} />
            <ActivityItem icon={<Plus className="w-3 h-3" />} iconBg="bg-green-500/20" iconColor="text-green-400" title="Document created" subtitle={`by ${document.createdBy}`} time={formatDate(document.createdAt)} />
          </div>
        )}
        {activeTab === 'relationships' && (
          <div className="space-y-4">
            <DetailSection title="Linked Modules">
              {document.linkedModules.length > 0 ? (
                <div className="space-y-2">{document.linkedModules.map(link => (
                  <div key={link.id} className="flex items-center gap-2 p-2 bg-surface rounded-lg">
                    <Link2 className="w-4 h-4 text-text-muted" />
                    <div className="flex-1"><span className="text-sm text-text-primary">{link.moduleEntityName}</span><span className="text-xs text-text-muted ml-2">{link.moduleType}</span></div>
                    <Badge color="slate" size="xs">{link.linkType}</Badge>
                  </div>
                ))}</div>
              ) : <p className="text-xs text-text-muted">No linked modules</p>}
            </DetailSection>
            <DetailSection title="Related Documents">
              {document.relatedDocumentIds.length > 0 ? (
                <button
                  onClick={() => useAppStore.getState().setActiveModule('document-control')}
                  className="flex items-center gap-1.5 text-xs text-accent-blue hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {document.relatedDocumentIds.length} related document(s) — view in Document Control
                </button>
              ) : <p className="text-xs text-text-muted">No related documents</p>}
            </DetailSection>
            <DetailSection title="Attachments">
              {document.attachments.length > 0 ? (
                <div className="space-y-2">{(document.attachments ?? []).map(att => (
                  <div key={att.id} className="flex items-center gap-2 p-2 bg-surface rounded-lg">
                    <File className="w-4 h-4 text-text-muted" />
                    <span className="flex-1 text-sm text-text-primary truncate">{att.fileName}</span>
                    <Button 
                      variant="ghost" 
                      size="xs" 
                      icon={<Download className="w-3 h-3" />} 
                      onClick={() => {
                        // v0.15.25: Download attachment
                        const blob = new Blob([`Attachment: ${att.fileName}`], { type: 'application/octet-stream' });
                        const url = URL.createObjectURL(blob);
                        const a = window.document.createElement('a');
                        a.href = url;
                        a.download = att.fileName;
                        window.document.body.appendChild(a);
                        a.click();
                        window.document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                    />
                  </div>
                ))}</div>
              ) : <p className="text-xs text-text-muted">No attachments</p>}
            </DetailSection>
          </div>
        )}
      </div>
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">{title}</h4>{children}</div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between py-1"><span className="text-xs text-text-muted">{label}</span><span className="text-sm text-text-primary capitalize">{value}</span></div>;
}

function ActivityItem({ icon, iconBg, iconColor, title, subtitle, time }: { icon: React.ReactNode; iconBg: string; iconColor: string; title: string; subtitle: string; time: string }) {
  return (
    <div className="p-3 bg-surface-card rounded-lg border border-border">
      <div className="flex items-start gap-3">
        <div className={`p-1.5 ${iconBg} rounded`}><span className={iconColor}>{icon}</span></div>
        <div className="flex-1"><p className="text-sm text-text-primary">{title}</p><p className="text-xs text-text-muted mt-1">{subtitle}</p></div>
        <span className="text-xs text-text-muted">{time}</span>
      </div>
    </div>
  );
}
