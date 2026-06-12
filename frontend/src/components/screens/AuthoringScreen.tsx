



import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Clock, CheckCircle, AlertCircle, AlertTriangle, ChevronRight, ChevronDown,
  Plus, Search, Calendar, User, FolderOpen, Edit3, Eye, Send, MessageSquare,
  History, BarChart3, Layers, Target, Users, ArrowRight, Play, Check, X, Sparkles, AlertOctagon, Package,
  BookOpen, Link2, ExternalLink, GitBranch, Database, Zap, Table, PlayCircle, XCircle, FileCheck, Cpu, Brain
} from 'lucide-react';
import {
  authoringDocuments, documentTemplates, pendingReviews, recentActivity,
  getWriterDashboardData, documentTypeNames, documentStatusConfig,
} from '@/data/authoring-data';
import {
  documentGenerationJobs,
  getGenerationQueueSummary,
  getJobById,
  getSectionsNeedingReview,
  getGenerationMetrics,
  generationStatusConfig,
  confidenceLevelConfig,
  contentTypeConfig,
  type DocumentGenerationJob,
  type GeneratedSection,
  type GenerationStatus,
} from '@/data/document-generation-data';
import { AuthoringDocument, DocumentType, DocumentStatus, DocumentSection } from '@/types/authoring';
import { NewDocumentWizard } from '@/components/authoring/NewDocumentWizard';
import { DocumentEditor } from '@/components/authoring/DocumentEditor';
import { ArtifactBadge } from '@/components/authoring/ArtifactBadge';
import { CoDisplayBanner } from '@/components/authoring/CoDisplayBanner';
import { useScopeContext } from '@/hooks/useScopeContext';
import { ScopeContextBanner } from '@/components/ui/ScopeContextBanner';
import { SourceViewerDrawer } from '@/components/authoring/SourceViewerDrawer';
import { ReviewWorkflowPanel } from '@/components/authoring/ReviewWorkflowPanel';
import { EnhancedReviewWorkflowPanel } from '@/components/authoring/EnhancedReviewWorkflowPanel';
import { ReconciliationReportPanel } from '@/components/authoring/ReconciliationReportPanel';
import { ReviewDecisionDialog } from '@/components/authoring/ReviewDecisionDialog';
import { AmendmentWorkflow } from '@/components/authoring/AmendmentWorkflow';
import { QCChecklist } from '@/components/authoring/QCChecklist';
import { DocumentQCPanel } from '@/components/authoring/DocumentQCPanel';
import { DigitalSignature } from '@/components/authoring/DigitalSignature';
import { VersionComparison } from '@/components/authoring/VersionComparison';
import { FinalizeDocumentDialog } from '@/components/authoring/FinalizeDocumentDialog';
import { NotificationBell } from '@/components/authoring/NotificationPanel';
// v0.27.66: AI streaming visualization
import { AuthoringStreamingPanel, StreamingIndicator } from '@/components/authoring/AuthoringStreamingPanel';
// v0.27.69: Batch section generation
import { BatchGenerationPanel } from '@/components/authoring/BatchGenerationPanel';
import type { BatchSection } from '@/hooks/useBatchSectionGeneration';
import { DocumentViewer } from '@/components/viewer/DocumentViewer';
import { FilterState } from '@/components/layout/FilterBar';
import { useProducts } from '@/stores/products-store';
import { useCrossModuleStore, ctdSectionMapping } from '@/store/useCrossModuleStore';
import { useAuthoringStore } from '@/store/useAuthoringStore';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { authoringToViewerDocument } from '@/utils/document-converters';
import { versionForTransition, bumpMinor as bumpMinorLocal } from '@/utils/versionUtils';
import { useCrossReferenceStore } from '@/store/useCrossReferenceStore';
import { crossReferenceTypeLabels, getCrossReferenceDescription } from '@/utils/document-converters';
// v93: UI Component Library imports
// v177: Added ReturnBreadcrumb for cross-module navigation
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { DocumentWorkflowPanel } from '@/components/ui/DocumentWorkflowPanel';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardHeader, CardContent, CardFooter, StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar, LabeledProgress } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
// v0.27.3: New layout components for demo polish
import { ScreenLayout, type ScreenStat, type ScreenTab } from '@/components/ui/ScreenLayout';
import { DrillableStatCard, columnRenderers, type DrilldownConfig } from '@/components/ui/DrillableStatCard';
import { ResizableSplitView } from '@/components/ui/ResizableSplitView';
import { StatCardGridSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
// v0.12.6: State preservation for navigation
import { LixInlineAlert } from '@/components/lix/LixPanel';
import { useLixAgent } from '@/hooks/useLixAgent';
import { usePreserveModuleState } from '@/hooks/usePreserveModuleState';
import { useIncomingNavigation } from '@/hooks/useModuleNavigation';
import { useAuthoringPersistence } from '@/hooks/useAuthoringPersistence';
// v0.42.10: Template Library integration
import { TemplateBrowser } from '@/components/templates/TemplateBrowser';
import { useDeadClick } from '@/hooks/useDeadClick';

type ViewMode = 'dashboard' | 'documents' | 'document-detail' | 'new-document' | 'editor' | 'generation' | 'templates';

interface AuthoringScreenProps {
  filters?: FilterState;
}

const priorityConfig = {
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { label: 'High', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  medium: { label: 'Medium', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  low: { label: 'Low', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

// v0.32.9: Convert document sections to batch sections format
function convertDocumentSectionsToBatch(sections: DocumentSection[]): BatchSection[] {
  const result: BatchSection[] = [];
  
  const flatten = (secs: DocumentSection[], parentModule = '') => {
    for (const sec of secs) {
      // Determine CTD module from section number
      let ctdModule = parentModule;
      if (sec.number.startsWith('2.')) ctdModule = 'Module 2';
      else if (sec.number.startsWith('3.')) ctdModule = 'Module 3';
      else if (sec.number.startsWith('4.')) ctdModule = 'Module 4';
      else if (sec.number.startsWith('5.')) ctdModule = 'Module 5';
      
      result.push({
        id: sec.id,
        number: sec.number,
        title: sec.title,
        ctdModule: ctdModule || 'Document',
        estimatedWords: (sec as any).wordCountTarget?.max || 500,
      });
      
      if (sec.subsections && sec.subsections.length > 0) {
        flatten(sec.subsections, ctdModule);
      }
    }
  };
  
  flatten(sections);
  return result;
}

export function AuthoringScreen({ filters }: AuthoringScreenProps) {
  // Scope context — provides applicationNumber, scopeSummary, scopeFlag
  const { applicationNumber, scopeSummary, scopeFlag } = useScopeContext('authoring');

  const products = useProducts();
  const toast = useToast();
  // v0.44.51: Cascade engine — labeling and CSR authoring tasks from safety/CTMS
  const cascadeChains = useCascadeEngine(s => s.chains);
  const skipCascadeStep = useCascadeEngine(s => s.skipStep);
  const createHandoff = useCrossModuleStore(s => s.createHandoff);
  const setNavigationContext = useCrossModuleStore(s => s.setNavigationContext);
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const currentActiveModule = useAppStore(s => s.selection.activeModule);
  
  // Reset to dashboard whenever Authoring becomes the active module
  // (keep-mounted optimization preserves state; this ensures fresh-entry feel)
  const prevActiveModule = useRef<string | null>(null);
  useEffect(() => {
    if (currentActiveModule === 'authoring' && prevActiveModule.current !== 'authoring') {
      setViewMode('dashboard');
      setSelectedDocument(null);
    }
    prevActiveModule.current = currentActiveModule ?? null;
  }, [currentActiveModule]);
  
  const persistence = useAuthoringPersistence();
  const lix = useLixAgent('Authoring');

    const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<AuthoringDocument | null>(null);
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [applicationFilter, setApplicationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [showEnhancedReviewPanel, setShowEnhancedReviewPanel] = useState(false);
  const [showReconciliationReport, setShowReconciliationReport] = useState(false);
  const [showReviewDecision, setShowReviewDecision] = useState(false);
  const [showAmendment, setShowAmendment] = useState(false);
  const [showQCChecklist, setShowQCChecklist] = useState(false);
  const [showAIQC, setShowAIQC] = useState(false);
  const [showDigitalSignature, setShowDigitalSignature] = useState(false);
  const [signatureAction, setSignatureAction] = useState<'approve' | 'reject' | 'acknowledge'>('approve');
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showCrossReferences, setShowCrossReferences] = useState(false);
  const [viewingSource, setViewingSource] = useState<import('@/store/useAuthoringStore').SourceDocument | null>(null);
  
  // v0.27.66: AI streaming generation state
  const [showStreamingPanel, setShowStreamingPanel] = useState(false);
  const [streamingJobId, setStreamingJobId] = useState<string | null>(null);
  const [streamingSectionIndex, setStreamingSectionIndex] = useState<number>(0);
  
  // v0.27.69: Batch generation panel state
  const [showBatchGeneration, setShowBatchGeneration] = useState(false);
  const [batchGenerationContext, setBatchGenerationContext] = useState<{
    productName: string;
    indication?: string;
    studyIds?: string[];
    subjectsExposed?: number;
  } | null>(null);
  
  // v0.30.4: Authoring kickoff modal state
  const [showAuthoringKickoff, setShowAuthoringKickoff] = useState(false);
  const [pendingAIMode, setPendingAIMode] = useState<'section' | 'reuse' | 'document' | null>(null);
  const [focusComponentsPanel, setFocusComponentsPanel] = useState(false);
  
  // v128: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);
  
  // v0.12.6: State preservation for navigation stack
  const preserveState = useMemo(() => ({
    viewMode,
    selectedDocumentId: selectedDocument?.id || null,
    typeFilter,
    statusFilter,
    programFilter,
  }), [viewMode, selectedDocument?.id, typeFilter, statusFilter, programFilter]);
  
  const { restoredState, updateLabel } = usePreserveModuleState(
    'authoring',
    preserveState,
    ['viewMode', 'selectedDocumentId', 'typeFilter', 'statusFilter', 'programFilter'],
    {
      label: 'Document Authoring',
      labelFn: (state) => {
        if (state.selectedDocumentId) {
          const doc = authoringDocuments.find(d => d.id === state.selectedDocumentId);
          return doc ? `Doc: ${doc.shortTitle || doc.title.substring(0, 20)}` : 'Document Authoring';
        }
        return 'Document Authoring';
      },
    }
  );
  
  // Restore state from navigation stack on mount
  useEffect(() => {
    if (restoredState) {
      if (restoredState.viewMode) setViewMode(restoredState.viewMode as ViewMode);
      if (restoredState.typeFilter) setTypeFilter(restoredState.typeFilter as DocumentType | 'all');
      if (restoredState.statusFilter) setStatusFilter(restoredState.statusFilter as DocumentStatus | 'all');
      if (restoredState.programFilter) setProgramFilter(restoredState.programFilter as string);
      if (restoredState.selectedDocumentId) {
        const doc = authoringDocuments.find(d => d.id === restoredState.selectedDocumentId);
        if (doc) setSelectedDocument(doc);
      }
    }
  }, [restoredState]);

  // v0.125.62: Scope applicationNumber used as a pre-filter suggestion only — does not force filter
  // Users can clear or change freely; default is always 'all'

  // v0.125.7: Consume incoming navigation context (e.g. from Home "Open Editor" CTA)
  const { getContext } = useIncomingNavigation();
  useEffect(() => {
    const ctx = getContext();
    if (!ctx?.selection?.documentId) return;
    const doc = authoringDocuments.find(d => d.id === ctx.selection!.documentId);
    if (doc) {
      setSelectedDocument(doc);
      setViewMode('document-detail');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update breadcrumb when selection changes
  useEffect(() => {
    if (selectedDocument) {
      updateLabel(`Doc: ${selectedDocument.shortTitle || selectedDocument.title.substring(0, 20)}`);
    } else {
      updateLabel('Document Authoring');
    }
  }, [selectedDocument, updateLabel]);
  
  // Cross-reference store
  const getReferencesForDocument = useCrossReferenceStore(s => s.getReferencesForDocument);
  
  // v0.21.6: Subscribe to centralized document store instead of local state
  const documents = useAuthoringStore(s => s.documents);
  const initializeDocuments = useAuthoringStore(s => s.initializeDocuments);
  const addDocument = useAuthoringStore(s => s.addDocument);
  const updateDocument = useAuthoringStore(s => s.updateDocument);
  const updateSectionContent = useAuthoringStore(s => s.updateSectionContent);
  const updateSectionStatus = useAuthoringStore(s => s.updateSectionStatus);
  
  // v0.117.1: Hydrate from backend on mount; fall back to mock data
  useEffect(() => {
    persistence.fetchDocuments().then(result => {
      if (result && result.data.length > 0) {
        initializeDocuments(result.data as unknown as typeof authoringDocuments);
      } else if (documents.length === 0) {
        initializeDocuments(authoringDocuments);
      }
    }).catch(() => {
      if (documents.length === 0) initializeDocuments(authoringDocuments);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handler for sending document to eCTD Builder
  const handleSendToEctd = (doc: AuthoringDocument) => {
    // Map document type to CTD section
    const typeMapping: Record<string, string> = {
      'csr': 'csr',
      'protocol': 'protocol',
      'ib': 'ib',
      'module-25': 'clinical-overview',
      'module-27': 'clinical-summary',
      'module-24': 'nonclinical-overview',
      'module-26': 'nonclinical-summary',
      'module-32s': 'drug-substance',
      'module-32p': 'drug-product',
      'dsur': 'dsur',
      'pbrer': 'pbrer',
    };
    
    const contentType = typeMapping[doc.documentType] || doc.documentType;
    const ctdSection = ctdSectionMapping[contentType];
    
    // Create the handoff
    const handoffId = createHandoff({
      type: 'document-to-ectd',
      sourceModule: 'authoring',
      targetModule: 'submissions',
      sourceId: doc.id,
      sourceTitle: doc.title,
      targetSection: ctdSection?.section,
      metadata: {
        documentType: doc.documentType,
        version: doc.version,
        productName: doc.productName,
        programId: doc.programId,
        ctdModule: ctdSection?.module,
        ctdTitle: ctdSection?.title,
      },
      createdBy: doc.authorName,
    });
    
    // Set navigation context
    setNavigationContext({
      sourceModule: 'authoring',
      targetSection: ctdSection?.section,
      handoffId,
    });
    
    toast.success(`"${doc.shortTitle || doc.title}" sent to eCTD Builder`);
    
    // Navigate to Submissions Builder
    setTimeout(() => {
      setActiveModule('submissions');
    }, 500);
  };
  
  // Available programs for filtering
  const programs = useMemo(() => {
    const programSet = new Map<string, { id: string; name: string; product: string }>();
    documents.forEach(doc => {
      if (!programSet.has(doc.programId)) {
        programSet.set(doc.programId, {
          id: doc.programId,
          name: doc.programName,
          product: doc.productName
        });
      }
    });
    return Array.from(programSet.values());
  }, [documents]);

  // Get dashboard data for current user (mock: u-writer-1) using local documents
  const dashboardData = useMemo(() => {
    const myDocs = documents.filter(d => d.authorId === 'u-writer-1');
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const overdueDocs = myDocs.filter(d => {
      if (!d.dueDate) return false;
      const dueDate = new Date(d.dueDate);
      return dueDate < today && !['approved', 'submission-ready', 'superseded'].includes(d.status);
    });
    
    const dueThisWeek = myDocs.filter(d => {
      if (!d.dueDate) return false;
      const dueDate = new Date(d.dueDate);
      return dueDate >= today && dueDate <= weekFromNow && !['approved', 'submission-ready', 'superseded'].includes(d.status);
    });
    
    const inReview = myDocs.filter(d => ['internal-review', 'cross-functional-review', 'qc-review', 'final-review'].includes(d.status));
    
    return {
      myDocuments: myDocs,
      activeCount: myDocs.filter(d => !['approved', 'submission-ready', 'superseded'].includes(d.status)).length,
      overdueCount: overdueDocs.length,
      inReviewCount: inReview.length,
      dueThisWeekCount: dueThisWeek.length,
      pendingReviews,
      recentActivity: recentActivity.slice(0, 5),
    };
  }, [documents]);

  // v0.125.62: Derive available application numbers from document set for filter dropdown
  const availableApplications = useMemo(() => {
    const nums = Array.from(
      new Set(documents.map(d => d.applicationNumber).filter((n): n is string => !!n))
    ).sort();
    return nums;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    let docs = [...documents];
    
    // Program filter
    if (programFilter !== 'all') {
      docs = docs.filter(d => d.programId === programFilter);
    }

    // v0.125.62: Application filter — user-driven only, never force-set from scope
    if (applicationFilter !== 'all') {
      docs = docs.filter(d => d.applicationNumber === applicationFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      docs = docs.filter(d => d.documentType === typeFilter);
    }
    
    // Status filter  
    if (statusFilter !== 'all') {
      docs = docs.filter(d => d.status === statusFilter);
    }
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.shortTitle.toLowerCase().includes(q) ||
        d.productName.toLowerCase().includes(q) ||
        d.studyName?.toLowerCase().includes(q) ||
        d.authorName.toLowerCase().includes(q)
      );
    }
    
    // Sort by due date (earliest first), then by priority
    docs.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
    
    return docs;
  }, [documents, programFilter, applicationFilter, typeFilter, statusFilter, searchQuery]);

  const getDaysUntilDue = (dueDate?: string): number | null => {
    if (!dueDate) return null;
    return Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  // v0.27.3: Drillable stats configuration
  const authoringDrillableStats: ScreenStat[] = useMemo(() => {
    const myDocs = documents.filter(d => d.authorId === 'u-writer-1');
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const activeDocs = myDocs.filter(d => !['approved', 'submission-ready', 'superseded'].includes(d.status));
    const overdueDocs = myDocs.filter(d => {
      if (!d.dueDate) return false;
      const dueDate = new Date(d.dueDate);
      return dueDate < today && !['approved', 'submission-ready', 'superseded'].includes(d.status);
    });
    const inReviewDocs = myDocs.filter(d => ['internal-review', 'cross-functional-review', 'qc-review', 'final-review'].includes(d.status));
    const dueThisWeekDocs = myDocs.filter(d => {
      if (!d.dueDate) return false;
      const dueDate = new Date(d.dueDate);
      return dueDate >= today && dueDate <= weekFromNow && !['approved', 'submission-ready', 'superseded'].includes(d.status);
    });

    const statusColorMap: Record<string, 'blue' | 'amber' | 'purple' | 'green' | 'red' | 'gray'> = {
      draft: 'gray', 'in-progress': 'blue', 'internal-review': 'purple', 
      'cross-functional-review': 'purple', 'qc-review': 'amber', 'final-review': 'purple',
      approved: 'green', 'submission-ready': 'green', superseded: 'gray',
    };
    
    return [
      {
        id: 'active',
        value: activeDocs.length,
        label: 'Active Documents',
        color: 'text-accent-blue',
        icon: <FileText className="w-5 h-5" />,
        drilldown: {
          title: 'Active Documents',
          subtitle: 'Documents currently in progress',
          items: activeDocs.map(d => ({
            id: d.id,
            title: d.shortTitle || d.title,
            type: documentTypeNames[d.documentType] || d.documentType,
            status: d.status,
            dueDate: d.dueDate,
            daysLeft: getDaysUntilDue(d.dueDate),
            product: d.productName,
          })),
          columns: [
            { key: 'title', label: 'Document', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'type', label: 'Type', width: 80, render: (v: string) => <span className="text-xs text-text-muted">{v}</span> },
            { key: 'status', label: 'Status', width: 100, render: (v: string) => <Badge color={statusColorMap[v] || 'gray'} size="xs">{v.replace('-', ' ')}</Badge> },
            { key: 'daysLeft', label: 'Due', width: 60, render: (v: number | null) => v !== null ? <Badge color={v <= 0 ? 'red' : v <= 7 ? 'amber' : 'gray'} size="xs">{v <= 0 ? 'Overdue' : `${v}d`}</Badge> : <span className="text-text-muted">-</span> },
          ],
          onItemClick: (item) => {
            const doc = documents.find(d => d.id === item.id);
            if (doc) { setSelectedDocument(doc); setViewMode('document-detail'); }
          },
          searchable: true,
        },
      },
      {
        id: 'overdue',
        value: overdueDocs.length,
        label: 'Overdue',
        color: 'text-accent-red',
        icon: <AlertTriangle className="w-5 h-5" />,
        drilldown: {
          title: 'Overdue Documents',
          subtitle: 'Requires immediate attention',
          items: overdueDocs.map(d => ({
            id: d.id,
            title: d.shortTitle || d.title,
            dueDate: d.dueDate,
            daysOverdue: Math.abs(getDaysUntilDue(d.dueDate) || 0),
            status: d.status,
            product: d.productName,
          })),
          columns: [
            { key: 'title', label: 'Document', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'status', label: 'Status', width: 100, render: (v: string) => <Badge color={statusColorMap[v] || 'gray'} size="xs">{v.replace('-', ' ')}</Badge> },
            { key: 'daysOverdue', label: 'Overdue', width: 70, render: (v: number) => <Badge color="red" size="xs">{v}d</Badge> },
          ],
          onItemClick: (item) => {
            const doc = documents.find(d => d.id === item.id);
            if (doc) { setSelectedDocument(doc); setViewMode('document-detail'); }
          },
        },
      },
      {
        id: 'in-review',
        value: inReviewDocs.length,
        label: 'In Review',
        color: 'text-accent-purple',
        icon: <Eye className="w-5 h-5" />,
        drilldown: {
          title: 'Documents In Review',
          subtitle: 'Awaiting feedback or approval',
          items: inReviewDocs.map(d => ({
            id: d.id,
            title: d.shortTitle || d.title,
            status: d.status,
            reviewStage: d.status.replace('-', ' '),
            product: d.productName,
          })),
          columns: [
            { key: 'title', label: 'Document', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'reviewStage', label: 'Review Stage', width: 120, render: (v: string) => <Badge color="purple" size="xs">{v}</Badge> },
          ],
          onItemClick: (item) => {
            const doc = documents.find(d => d.id === item.id);
            if (doc) { setSelectedDocument(doc); setViewMode('document-detail'); }
          },
        },
      },
      {
        id: 'due-this-week',
        value: dueThisWeekDocs.length,
        label: 'Due This Week',
        color: 'text-accent-amber',
        icon: <Calendar className="w-5 h-5" />,
        drilldown: {
          title: 'Due This Week',
          subtitle: 'Documents with upcoming deadlines',
          items: dueThisWeekDocs.map(d => ({
            id: d.id,
            title: d.shortTitle || d.title,
            dueDate: d.dueDate,
            daysLeft: getDaysUntilDue(d.dueDate),
            status: d.status,
          })),
          columns: [
            { key: 'title', label: 'Document', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
            { key: 'status', label: 'Status', width: 100, render: (v: string) => <Badge color={statusColorMap[v] || 'gray'} size="xs">{v.replace('-', ' ')}</Badge> },
            { key: 'daysLeft', label: 'Due In', width: 60, render: (v: number | null) => <Badge color={v !== null && v <= 2 ? 'red' : 'amber'} size="xs">{v}d</Badge> },
          ],
          onItemClick: (item) => {
            const doc = documents.find(d => d.id === item.id);
            if (doc) { setSelectedDocument(doc); setViewMode('document-detail'); }
          },
        },
      },
    ];
  }, [documents]);

  const handleOpenDocument = (doc: AuthoringDocument) => {
    setSelectedDocument(doc);
    setViewMode('editor');
  };

  const handleViewDocument = (doc: AuthoringDocument, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Don't trigger row click
    }
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  };

  const handleShowCrossReferences = (doc: AuthoringDocument, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedDocument(doc);
    setShowCrossReferences(true);
  };

  // v93: Migrated DocumentCard to use UI components
  const DocumentCard = ({ doc, compact = false }: { doc: AuthoringDocument; compact?: boolean }) => {
    const daysLeft = getDaysUntilDue(doc.dueDate);
    const status = documentStatusConfig[doc.status];
    const priority = priorityConfig[doc.priority];
    
    // Map priority to Badge color
    const priorityColorMap: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
      critical: 'red',
      high: 'amber',
      medium: 'blue',
      low: 'gray',
    };
    
    // Map status to Badge color  
    const statusColorMap: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'red' | 'gray'> = {
      drafting: 'blue',
      'internal-review': 'purple',
      'cross-functional-review': 'purple',
      'qc-review': 'amber',
      'final-review': 'amber',
      approved: 'green',
      'submission-ready': 'green',
      superseded: 'gray',
      'prerequisites-pending': 'gray',
    };
    
    return (
      <Card
        variant="interactive"
        padding="md"
        radius="lg"
        onClick={() => handleOpenDocument(doc)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge color={priorityColorMap[doc.priority] || 'gray'} size="xs">
              {priority.label}
            </Badge>
            <Badge color={statusColorMap[doc.status] || 'gray'} size="xs">
              {status.label}
            </Badge>
          </div>
          {daysLeft !== null && (
            <Badge 
              color={daysLeft <= 0 ? 'red' : daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'amber' : 'gray'} 
              variant="soft" 
              size="xs"
            >
              {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
            </Badge>
          )}
        </div>
        
        <h3 className="text-sm font-semibold text-text-primary mb-1 line-clamp-1">{doc.shortTitle || doc.title}</h3>
        <p className="text-xs text-text-muted mb-3">{doc.productName} • {doc.studyName || doc.indication}</p>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">Progress</span>
          <span className="text-xs font-medium text-text-primary">{doc.progress}%</span>
        </div>
        <ProgressBar 
          value={doc.progress} 
          max={100} 
          size="sm" 
          color={doc.progress >= 90 ? 'green' : doc.progress >= 50 ? 'blue' : 'amber'}
        />
        
        {!compact && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <User className="w-3 h-3" />
              {doc.authorName}
            </div>
            {doc.openComments > 0 && (
              <Badge color="amber" size="xs" icon={<MessageSquare className="w-3 h-3" />}>
                {doc.openComments}
              </Badge>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-surface">
      {/* v0.50.0: ScreenHeader adoption — standardized ViewOnlyBanner */}
      <ScreenHeader
        moduleId="authoring"
          showAssetContext
        title="Document Authoring"
        subtitle="AI-powered regulatory document creation, review, and approval workflows"
        icon={<FileText className="w-5 h-5" />}
      />
      {/* Header - v0.43.14: Responsive module toolbar — tabs scroll, actions pinned */}
      <div className="min-h-[3.5rem] border-b border-border bg-surface-elevated flex items-center px-2 sm:px-3 md:px-4 gap-2 sm:gap-3">
        {/* Program selector — compact on mobile, full on desktop */}
        <div className="md:hidden shrink-0">
          <Select
            selectSize="sm"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="max-w-[100px] text-xs"
          >
            <option value="all">All</option>
            {programs.map(prog => (
              <option key={prog.id} value={prog.id}>{prog.product}</option>
            ))}
          </Select>
        </div>
        <div className="hidden md:flex items-center gap-2 pr-3 border-r border-border shrink-0">
          <span className="text-xs text-text-muted">Program:</span>
          <Select
            selectSize="sm"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
          >
            <option value="all">All Programs</option>
            {programs.map(prog => (
              <option key={prog.id} value={prog.id}>{prog.product}</option>
            ))}
          </Select>
        </div>
        
        {/* Scrollable tab area */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide scroll-fade-right">
          <div className="flex items-center gap-1 min-w-max py-2">
            <ButtonGroup>
              <Button
                variant={viewMode === 'dashboard' ? 'primary' : 'ghost'}
                size="sm"
                icon={<BarChart3 className="w-4 h-4" />}
                onClick={() => { setViewMode('dashboard'); setSelectedDocument(null); }}
              >
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant={viewMode === 'documents' || viewMode === 'document-detail' ? 'primary' : 'ghost'}
                size="sm"
                icon={<FolderOpen className="w-4 h-4" />}
                onClick={() => { setViewMode('documents'); setSelectedDocument(null); }}
              >
                <span className="hidden sm:inline">Documents</span>
              </Button>
              <Button
                variant={viewMode === 'generation' ? 'primary' : 'ghost'}
                size="sm"
                icon={<Cpu className="w-4 h-4" />}
                onClick={() => { setViewMode('generation'); setSelectedDocument(null); }}
              >
                <span className="hidden sm:inline">Generation</span>
              </Button>
              <Button
                variant={viewMode === 'templates' ? 'primary' : 'ghost'}
                size="sm"
                icon={<BookOpen className="w-4 h-4" />}
                onClick={() => { setViewMode('templates'); setSelectedDocument(null); }}
              >
                <span className="hidden sm:inline">Templates</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Layers className="w-4 h-4" />}
                onClick={() => {
                  if (selectedDocument) {
                    setFocusComponentsPanel(true);
                    setViewMode('editor');
                  } else {
                    toast.info('Select a document first to browse components');
                  }
                }}
              >
                <span className="hidden sm:inline">Components</span>
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {/* Pinned actions — always visible */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2 border-l border-border/50">
          <div className="hidden lg:flex items-center gap-3 text-xs pr-2">
            {dashboardData.overdueCount > 0 && (
              <Badge color="red" size="sm">{dashboardData.overdueCount} overdue</Badge>
            )}
            <span className="text-text-muted">{dashboardData.dueThisWeekCount} due this week</span>
          </div>
          <NotificationBell />
          <CapabilityGate moduleId="authoring" capability="author">
          <Button 
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setViewMode('new-document')}
          >
            <span className="hidden sm:inline">New Document</span>
          </Button>
          </CapabilityGate>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
      {lix.status !== 'monitoring' && (
        <LixInlineAlert
          moduleScope="Authoring"
          message={lix.message}
          severity={lix.severity}
          actionLabel={lix.actionLabel ?? undefined}
          onAction={lix.actionLabel ? () => setActiveModule('agent-hub') : undefined}
          className="mx-4 md:mx-6 mt-3"
        />
      )}
        {/* ============ DASHBOARD VIEW ============ */}
        {viewMode === 'dashboard' && (
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* v117: Breadcrumb */}
            <Breadcrumb 
              moduleId="authoring"
              viewLabel={viewMode === 'dashboard' ? 'Dashboard' :
                        viewMode === 'documents' ? 'Documents' :
                        viewMode === 'document-detail' ? 'Document Detail' :
                        viewMode === 'new-document' ? 'New Document' :
                        viewMode === 'editor' ? 'Editor' : 
                        viewMode === 'generation' ? 'Document Generation' : 'Dashboard'}
              className="mb-4"
            />
            
            {/* v177: Cross-module return navigation */}
            <ReturnBreadcrumb variant="inline" className="mb-4" />

            {/* v0.44.51: Compact header */}
            <p className="text-sm text-text-muted mb-4">Document authoring, review workflows & generation</p>

            {/* v0.44.51: Cascade strip — labeling & CSR tasks targeting authoring */}
            {(() => {
              const authoringEntries = cascadeChains
                .filter(c => c.status !== 'dismissed' && c.status !== 'complete')
                .flatMap(chain =>
                  chain.steps
                    .filter(s => s.targetModule === 'authoring' && (s.status === 'pending' || s.status === 'spawned'))
                    .map(step => ({ chain, step }))
                );
              if (authoringEntries.length === 0) return null;
              return (
                <div className="mb-5 space-y-2">
                  {authoringEntries.map(({ chain, step }) => {
                    const mins = Math.floor((Date.now() - new Date(chain.trigger.triggeredAt).getTime()) / 60000);
                    const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
                    const isLabeling = chain.trigger.type === 'safety-signal-confirmed';
                    return (
                      <div key={`${chain.id}-${step.id}`}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                          ${isLabeling
                            ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-500/40'
                            : 'bg-purple-500/5 border-purple-500/25 hover:border-purple-500/40'
                          }`}
                      >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                          ${isLabeling ? 'bg-amber-500/15 text-amber-400' : 'bg-purple-500/15 text-purple-400'}`}>
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-wide
                              ${isLabeling ? 'text-amber-400' : 'text-purple-400'}`}>
                              {isLabeling ? 'Labeling Update Required' : 'CSR Authoring Ready'}
                            </span>
                            <span className="text-xs text-text-muted">· {ago}</span>
                          </div>
                          <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{step.title}</p>
                          <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">Triggered by: {chain.trigger.sourceLabel}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setViewMode('new-document')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                              ${isLabeling
                                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-black'
                                : 'bg-purple-500/15 text-purple-400 hover:bg-purple-500 hover:text-white'
                              }`}
                          >
                            <FileText className="w-3 h-3" />
                            {isLabeling ? 'Open Labeling' : 'Start CSR'}
                          </button>
                          <button onClick={() => skipCascadeStep(chain.id, step.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Dismiss"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* v0.44.51: Hero document — most urgent open doc */}
            {(() => {
              const urgentDoc =
                dashboardData.myDocuments.find(d => {
                  const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                  return days < 0 && d.status !== 'approved';
                }) ??
                dashboardData.myDocuments.find(d => d.status === 'internal-review' || d.status === 'final-review') ??
                dashboardData.myDocuments[0] ?? null;
              if (!urgentDoc) return null;
              const daysLeft = Math.ceil((new Date(urgentDoc.dueDate).getTime() - Date.now()) / 86400000);
              const isOverdue = daysLeft < 0;
              const isDueSoon = !isOverdue && daysLeft <= 7;
              if (!isOverdue && !isDueSoon) return null; // Only show if genuinely urgent
              const statusColorMap: Record<string, string> = {
                drafting: 'text-blue-400 bg-blue-500/10',
                'internal-review': 'text-purple-400 bg-purple-500/10',
                'cross-functional-review': 'text-purple-400 bg-purple-500/10',
                'qc-review': 'text-amber-400 bg-amber-500/10',
                'final-review': 'text-red-400 bg-red-500/10',
              };
              const statusClass = statusColorMap[urgentDoc.status] ?? 'text-slate-400 bg-slate-500/10';
              return (
                <div
                  onClick={() => { setSelectedDocument(urgentDoc); setViewMode('document-detail'); }}
                  className={`mb-5 flex items-start justify-between gap-3 p-4 rounded-xl border-l-4 border cursor-pointer
                    transition-all duration-150 hover:-translate-y-px hover:shadow-lg
                    ${isOverdue
                      ? 'border-l-red-500 border-red-500/25 bg-red-500/5 hover:shadow-red-500/10'
                      : 'border-l-amber-500 border-amber-500/20 bg-amber-500/5 hover:shadow-amber-500/10'
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                        {isOverdue ? '⚠️ Overdue Document' : '⏰ Due This Week'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusClass}`}>
                        {documentStatusConfig[urgentDoc.status]?.label ?? urgentDoc.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary truncate mb-1">{urgentDoc.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{documentTypeNames[urgentDoc.type]}</span>
                      <span className={isOverdue ? 'text-red-400 font-medium' : 'text-amber-400 font-medium'}>
                        {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </span>
                      <span>{Math.round(urgentDoc.completionPercentage)}% complete</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedDocument(urgentDoc); setViewMode('editor'); }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${isOverdue ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Open Editor
                  </button>
                </div>
              );
            })()}

            {/* v0.27.3: Drillable stat cards with real data behind each metric */}
            {/* v128: Loading state */}
            {isLoading ? (
              <StatCardGridSkeleton count={4} columns={4} className="mb-8" />
            ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
              {authoringDrillableStats.map(stat => (
                <DrillableStatCard
                  key={stat.id}
                  value={stat.value}
                  label={stat.label}
                  accentColor={stat.color?.replace('text-accent-', '') as 'blue' | 'red' | 'amber' | 'purple' | 'green'}
                  icon={stat.icon}
                  drilldown={stat.drilldown as DrilldownConfig}
                  className={stat.id === 'overdue' && dashboardData.overdueCount > 0 ? 'ring-1 ring-accent-red' : ''}
                />
              ))}
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* My Work */}
              <div className="col-span-1 md:col-span-2">
                <Card variant="elevated" padding="lg">
                  <CardHeader 
                    title="My Work" 
                    action={
                      <Button variant="ghost" size="sm" onClick={() => setViewMode('documents')}>
                        View all <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    }
                  />
                  <div className="space-y-4">
                    {dashboardData.myDocuments.slice(0, 4).map(doc => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-4 md:space-y-6">
                {/* Reviews Awaiting - v93: Migrated */}
                <Card variant="elevated" padding="lg">
                  <CardHeader title="Reviews Awaiting" icon={<Eye className="w-5 h-5 text-purple-400" />} />
                  {pendingReviews.length > 0 ? (
                    <div className="space-y-3">
                      {pendingReviews.map(review => {
                        const priorityColorMap: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
                          critical: 'red',
                          high: 'amber',
                          medium: 'blue',
                          low: 'gray',
                        };
                        return (
                          <Card key={review.documentId} variant="ghost" padding="sm">
                            <div className="flex items-start justify-between mb-2">
                              <Badge color={priorityColorMap[review.priority] || 'gray'} size="xs">
                                {review.priority}
                              </Badge>
                              <span className="text-xs text-text-muted">Due: {review.dueDate}</span>
                            </div>
                            <h4 className="text-sm font-medium text-text-primary mb-1">{review.documentTitle}</h4>
                            <p className="text-xs text-text-muted mb-2">{review.stageName}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">{review.sectionsToReview.length} sections</span>
                              <Button 
                                variant="ghost" 
                                size="xs"
                                onClick={() => {
                                  const doc = documents.find(d => d.id === review.documentId);
                                  if (doc) {
                                    setSelectedDocument(doc);
                                  } else if (documents.length > 0) {
                                    // Fallback: open first available doc for review
                                    setSelectedDocument(documents[0]);
                                  }
                                  setShowReviewDecision(true);
                                }}
                              >
                                Start Review →
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      type="success"
                      title="All caught up!"
                      description="No pending reviews"
                      icon={<CheckCircle className="w-8 h-8" />}
                      size="sm"
                    />
                  )}
                </Card>

                {/* Recent Activity - v93: Migrated */}
                <Card variant="elevated" padding="none">
                  <div className="p-4 pb-0">
                    <CardHeader title="Recent Activity" icon={<History className="w-5 h-5 text-text-muted" />} />
                  </div>
                  <div className="divide-y divide-border">
                    {recentActivity.slice(0, 5).map(activity => (
                      <div key={activity.id} className="p-3">
                        <p className="text-sm text-text-primary mb-1">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{activity.userName}</span>
                          <span>•</span>
                          <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ============ DOCUMENTS LIST VIEW ============ */}
        {viewMode === 'documents' && (
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* v0.125.33: Scope banner */}
            {scopeSummary && (
              <ScopeContextBanner
                label="Application"
                scopeFlag={scopeFlag}
                scopeSummary={scopeSummary}
                className="rounded-lg mb-4 -mx-0"
              />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">All Documents</h1>
                <p className="text-sm text-text-muted mt-1">
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
                  {programFilter !== 'all' && ` in ${programs.find(p => p.id === programFilter)?.product}`}
                </p>
              </div>
              {/* v0.125.62: Flexible filter bar — all defaults to All, application filter user-driven */}
              <div className="flex items-center gap-3">
                <SearchInput
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  className="w-64"
                />
                {availableApplications.length > 0 && (
                  <Select
                    selectSize="md"
                    value={applicationFilter}
                    onChange={(e) => setApplicationFilter(e.target.value)}
                  >
                    <option value="all">All Applications</option>
                    {availableApplications.map(app => (
                      <option key={app} value={app}>{app}</option>
                    ))}
                  </Select>
                )}
                <Select
                  selectSize="md"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
                >
                  <option value="all">All Types</option>
                  <optgroup label="Clinical">
                    <option value="protocol">Protocol</option>
                    <option value="ib">Investigator's Brochure</option>
                    <option value="csr">Clinical Study Report</option>
                    <option value="sap">Statistical Analysis Plan</option>
                  </optgroup>
                  <optgroup label="Module 2">
                    <option value="module-25">Module 2.5 Clinical Overview</option>
                    <option value="module-27">Module 2.7 Clinical Summary</option>
                    <option value="module-24">Module 2.4 Nonclinical Overview</option>
                    <option value="module-26">Module 2.6 Nonclinical Summary</option>
                  </optgroup>
                  <optgroup label="Module 3 - Quality">
                    <option value="module-32s">Module 3.2.S Drug Substance</option>
                    <option value="module-32p">Module 3.2.P Drug Product</option>
                  </optgroup>
                  <optgroup label="Labeling">
                    <option value="uspi">USPI</option>
                    <option value="ccds">CCDS</option>
                    <option value="smpc">SmPC</option>
                  </optgroup>
                </Select>
                <Select
                  selectSize="md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
                >
                  <option value="all">All Statuses</option>
                  <option value="drafting">Drafting</option>
                  <option value="internal-review">Internal Review</option>
                  <option value="cross-functional-review">CF Review</option>
                  <option value="qc-review">QC Review</option>
                  <option value="final-review">Final Review</option>
                  <option value="approved">Approved</option>
                  <option value="prerequisites-pending">Prerequisites Pending</option>
                </Select>
              </div>
            </div>

            {(applicationFilter !== 'all' || programFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-text-muted">Filters:</span>
                {applicationFilter !== 'all' && (
                  <Badge color="teal" size="sm">
                    {applicationFilter}
                    <button onClick={() => setApplicationFilter('all')} className="ml-1 hover:text-white">×</button>
                  </Badge>
                )}
                {programFilter !== 'all' && (
                  <Badge color="blue" size="sm">
                    {programs.find(p => p.id === programFilter)?.product}
                    <button onClick={() => setProgramFilter('all')} className="ml-1 hover:text-white">×</button>
                  </Badge>
                )}
                {typeFilter !== 'all' && (
                  <Badge color="purple" size="sm">
                    {documentTypeNames[typeFilter]}
                    <button onClick={() => setTypeFilter('all')} className="ml-1 hover:text-white">×</button>
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge color="amber" size="sm">
                    {documentStatusConfig[statusFilter]?.label}
                    <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-white">×</button>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge color="gray" size="sm">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-white">×</button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => { setApplicationFilter('all'); setProgramFilter('all'); setTypeFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Document Table - v93: Enhanced with Card wrapper */}
            <Card variant="elevated" padding="none" radius="lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-card">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Document</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Due Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Author</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocuments.length > 0 ? filteredDocuments.map(doc => {
                    const daysLeft = getDaysUntilDue(doc.dueDate);
                    const status = documentStatusConfig[doc.status];
                    const statusColorMap: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'red' | 'gray'> = {
                      drafting: 'blue',
                      'internal-review': 'purple',
                      'cross-functional-review': 'purple',
                      'qc-review': 'amber',
                      'final-review': 'amber',
                      approved: 'green',
                      'submission-ready': 'green',
                      superseded: 'gray',
                      'prerequisites-pending': 'gray',
                    };
                    return (
                      <tr 
                        key={doc.id} 
                        className="hover:bg-surface-card cursor-pointer transition-colors"
                        onClick={() => handleOpenDocument(doc)}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-text-primary">{doc.shortTitle}</span>
                              {doc.artifactType && (
                                <ArtifactBadge type={doc.artifactType} size="xs" />
                              )}
                            </div>
                            <div className="text-xs text-text-muted">{doc.productName} {doc.studyName && `• ${doc.studyName}`}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-text-muted">{documentTypeNames[doc.documentType]}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge color={statusColorMap[doc.status] || 'gray'} size="sm">
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar 
                                value={doc.progress} 
                                max={100} 
                                size="xs" 
                                color={doc.progress >= 90 ? 'green' : doc.progress >= 50 ? 'blue' : 'amber'}
                              />
                            </div>
                            <span className="text-xs text-text-muted w-8">{doc.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {doc.dueDate && (
                            <span className={`text-xs ${daysLeft !== null && daysLeft <= 3 ? 'text-red-400 font-medium' : 'text-text-muted'}`}>
                              {doc.dueDate}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-text-muted">{doc.authorName}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <IconButton 
                              icon={<BookOpen className="w-4 h-4" />}
                              label="Read Document"
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleViewDocument(doc, e as unknown as React.MouseEvent); }}
                            />
                            <IconButton 
                              icon={<Link2 className="w-4 h-4" />}
                              label="Cross-References"
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleShowCrossReferences(doc, e as unknown as React.MouseEvent); }}
                            />
                            <IconButton 
                              icon={<ChevronRight className="w-4 h-4" />}
                              label="Open"
                              size="sm"
                              variant="ghost"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12">
                        <EmptyState
                          type="no-results"
                          title="No documents match your filters"
                          icon={<FileText className="w-12 h-12" />}
                          action={
                            <Button 
                              variant="ghost"
                              onClick={() => { setProgramFilter('all'); setTypeFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
                            >
                              Clear filters
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ============ DOCUMENT DETAIL VIEW ============ */}
        {viewMode === 'document-detail' && selectedDocument && (
          <div className="flex h-full">
            {/* Left: Section Tree - v93: Partial migration */}

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden fixed left-3 top-16 z-30 p-2 bg-surface-elevated border border-border rounded-lg shadow-lg text-text-secondary hover:text-text-primary"
              aria-label="Open Document Tree"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
            </button>
            {mobileSidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />}
            <div className={`${mobileSidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden lg:flex"} w-72 border-r border-border bg-surface-elevated flex flex-col`}>
              <div className="p-4 border-b border-border">
                <Button 
                  variant="ghost" 
                  size="xs"
                  onClick={() => setViewMode('documents')}
                  className="mb-2"
                >
                  ← Back to Documents
                </Button>
                <h2 className="text-sm font-semibold text-text-primary">{selectedDocument.shortTitle}</h2>
                <p className="text-xs text-text-muted">v{selectedDocument.version}</p>
                <LabeledProgress 
                  value={selectedDocument.progress}
                  max={100}
                  label="Progress"
                  size="sm"
                  className="mt-3"
                />
              </div>
              
              <div className="flex-1 overflow-auto p-2">
                <div className="text-xs text-text-muted uppercase tracking-wider px-2 py-2 mb-1">Sections</div>
                {(selectedDocument.sections ?? []).map(section => {
                  const sectionStatus = section.status;
                  return (
                    <div 
                      key={section.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-card cursor-pointer transition-colors"
                    >
                      {sectionStatus === 'approved' ? (
                        <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />
                      ) : sectionStatus === 'in-review' ? (
                        <Eye className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      ) : sectionStatus === 'in-progress' ? (
                        <Edit3 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
                      )}
                      <span className="text-sm text-text-muted mr-1">{section.number}</span>
                      <span className="text-sm text-text-primary flex-1 truncate">{section.title}</span>
                      {section.hasUnresolvedComments && (
                        <MessageSquare className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-border">
                <Button variant="primary" fullWidth icon={<Play className="w-4 h-4" />} onClick={() => setViewMode('editor')}>
                  Continue Drafting
                </Button>
              </div>
            </div>

            {/* Right: Document Info */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl">
                {/* Cross-module back navigation */}
                <ReturnBreadcrumb variant="inline" className="mb-4" />
                {/* v0.125.32: Co-display artifact banner */}
                <CoDisplayBanner
                  document={selectedDocument}
                  onViewMaster={() => {
                    // Navigate to master document if it exists in the list
                    if (selectedDocument.masterDocumentId) {
                      const master = documents.find(d => d.id === selectedDocument.masterDocumentId);
                      if (master) { setSelectedDocument(master); }
                    }
                  }}
                />
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold text-text-primary mb-2">{selectedDocument.title}</h1>
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      <span>{selectedDocument.productName}</span>
                      <span>•</span>
                      <span>{selectedDocument.studyName || selectedDocument.indication}</span>
                      <span>•</span>
                      <span>v{selectedDocument.version}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-sm ${documentStatusConfig[selectedDocument.status]?.bgColor} ${documentStatusConfig[selectedDocument.status]?.color}`}>
                      {documentStatusConfig[selectedDocument.status]?.label}
                    </span>
                  </div>
                </div>

                {/* Prerequisites - v93: Migrated to Card */}
                {(selectedDocument.prerequisites ?? []).length > 0 && (
                  <Card variant="default" padding="md" className="mb-6">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Prerequisites</h3>
                    <div className="space-y-2">
                      {(selectedDocument.prerequisites ?? []).map(prereq => (
                        <div key={prereq.id} className="flex items-center gap-3">
                          {prereq.status === 'available' ? (
                            <CheckCircle className="w-4 h-4 text-accent-green" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400" />
                          )}
                          <span className="text-sm text-text-primary flex-1">{prereq.name}</span>
                          {prereq.status === 'pending' && prereq.eta && (
                            <Badge color="amber" size="xs">ETA: {prereq.eta}</Badge>
                          )}
                          {prereq.sourceDocumentTitle && (
                            <Button 
                              variant="ghost" 
                              size="xs"
                              onClick={() => {
                                // Navigate to the prerequisite document
                                toast.info(`Opening: ${prereq.sourceDocumentTitle}`);
                              }}
                            >
                              View →
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Review Status - v93: Migrated to Card */}
                {selectedDocument.currentReviewStage && (
                  <Card variant="default" padding="md" className="mb-6">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">
                      Current Review: {selectedDocument.currentReviewStage.stageName}
                    </h3>
                    <div className="space-y-3">
                      {(selectedDocument.currentReviewStage?.reviewers ?? []).map(reviewer => (
                        <div key={reviewer.userId} className="flex items-center gap-3">
                          {reviewer.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-accent-green" />
                          ) : reviewer.status === 'in-progress' ? (
                            <Clock className="w-4 h-4 text-amber-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-border" />
                          )}
                          <span className="text-sm text-text-primary">{reviewer.userName}</span>
                          <span className="text-xs text-text-muted capitalize">({reviewer.role.replace(/-/g, ' ')})</span>
                          <div className="flex-1" />
                          {reviewer.decision && (
                            <Badge color="green" size="xs">
                              {reviewer.decision.replace(/-/g, ' ')}
                            </Badge>
                          )}
                          <span className="text-xs text-text-muted">Due: {reviewer.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Document Info Grid - v93: Migrated to Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 md:mb-6">
                  <Card variant="default" padding="md">
                    <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Created</span>
                        <span className="text-text-primary">{selectedDocument.createdAt}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Due Date</span>
                        <span className="text-text-primary">{selectedDocument.dueDate || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Target Date</span>
                        <span className="text-text-primary">{selectedDocument.targetDate || 'Not set'}</span>
                      </div>
                    </div>
                  </Card>
                  <Card variant="default" padding="md">
                    <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Team</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Author</span>
                        <span className="text-text-primary">{selectedDocument.authorName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Owner</span>
                        <span className="text-text-primary">{selectedDocument.ownerName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Comments</span>
                        <span className="text-text-primary">{selectedDocument.openComments} open / {selectedDocument.totalComments} total</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* v132: Document Workflow Panel */}
                <DocumentWorkflowPanel
                  documentId={selectedDocument.id}
                  currentStatus={selectedDocument.status}
                  documentTitle={selectedDocument.title}
                  progress={selectedDocument.progress}
                  onStatusChange={(newStatus) => {
                    // v0.21.6: Use store action instead of local state
                    updateDocument(selectedDocument.id, { status: newStatus as any });
                    persistence.updateDocument(selectedDocument.id, { status: newStatus as any }).catch(() => {});
                    setSelectedDocument(prev => 
                      prev ? { ...prev, status: newStatus } : null
                    );
                    toast.success(`Document status updated to ${newStatus}`);
                  }}
                  userRole="admin"
                  defaultExpanded={false}
                  className="mb-6"
                />

                {/* Actions - v93: Migrated to Button components */}
                <ButtonGroup className="flex-wrap">
                  <Button 
                    variant="primary"
                    icon={<Edit3 className="w-4 h-4" />}
                    onClick={() => setViewMode('editor')}
                  >
                    Open Editor
                  </Button>
                  <Button 
                    variant="secondary"
                    icon={<History className="w-4 h-4" />}
                    onClick={() => setShowVersionComparison(true)}
                  >
                    Compare Versions
                  </Button>
                  <Button 
                    variant="secondary"
                    icon={<Send className="w-4 h-4" />}
                    onClick={() => setShowReviewPanel(true)}
                  >
                    Send for Review
                  </Button>
                  <Button 
                    variant="outline"
                    icon={<Users className="w-4 h-4" />}
                    onClick={() => setShowEnhancedReviewPanel(true)}
                    className="border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20"
                  >
                    Enhanced Review
                  </Button>
                  <Button 
                    variant="secondary"
                    icon={<BarChart3 className="w-4 h-4" />}
                    onClick={() => setShowReconciliationReport(true)}
                  >
                    Review Report
                  </Button>
                  <Button 
                    variant="secondary"
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => setShowQCChecklist(true)}
                  >
                    QC Checklist
                  </Button>
                  <button 
                    onClick={() => setShowAIQC(true)}
                    className="px-4 py-2 bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent-purple/20"
                  >
                    <Brain className="w-4 h-4" />
                    AI Quality Check
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </ButtonGroup>

                {/* Additional Actions Row - v93: Migrated */}
                <div className="flex items-center gap-3 mt-3">
                  {selectedDocument.status === 'approved' || selectedDocument.status === 'submission-ready' ? (
                    <ButtonGroup>
                      <CapabilityGate moduleId="authoring" capability="submit" inline>
                      <Button 
                        variant="primary"
                        icon={<Package className="w-4 h-4" />}
                        onClick={() => setShowFinalizeDialog(true)}
                      >
                        Finalize to Document Store
                      </Button>
                      </CapabilityGate>
                      <CapabilityGate moduleId="authoring" capability="submit" inline>
                      <Button 
                        variant="success"
                        icon={<ArrowRight className="w-4 h-4" />}
                        onClick={() => handleSendToEctd(selectedDocument)}
                      >
                        Send to eCTD
                      </Button>
                      </CapabilityGate>
                      <Button 
                        variant="outline"
                        icon={<FileText className="w-4 h-4" />}
                        onClick={() => setShowAmendment(true)}
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                      >
                        Create Amendment
                      </Button>
                    </ButtonGroup>
                  ) : null}
                  {selectedDocument.currentReviewStage?.stageName === 'Final Review' && (
                    <ButtonGroup>
                      <CapabilityGate moduleId="authoring" capability="approve" inline>
                      <Button 
                        variant="outline"
                        icon={<CheckCircle className="w-4 h-4" />}
                        onClick={() => { setSignatureAction('approve'); setShowDigitalSignature(true); }}
                        className="border-accent-green/30 text-accent-green hover:bg-accent-green/20"
                      >
                        Approve with Signature
                      </Button>
                      </CapabilityGate>
                      <Button 
                        variant="outline"
                        icon={<X className="w-4 h-4" />}
                        onClick={() => { setSignatureAction('reject'); setShowDigitalSignature(true); }}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                      >
                        Reject
                      </Button>
                    </ButtonGroup>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ NEW DOCUMENT WIZARD ============ */}
        {viewMode === 'new-document' && (
          <NewDocumentWizard 
            onCancel={() => setViewMode('dashboard')}
            onComplete={(doc, aiMode) => {
              // v0.21.6: Use store action to add new document
              addDocument(doc);
              // v0.117.1: Persist to backend
              persistence.createDocument({
                documentType: doc.documentType as 'protocol' | 'ib' | 'csr' | 'icf' | 'dsur' | 'pbrer' | 'sap' | 'other',
                title: doc.title,
                shortTitle: doc.shortTitle ?? undefined,
                version: doc.version,
                studyId: doc.studyId ?? undefined,
                studyName: doc.studyName ?? undefined,
                productId: doc.productId ?? undefined,
                productName: doc.productName ?? undefined,
                programId: doc.programId ?? undefined,
                programName: doc.programName ?? undefined,
                authorName: doc.authorName ?? undefined,
                priority: (doc.priority as 'critical' | 'high' | 'medium' | 'low') ?? 'medium',
                dueDate: doc.dueDate ?? undefined,
                templateId: doc.templateId ?? undefined,
                templateName: doc.templateName ?? undefined,
              }).catch(() => { /* backend unavailable — store is source of truth */ });
              setSelectedDocument(doc);
              
              // v0.30.4: Route based on AI authoring mode
              if (aiMode === 'document') {
                // Show kickoff modal for batch generation
                setPendingAIMode('document');
                setShowAuthoringKickoff(true);
              } else if (aiMode === 'reuse') {
                // Go to editor with components panel focused
                setFocusComponentsPanel(true);
                setViewMode('editor');
              } else {
                // Default: show kickoff for section-by-section
                setPendingAIMode('section');
                setShowAuthoringKickoff(true);
              }
            }}
          />
        )}

        {/* ============ DOCUMENT EDITOR ============ */}
        {viewMode === 'editor' && selectedDocument && (
          <>
          <DocumentEditor 
            document={selectedDocument}
            onBack={() => {
              setFocusComponentsPanel(false);
              setViewMode('documents');
            }}
            initialRightPanelTab={focusComponentsPanel ? 'sources' : undefined}
            onViewSource={(source) => setViewingSource(source)}
          />
          <SourceViewerDrawer source={viewingSource} onClose={() => setViewingSource(null)} />
          </>
        )}

        {/* ============ GENERATION VIEW - v0.6.5 ============ */}
        {viewMode === 'generation' && (
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <Breadcrumb 
              moduleId="authoring"
              viewLabel="Document Generation"
              className="mb-4"
            />
            
            {/* Return navigation */}
            <ReturnBreadcrumb variant="inline" className="mb-4" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary mb-2 flex items-center gap-3">
                  <Cpu className="w-7 h-7 text-accent-purple" />
                  Document Generation Queue
                </h1>
                <p className="text-text-muted">Clinical data flows into regulatory documents. Database lock triggers CSR sections, tables, and figures.</p>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={<Zap className="w-4 h-4" />}
                onClick={() => {
                  // Use the first document from the list or prompt to select
                  const targetDoc = documents.find(d => d.documentType === 'module-27' || d.documentType === 'csr') || documents[0];
                  if (targetDoc) {
                    setSelectedDocument(targetDoc);
                    setBatchGenerationContext({
                      productName: targetDoc.productName || 'NEXAGEN (nexafenib)',
                      indication: targetDoc.indication || 'Hepatocellular Carcinoma',
                      studyIds: targetDoc.studyId ? [targetDoc.studyId] : ['LIG-HCC-301'],
                    });
                    setShowBatchGeneration(true);
                  } else {
                    toast.info('Create a document first to start batch generation');
                  }
                }}
              >
                Start Batch Generation
              </Button>
            </div>

            {/* Summary Banner */}
            {(() => {
              const summary = getGenerationQueueSummary();
              const metrics = getGenerationMetrics();
              return (
                <Card variant="elevated" padding="lg" className="mb-6 border-l-4 border-l-accent-purple">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-text-muted">Trigger:</span>
                        <span className="font-semibold text-text-primary">Study LIG-301 ILLUMINATE Database Lock</span>
                      </div>
                      <div className="h-6 w-px bg-border" />
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-medium text-text-primary">{summary.averageAutomationRate}% automated</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-medium">
                        Data Locked
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Metrics Row */}
            {(() => {
              const metrics = getGenerationMetrics();
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-4 md:mb-6">
                  <StatCard
                    value={metrics.documentsInQueue}
                    label="Documents"
                    accentColor="purple"
                    icon={<FileText className="w-5 h-5" />}
                  />
                  <StatCard
                    value={metrics.sectionsGenerated}
                    label="Sections Generated"
                    accentColor="blue"
                    icon={<FileCheck className="w-5 h-5" />}
                  />
                  <StatCard
                    value={metrics.tablesGenerated}
                    label="Tables Generated"
                    accentColor="teal"
                    icon={<Table className="w-5 h-5" />}
                  />
                  <StatCard
                    value={metrics.figuresGenerated}
                    label="Figures Generated"
                    accentColor="green"
                    icon={<BarChart3 className="w-5 h-5" />}
                  />
                  <StatCard
                    value={`${metrics.avgConfidence}%`}
                    label="Avg Confidence"
                    accentColor="amber"
                    icon={<Target className="w-5 h-5" />}
                  />
                  <StatCard
                    value={metrics.reviewPending}
                    label="Review Pending"
                    accentColor="red"
                    icon={<AlertCircle className="w-5 h-5" />}
                  />
                </div>
              );
            })()}

            {/* v0.27.69: Quick Batch Generation Card */}
            <Card variant="elevated" className="bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border-accent-purple/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-accent-purple/20">
                      <Layers className="w-5 h-5 text-accent-purple" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Batch Section Generation</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Generate all Module 2.7 Clinical Summary sections in sequence with AI
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => {
                      setBatchGenerationContext({
                        productName: 'Nexavar (sorafenib)',
                        indication: 'Advanced Hepatocellular Carcinoma',
                        subjectsExposed: 1247,
                      });
                      setShowBatchGeneration(true);
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Generate Module 2.7
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generation Jobs List */}
            <Card variant="elevated" padding="none">
              <CardHeader 
                title="Document Generation Jobs" 
                className="px-6 py-4 border-b border-border"
                action={
                  <div className="flex items-center gap-3">
                    <Badge color="purple" size="sm">{documentGenerationJobs.length} jobs</Badge>
                    <Button variant="primary" size="sm" icon={<Play className="w-4 h-4" />} onClick={() => {
                      setBatchGenerationContext({ productName: 'Nexavant (LIG-2847)', indication: 'KRAS G12C NSCLC', subjectsExposed: 1247 });
                      setShowBatchGeneration(true);
                    }}>
                      Generate All Ready
                    </Button>
                  </div>
                }
              />
              <div className="divide-y divide-border">
                {documentGenerationJobs.map(job => {
                  const statusConf = generationStatusConfig[job.status];
                  const confidenceConf = confidenceLevelConfig[job.overallConfidence];
                  const sectionProgress = job.totalSections > 0 
                    ? Math.round((job.completedSections / job.totalSections) * 100) 
                    : 0;
                  const tableProgress = job.totalTables > 0 
                    ? Math.round((job.completedTables / job.totalTables) * 100) 
                    : 0;
                  
                  return (
                    <div key={job.id} className="p-4 hover:bg-surface-card/50 transition-colors">
                      {/* Job Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${statusConf.bgColor} ${statusConf?.color ?? ''} font-medium`}>
                              {statusConf.label}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-surface-card text-text-muted font-medium">
                              {job.ctdSection}
                            </span>
                            {job.priority === 'critical' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                                Critical
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-text-primary">{job.documentTitle}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-text-muted">
                            <span className="flex items-center gap-1">
                              <Database className="w-3.5 h-3.5" />
                              {job.studyName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Due: {new Date(job.dueDate).toLocaleDateString()}
                            </span>
                            {job.assignedToName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {job.assignedToName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {job.overallConfidenceScore > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${confidenceConf.bgColor} ${confidenceConf?.color ?? ''}`}>
                                {job.overallConfidenceScore}% confidence
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-text-muted">
                            <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
                            {job.automationRate}% auto-generated
                          </div>
                        </div>
                      </div>

                      {/* Progress Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-3">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-muted">Sections</span>
                            <span className="text-text-primary font-medium">{job.completedSections}/{job.totalSections}</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent-blue rounded-full transition-all"
                              style={{ width: `${sectionProgress}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-muted">Tables</span>
                            <span className="text-text-primary font-medium">{job.completedTables}/{job.totalTables}</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent-cyan rounded-full transition-all"
                              style={{ width: `${tableProgress}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-muted">Figures</span>
                            <span className="text-text-primary font-medium">{job.completedFigures}/{job.totalFigures}</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent-green rounded-full transition-all"
                              style={{ width: `${job.totalFigures > 0 ? (job.completedFigures / job.totalFigures) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section Details - Expandable preview */}
                      {job.sections.filter(s => s.status === 'review-required' || s.highlightedAreas.length > 0).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-xs text-text-muted mb-2 font-medium">Sections Needing Attention:</div>
                          <div className="space-y-2">
                            {job.sections
                              .filter(s => s.status === 'review-required' || s.status === 'in-review' || s.highlightedAreas.length > 0)
                              .slice(0, 3)
                              .map(section => (
                                <div key={section.id} className="flex items-start gap-3 bg-surface-card rounded-lg p-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-mono text-accent-blue">{section.sectionNumber}</span>
                                      <span className="text-sm text-text-primary">{section.sectionTitle}</span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${generationStatusConfig[section.status]?.bgColor} ${generationStatusConfig[section.status]?.color}`}>
                                        {generationStatusConfig[section.status]?.label}
                                      </span>
                                    </div>
                                    {section.highlightedAreas.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {section.highlightedAreas.slice(0, 2).map((area, idx) => (
                                          <span key={idx} className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            <AlertCircle className="w-3 h-3 inline mr-1" />
                                            {area.length > 50 ? area.substring(0, 50) + '...' : area}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {section.confidenceScore > 0 && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        section.confidenceScore >= 85 ? 'bg-green-500/20 text-green-400' :
                                        section.confidenceScore >= 70 ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-red-500/20 text-red-400'
                                      }`}>
                                        {section.confidenceScore}%
                                      </span>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      icon={<Eye className="w-3.5 h-3.5" />}
                                      onClick={() => {
                                        const matchDoc = documents.find(d => d.id === job.documentId) || authoringDocuments.find(d => d.id === job.documentId);
                                        if (matchDoc) { setSelectedDocument(matchDoc as typeof selectedDocument); setViewMode('editor'); }
                                        else setViewMode('editor');
                                      }}
                                    >
                                      Review
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        {job.status === 'ready' && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            icon={<Play className="w-4 h-4" />}
                            onClick={() => {
                              // v0.27.66: Open streaming panel for first section
                              setStreamingJobId(job.id);
                              setStreamingSectionIndex(0);
                              setShowStreamingPanel(true);
                            }}
                          >
                            Generate Now
                          </Button>
                        )}
                        {job.status === 'generating' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            icon={<Sparkles className="w-4 h-4 animate-pulse" />}
                            onClick={() => {
                              // v0.27.66: Open streaming panel to view progress
                              setStreamingJobId(job.id);
                              setStreamingSectionIndex(0);
                              setShowStreamingPanel(true);
                            }}
                          >
                            <StreamingIndicator isActive={true} wordCount={127} tokensPerSecond={42.5} />
                            View Progress
                          </Button>
                        )}
                        {(job.status === 'review-required' || job.status === 'in-review') && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            icon={<Eye className="w-4 h-4" />}
                            onClick={() => {
                              const matchDoc = documents.find(d => d.id === job.documentId) || authoringDocuments.find(d => d.id === job.documentId);
                              if (matchDoc) { setSelectedDocument(matchDoc as typeof selectedDocument); setViewMode('document-detail'); setShowEnhancedReviewPanel(true); }
                              else { setViewMode('documents'); }
                            }}
                          >
                            Review Content
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          icon={<FileText className="w-4 h-4" />}
                          onClick={() => {
                            const sources = useAuthoringStore.getState?.()?.availableSources || [];
                            // Show first linked source, or first available, or fallback
                            const firstLinked = sources.find(s => s.status === 'linked');
                            const firstAvail  = sources[0];
                            const fallback = {
                              id: 'src-csr-001',
                              title: `${selectedDocument?.title || 'Document'} — Source Data`,
                              type: 'clinical-study-report',
                              version: '1.0',
                              status: 'linked' as const,
                              sections: [],
                            };
                            setViewingSource((firstLinked || firstAvail || fallback) as import('@/store/useAuthoringStore').SourceDocument);
                          }}
                        >
                          View Source Data
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          icon={<History className="w-4 h-4" />}
                          onClick={() => {
                            setStreamingJobId(job.id);
                            setStreamingSectionIndex(0);
                            setShowStreamingPanel(true);
                          }}
                        >
                          Generation Log
                        </Button>
                        <div className="flex-1" />
                        {job.status === 'approved' && (
                          <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => {
                            const matchDoc = documents.find(d => d.id === job.documentId) || authoringDocuments.find(d => d.id === job.documentId);
                            if (matchDoc) {
                              setSelectedDocument(matchDoc as typeof selectedDocument);
                              setViewMode('document-detail');
                            } else {
                              setViewMode('documents');
                            }
                          }}>
                            Send to Authoring
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* R&D Connected Callout */}
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-accent-purple mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">R&D Connected: Data → Documents</h3>
                  <p className="text-sm text-text-muted">
                    When Study LIG-301 locked, Ligature didn't send an email. It drafted your Module 2.7.3 efficacy summary, 
                    populated your CSR tables, and flagged what still needs clinical review. That's not document management — 
                    that's document generation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ TEMPLATES VIEW - v0.42.10 ============ */}
        {viewMode === 'templates' && (
          <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="px-6 pt-6">
              <Breadcrumb 
                moduleId="authoring"
                viewLabel="Template Library"
                className="mb-4"
              />
              <ReturnBreadcrumb variant="inline" className="mb-4" />
            </div>
            
            {/* Template Browser */}
            <div className="flex-1 px-6 pb-6 overflow-hidden">
              <TemplateBrowser
                onSelectTemplate={(template) => {
                  toast.info(`Preview: ${template.name}\n\nModule: ${template.ctdModule || 'N/A'}\nGuidance: ${template.ichGuideline || 'N/A'}\nSections: ${template.sections.length}\nEst. Hours: ${template.estimatedHours}`);
                }}
                onCreateDocument={(template) => {
                  // Navigate to new document wizard with template pre-selected
                  toast.success(`Creating document from: ${template.name}`);
                  setViewMode('new-document');
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Review Workflow Panel */}
      {showReviewPanel && selectedDocument && (
        <ReviewWorkflowPanel
          document={selectedDocument}
          onClose={() => setShowReviewPanel(false)}
          onSendForReview={(stage, reviewers) => {
            // TODO: Implement review submission
            setShowReviewPanel(false);
            // In real app, would update document status
          }}
        />
      )}

      {/* Enhanced Review Workflow Panel */}
      {showEnhancedReviewPanel && selectedDocument && (
        <EnhancedReviewWorkflowPanel
          document={selectedDocument}
          onClose={() => setShowEnhancedReviewPanel(false)}
          onSendForReview={(reviewId) => {
            // v0.44.9: Bump minor version when sent for review (e.g. 0.1 → 0.2)
            const reviewVersion = versionForTransition(selectedDocument.version || '0.1', 'submit-internal');
            updateDocument(selectedDocument.id, { version: reviewVersion });
            persistence.updateDocument(selectedDocument.id, { status: 'internal-review', version: reviewVersion }).catch(() => {});
            setSelectedDocument(prev => prev ? { ...prev, version: reviewVersion } : prev);
            setShowEnhancedReviewPanel(false);
            toast.success(`Sent for review — version ${reviewVersion}`);
          }}
        />
      )}

      {/* Reconciliation Report Panel */}
      {showReconciliationReport && selectedDocument && (
        <ReconciliationReportPanel
          document={selectedDocument}
          onClose={() => setShowReconciliationReport(false)}
        />
      )}

      {/* Review Decision Dialog */}
      {showReviewDecision && selectedDocument && (
        <ReviewDecisionDialog
          document={selectedDocument}
          reviewerName="Jennifer Park"
          stageName="Cross-Functional Review"
          onClose={() => setShowReviewDecision(false)}
          onSubmit={(decision, comments) => {
            // v0.44.9: Bump minor version on each review stage completion
            const reviewVersion = versionForTransition(selectedDocument.version || '0.1', 'submit-qc');
            updateDocument(selectedDocument.id, {
              status: decision === 'approve' ? 'qc-review' as DocumentStatus : 'internal-review' as DocumentStatus,
              version: reviewVersion,
            });
            persistence.updateDocument(selectedDocument.id, { status: decision === 'approve' ? 'qc-review' : 'internal-review', version: reviewVersion }).catch(() => {});
            setSelectedDocument(prev => prev ? {
              ...prev,
              status: decision === 'approve' ? 'qc-review' as DocumentStatus : 'internal-review' as DocumentStatus,
              version: reviewVersion,
            } : prev);
            toast.success(
              decision === 'approve'
                ? `Review approved — version ${reviewVersion}, moved to QC`
                : `Revisions requested — version ${reviewVersion}`
            );
            setShowReviewDecision(false);
          }}
        />
      )}

      {/* Amendment Workflow */}
      {showAmendment && selectedDocument && (
        <AmendmentWorkflow
          document={selectedDocument}
          onClose={() => setShowAmendment(false)}
          onCreateAmendment={(amendmentData) => {
            // v0.44.9: Use proper version utility for amendment versioning
            const newVersion = versionForTransition(selectedDocument.version || '1.0', 'revise');
            const amendedDoc: AuthoringDocument = {
              ...selectedDocument,
              id: `${selectedDocument.id}-v${newVersion}`,
              version: newVersion,
              status: 'drafting' as DocumentStatus,
              progress: 0,
            };
            // v0.21.6: Use store action to add amended document
            addDocument(amendedDoc);
            setSelectedDocument(amendedDoc);
            setShowAmendment(false);
          }}
        />
      )}

      {/* QC Checklist */}
      {showQCChecklist && selectedDocument && (
        <QCChecklist
          document={selectedDocument}
          onClose={() => setShowQCChecklist(false)}
          onComplete={(passed, report) => {
            // QC complete
            if (passed) {
              // v0.21.6: Use store action
              updateDocument(selectedDocument.id, { status: 'final-review' as any });
              persistence.updateDocument(selectedDocument.id, { status: 'final-review' as any }).catch(() => {});
            }
            setShowQCChecklist(false);
          }}
        />
      )}

      {/* AI QC - v0.27.57 */}
      {showAIQC && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAIQC(false)}>
          <div 
            className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-purple/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">AI Document QC</h2>
                  <p className="text-xs text-text-muted">{selectedDocument.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAIQC(false)} 
                className="p-2 hover:bg-surface-card rounded-lg"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-auto flex-1">
              <DocumentQCPanel
                documentId={selectedDocument.id}
                documentTitle={selectedDocument.title}
                documentType={
                  selectedDocument.documentType === 'csr' ? 'csr' :
                  selectedDocument.documentType === 'protocol' ? 'protocol' :
                  selectedDocument.documentType === 'ib' ? 'ib' :
                  selectedDocument.documentType === 'module-2-summary' ? 'summary' :
                  'other'
                }
                sections={selectedDocument.sections?.map((s, idx) => ({
                  id: s.id || `section-${idx}`,
                  title: s.title || `Section ${idx + 1}`,
                  content: s.content || '',
                })) || [
                  // Fallback demo sections if document has no sections
                  { id: 'synopsis', title: 'Synopsis', content: 'Study LIG-2847-301 was a Phase 3, randomized, double-blind, placebo-controlled study to evaluate the efficacy and safety of LIG-2847 in patients with KRAS G12C-mutated NSCLC who had received prior systemic therapy. The primary endpoint was overall survival (OS).' },
                  { id: 'intro', title: 'Introduction', content: 'Non-small cell lung cancer (NSCLC) remains a significant cause of cancer mortality worldwide. KRAS mutations are present in approximately 25% of NSCLC cases, with G12C being the most common variant.' },
                  { id: 'efficacy', title: 'Efficacy Evaluation', content: 'The primary efficacy analysis demonstrated a statistically significant improvement in OS with LIG-2847 compared to placebo. Median OS was 12.5 months vs 8.3 months (HR 0.68, 95% CI 0.55-0.85, p=0.0003).' },
                ]}
                guidelines={['ICH E3', 'ICH E6', 'FDA 21 CFR Part 11']}
                onComplete={(score) => {
                  // AI QC scoring complete
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature */}
      {showDigitalSignature && selectedDocument && (
        <DigitalSignature
          document={selectedDocument}
          action={signatureAction}
          onClose={() => setShowDigitalSignature(false)}
          onSign={(signature) => {
            if (signature.action === 'approve') {
              // v0.44.9: Bump to major version on approval (e.g. 0.4 → 1.0)
              const approvedVersion = versionForTransition(selectedDocument.version || '0.1', 'approve');
              const approvePayload = { status: 'approved' as DocumentStatus, version: approvedVersion, approvedDate: new Date().toISOString() };
              updateDocument(selectedDocument.id, approvePayload);
              persistence.updateDocument(selectedDocument.id, { status: 'approved', version: approvedVersion, approvedDate: new Date().toISOString() }).catch(() => {});
              setSelectedDocument(prev => prev ? { ...prev, ...approvePayload } : prev);
              toast.success(`Document approved — version ${approvedVersion}`);
            } else if (signature.action === 'reject') {
              // Rejected: bump minor and send back to drafting
              const revisedVersion = bumpMinorLocal(selectedDocument.version || '0.1');
              const rejectPayload = { status: 'drafting' as DocumentStatus, version: revisedVersion };
              updateDocument(selectedDocument.id, rejectPayload);
              persistence.updateDocument(selectedDocument.id, { status: 'drafting', version: revisedVersion }).catch(() => {});
              setSelectedDocument(prev => prev ? { ...prev, ...rejectPayload } : prev);
              toast.info(`Document returned for revision — version ${revisedVersion}`);
            }
            setShowDigitalSignature(false);
          }}
        />
      )}

      {/* Version Comparison */}
      {showVersionComparison && selectedDocument && (
        <VersionComparison
          document={selectedDocument}
          onClose={() => setShowVersionComparison(false)}
        />
      )}

      {/* Finalize to Document Store Dialog */}
      {showFinalizeDialog && selectedDocument && (
        <FinalizeDocumentDialog
          document={selectedDocument}
          onClose={() => setShowFinalizeDialog(false)}
          onFinalized={(documentStoreId) => {
            // v0.21.6: Use store action to update document with finalization info
            const finalizeData = {
              status: 'submission-ready' as DocumentStatus,
              documentStoreId,
              finalizedAt: new Date().toISOString(),
              finalizedBy: 'Current User',
            };
            updateDocument(selectedDocument.id, finalizeData);
            // v0.117.1: Persist finalization to backend
            persistence.finalizeDocument(selectedDocument.id, 'current-user', 'Current User').catch(() => {});
            setSelectedDocument({ ...selectedDocument, ...finalizeData });
            setShowFinalizeDialog(false);
            toast.success(`Document finalized and added to Document Store`);
          }}
        />
      )}

      {/* Document Viewer */}
      {showDocumentViewer && selectedDocument && (
        <DocumentViewer
          document={authoringToViewerDocument(selectedDocument)}
          onClose={() => setShowDocumentViewer(false)}
          onEdit={(sectionId) => {
            setShowDocumentViewer(false);
            setViewMode('editor');
          }}
        />
      )}

      {/* Cross-References Panel */}
      {showCrossReferences && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Document Cross-References</h2>
                <p className="text-sm text-text-muted">{selectedDocument.shortTitle}</p>
              </div>
              <button
                onClick={() => setShowCrossReferences(false)}
                className="p-2 hover:bg-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 md:space-y-6">
              {/* Outgoing References */}
              {(() => {
                const refs = getReferencesForDocument(selectedDocument.id);
                return (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-accent-blue" />
                        This Document References ({refs.outgoingReferences.length})
                      </h3>
                      {refs.outgoingReferences.length > 0 ? (
                        <div className="space-y-2">
                          {refs.outgoingReferences.map(ref => (
                            <div key={ref.id} className="bg-surface-card border border-border rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-xs px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue">
                                    {crossReferenceTypeLabels[ref.referenceType]}
                                  </span>
                                  <p className="text-sm font-medium text-text-primary mt-2">{ref.targetDocumentTitle}</p>
                                  {ref.targetSectionTitle && (
                                    <p className="text-xs text-text-muted mt-1">Section: {ref.targetSectionTitle}</p>
                                  )}
                                  <p className="text-xs text-text-muted mt-1 italic">{ref.referenceText}</p>
                                </div>
                                <button className="p-1.5 hover:bg-surface rounded-lg transition-colors" title="Open source document" onClick={() => toast.info('Source document link — connect a document repository in Settings to enable direct access.')}>
                                  <ExternalLink className="w-4 h-4 text-text-muted" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted italic">No outgoing references</p>
                      )}
                    </div>

                    {/* Incoming References */}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-accent-purple" />
                        Referenced By ({refs.incomingReferences.length})
                      </h3>
                      {refs.incomingReferences.length > 0 ? (
                        <div className="space-y-2">
                          {refs.incomingReferences.map(ref => (
                            <div key={ref.id} className="bg-surface-card border border-border rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-xs px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple">
                                    {getCrossReferenceDescription(ref.referenceType, false)}
                                  </span>
                                  <p className="text-sm font-medium text-text-primary mt-2">{ref.sourceDocumentTitle}</p>
                                  {ref.sourceSectionTitle && (
                                    <p className="text-xs text-text-muted mt-1">Section: {ref.sourceSectionTitle}</p>
                                  )}
                                  <p className="text-xs text-text-muted mt-1 italic">{ref.referenceText}</p>
                                </div>
                                <button
                                  className="p-1.5 hover:bg-surface rounded-lg transition-colors flex items-center gap-1 text-xs text-accent-blue"
                                  onClick={() => { useAppStore.getState().setActiveModule('document-control'); toast.info(`Opening: ${ref.sourceDocumentTitle}`); }}
                                  title="Open source document"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted italic">No incoming references</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-between items-center">
              <button className="text-sm text-accent-blue hover:underline flex items-center gap-1" onClick={deadClick}>
                <Plus className="w-4 h-4" />
                Add Reference
              </button>
              <button
                onClick={() => setShowCrossReferences(false)}
                className="px-4 py-2 bg-surface-card hover:bg-surface border border-border rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* v0.27.66: AI Streaming Generation Panel */}
      {showStreamingPanel && streamingJobId && (() => {
        const job = getJobById(streamingJobId);
        if (!job) return null;
        
        const sectionToGenerate = job.sections[streamingSectionIndex];
        if (!sectionToGenerate) return null;
        
        // Convert job data to section generation format
        const section: import('@/types/authoring').DocumentSection = {
          id: sectionToGenerate.sectionId,
          number: sectionToGenerate.sectionNumber,
          title: sectionToGenerate.sectionTitle,
          level: 1,
          status: 'not-started',
          progress: 0,
          contentBlocks: [],
          wordCount: 0,
          comments: [],
          hasUnresolvedComments: false,
          sourceLinks: [],
          tflLinks: [],
          required: true,
        };
        
        const context = {
          productName: job.productName,
          studyName: job.studyName,
          indication: 'NSCLC', // Demo indication
        };
        
        // Create mock source documents for generation
        const sources: import('@/store/useAuthoringStore').SourceDocument[] = [
          {
            id: 'src-clinical-study-report',
            title: `${job.studyName} - Clinical Study Report`,
            type: 'clinical-study-report',
            version: '1.0',
            status: 'linked',
            sections: [
              { id: 'eff-1', number: '11.1', title: 'Efficacy Results' },
              { id: 'saf-1', number: '12.1', title: 'Safety Results' },
              { id: 'dem-1', number: '10.1', title: 'Demographics' },
            ],
          },
          {
            id: 'src-stat-analysis',
            title: `${job.studyName} - Statistical Analysis Plan`,
            type: 'statistical-analysis',
            version: '2.1',
            status: 'linked',
            sections: [
              { id: 'pri-1', number: '5.1', title: 'Primary Endpoints' },
              { id: 'sec-1', number: '5.2', title: 'Secondary Endpoints' },
            ],
          },
        ];
        
        return (
          <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowStreamingPanel(false);
              }
            }}
          >
            <div className="w-full max-w-4xl max-h-[90vh]">
              <AuthoringStreamingPanel
                section={section}
                documentType={job.documentType as DocumentType}
                context={context}
                sources={sources}
                onComplete={(content, qualityScore) => {
                  toast.success(`Section generated with ${qualityScore}% quality score`);
                  // Move to next section if available
                  if (streamingSectionIndex < job.sections.length - 1) {
                    setStreamingSectionIndex(prev => prev + 1);
                  }
                }}
                onClose={() => {
                  setShowStreamingPanel(false);
                  setStreamingJobId(null);
                  setStreamingSectionIndex(0);
                }}
                expanded={true}
              />
            </div>
          </div>
        );
      })()}
      
      {/* v0.27.69: Batch Section Generation Panel */}
      {showBatchGeneration && batchGenerationContext && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBatchGeneration(false);
            }
          }}
        >
          <div className="w-full max-w-5xl max-h-[90vh]">
            <BatchGenerationPanel
              sections={selectedDocument?.sections ? convertDocumentSectionsToBatch(selectedDocument.sections) : []}
              documentType={selectedDocument?.documentType || 'csr'}
              context={batchGenerationContext}
              presetName={selectedDocument?.templateName || 'Document Sections'}
              onComplete={(sections) => {
                // v0.44.9: Apply generated content to document sections
                if (selectedDocument && sections.length > 0) {
                  // Write each generated section's content into the store
                  sections.forEach(({ sectionId, content }) => {
                    updateSectionContent(sectionId, content);
                    updateSectionStatus(sectionId, 'in-progress');
                  });

                  // Bump version to 0.1 if not yet started, and move to drafting
                  const newVersion = versionForTransition(
                    selectedDocument.version || '0.0',
                    'start-draft'
                  );
                  updateDocument(selectedDocument.id, {
                    status: 'drafting' as DocumentStatus,
                    version: newVersion,
                    progress: Math.round((sections.length / Math.max(selectedDocument.sectionsTotal, 1)) * 100),
                  });
                  persistence.updateDocument(selectedDocument.id, { status: 'drafting', version: newVersion }).catch(() => {});

                  // Update local selected doc state so editor reflects changes immediately
                  setSelectedDocument(prev => prev ? {
                    ...prev,
                    status: 'drafting' as DocumentStatus,
                    version: newVersion,
                  } : prev);

                  // Navigate to editor so user can see the generated content
                  setViewMode('editor');

                  toast.success(
                    `${sections.length} section${sections.length === 1 ? '' : 's'} generated and applied — review in editor`
                  );
                } else {
                  toast.success('Batch generation complete');
                }

                setShowBatchGeneration(false);
                setBatchGenerationContext(null);
              }}
              onClose={() => {
                setShowBatchGeneration(false);
                setBatchGenerationContext(null);
              }}
            />
          </div>
        </div>
      )}
      
      {/* v0.30.4: Authoring Kickoff Modal */}
      {showAuthoringKickoff && selectedDocument && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAuthoringKickoff(false);
              setViewMode('editor');
            }
          }}
        >
          <div className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-border bg-gradient-to-r from-violet-500/10 to-blue-500/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <FileText className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Document Created</h2>
                  <p className="text-sm text-text-muted">{selectedDocument.shortTitle || selectedDocument.title}</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 md:p-6">
              {pendingAIMode === 'document' ? (
                <>
                  <p className="text-sm text-text-secondary mb-4">
                    Your document has <span className="font-semibold text-text-primary">{selectedDocument.sectionsTotal || selectedDocument.sections?.length || 0} sections</span>. 
                    You selected <span className="text-blue-400 font-medium">Author Document</span> mode for batch AI generation.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowAuthoringKickoff(false);
                        // Open batch generation with document context
                        setBatchGenerationContext({
                          productName: selectedDocument.productName || 'Unknown Product',
                          indication: selectedDocument.indication,
                          studyIds: selectedDocument.studyId ? [selectedDocument.studyId] : [],
                        });
                        setShowBatchGeneration(true);
                      }}
                      className="w-full flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-blue-400" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-text-primary">Generate All Sections</div>
                          <div className="text-xs text-text-muted">AI will draft all sections with source linking</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowAuthoringKickoff(false);
                        setViewMode('editor');
                      }}
                      className="w-full flex items-center justify-between p-4 bg-surface-card border border-border rounded-lg hover:border-violet-500/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Edit3 className="w-5 h-5 text-text-muted" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-text-primary">Open Editor</div>
                          <div className="text-xs text-text-muted">Generate sections one at a time</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-secondary mb-4">
                    Your document is ready for authoring. You selected <span className="text-violet-400 font-medium">Author Section</span> mode.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowAuthoringKickoff(false);
                        setViewMode('editor');
                      }}
                      className="w-full flex items-center justify-between p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg hover:bg-violet-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-violet-400" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-text-primary">Start Authoring</div>
                          <div className="text-xs text-text-muted">Open editor with AI assistance per section</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowAuthoringKickoff(false);
                        setViewMode('document-detail');
                      }}
                      className="w-full flex items-center justify-between p-4 bg-surface-card border border-border rounded-lg hover:border-border-accent transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Eye className="w-5 h-5 text-text-muted" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-text-primary">View Document</div>
                          <div className="text-xs text-text-muted">Review structure before authoring</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-surface-card border-t border-border">
              <button
                onClick={() => {
                  setShowAuthoringKickoff(false);
                  setPendingAIMode(null);
                  setViewMode('documents');
                }}
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Save for later →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
