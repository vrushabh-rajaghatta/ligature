

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { 
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FileText,
  CheckCircle,
  Clock,
  Send,
  Eye,
  Download,
  MessageSquare,
  Globe,
  ExternalLink,
  Plus,
  Package,
  Layers,
  X,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRight,
  Home,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FileCode,
  Table,
  GripVertical,
  BookOpen,
  GitBranch
} from 'lucide-react';
import {
  Link2,
  FileCheck,
  Code,
  Zap,
  Shield,
  LayoutGrid,
} from 'lucide-react';
import { ectdApplications, getFilteredApplications, ARCHIVE_PATHS } from '@/data/ectd-data';
import { 
  nexavantSequenceAssembly, 
  assemblyDashboardSummary, 
  submissionAssemblyQueue,
  slotStatusConfig,
  documentReadinessConfig,
  getSlotsByModule,
  getReadyToIntegrate,
  getRecentIntegrations
} from '@/data/submission-assembly-data';
import {
  csrEfficacyThread,
  module273Thread,
  module274Thread,
  csrFullThread,
  allSubmissionThreads,
  threadSummary,
  threadStageConfig,
  overallStatusConfig,
  getBlockedReasons,
} from '@/data/submission-thread-data';
import { ECTDApplication, ECTDSequence, ECTDDocument, CTD_MODULES } from '@/types/ectd';
import { CTDTree } from '@/components/ectd/CTDTree';
import { SequenceTimeline } from '@/components/ectd/SequenceTimeline';
import { SubmissionBuilder } from '@/components/submissions/SubmissionBuilder';
import { ValidationPanel } from '@/components/submissions/ValidationPanel';
import { HyperlinkManagerPanel } from '@/components/publishing/HyperlinkManagerPanel';
import { PDFValidatorPanel } from '@/components/publishing/PDFValidatorPanel';
import { BackboneGeneratorPanel } from '@/components/publishing/BackboneGeneratorPanel';
import { PublishingWorkflowPanel } from '@/components/publishing/PublishingWorkflowPanel';
import { AuditTrailPanel } from '@/components/AuditTrailPanel';
import { useSequenceBuilderStore } from '@/store/useSequenceBuilderStore';
import { FilterState } from '@/components/layout/FilterBar';
import { useToast } from '@/components/ui/Toast';
import { ScrollFadeContainer } from '@/components/ui/ScrollFadeContainer';
import { useDataPackageStore } from '@/store/useDataPackageStore';
import { useViewerActions, type ECTDViewerDocument } from '@/hooks/useDocumentViewerService';
// v99: UI Component Library imports
import { EmptyState as UIEmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
import type { BadgeColor } from '@/components/ui/Badge';
import { CrossReferenceGraph } from '@/components/viewer/CrossReferenceGraph';
import { DocumentImpactAnalysis } from '@/components/viewer/DocumentImpactAnalysis';

interface ECTDWorkspaceScreenProps {
  filters?: FilterState;
  embedded?: boolean; // v0.9.17d: When true, hide header for unified publishing
}

// Document history entry for breadcrumb navigation
interface DocumentHistoryEntry {
  document: ECTDDocument;
  scrollPosition?: number;
  timestamp: number;
}

type ViewMode = 'overview' | 'viewer' | 'builder' | 'publishing-tools' | 'workflow' | 'compliance' | 'cross-references' | 'impact-analysis' | 'assembly' | 'thread';
type PreviewPaneSize = 'collapsed' | 'normal' | 'expanded' | 'fullscreen';

// v99: Color maps for Badge components
const sequenceStatusColorMap: Record<ECTDSequence['status'], BadgeColor> = {
  'draft': 'slate',
  'validated': 'blue',
  'submitted': 'amber',
  'acknowledged': 'emerald',
  'under-review': 'purple',
  'approved': 'green',
};

const documentOperationColorMap: Record<ECTDDocument['operation'], BadgeColor> = {
  'new': 'green',
  'replace': 'amber',
  'append': 'blue',
  'delete': 'red',
};

const ectdVersionColorMap: Record<string, BadgeColor> = {
  '4.0': 'purple',
  '3.2.2': 'slate',
  '3.2': 'slate',
};

// v99: Badge helper functions
export const getSequenceStatusBadge = (status: ECTDSequence['status']) => (
  <Badge color={sequenceStatusColorMap[status]} size="xs">
    {status.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
  </Badge>
);

export const getDocumentOperationBadge = (operation: ECTDDocument['operation']) => (
  <Badge color={documentOperationColorMap[operation]} size="xs">
    {operation}
  </Badge>
);

export const getECTDVersionBadge = (version: string) => (
  <Badge color={ectdVersionColorMap[version] || 'slate'} size="xs">
    v{version}
  </Badge>
);

export function ECTDWorkspaceScreen({ filters, embedded = false }: ECTDWorkspaceScreenProps) {
  const toast = useToast();
  const manifest = useDataPackageStore(s => s.manifest);
  const markImported = useDataPackageStore(s => s.markImported);
  const createDraft = useSequenceBuilderStore(s => s.createDraft);
  const currentDraft = useSequenceBuilderStore(s => s.currentDraft);
  const setCurrentDraft = useSequenceBuilderStore(s => s.setCurrentDraft);
  const { openECTDDocument } = useViewerActions();
  
  // Get filtered applications
    const { deadClick } = useDeadClick();
  const filteredApps = useMemo(() => {
    if (!filters) return ectdApplications;
    return getFilteredApplications({
      product: filters.product,
      region: filters.region,
      applicationType: filters.applicationType,
    });
  }, [filters]);

  // Core state
  const [selectedApp, setSelectedApp] = useState<ECTDApplication | null>(filteredApps[0] || null);
  const [selectedSequence, setSelectedSequence] = useState<ECTDSequence | null>(filteredApps[0]?.sequences[0] || null);
  const [selectedDocument, setSelectedDocument] = useState<ECTDDocument | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [ectdViewMode, setEctdViewMode] = useState<'sequence' | 'cumulative' | 'current'>('sequence');
  
  // Document preview state
  const [previewPaneSize, setPreviewPaneSize] = useState<PreviewPaneSize>('normal');
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [popoutWindow, setPopoutWindow] = useState<Window | null>(null);
  const [documentHistory, setDocumentHistory] = useState<DocumentHistoryEntry[]>([]);
  
  // v130: Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pdfZoom, setPdfZoom] = useState(100);
  
  // Resizable pane state
  const [previewWidth, setPreviewWidth] = useState(480);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingPanel, setResizingPanel] = useState<'left' | 'right' | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // v83: Open document in platform-wide viewer
  const handleOpenInViewer = useCallback((doc: ECTDDocument) => {
    if (!selectedApp || !selectedSequence) return;
    
    const viewerDoc: ECTDViewerDocument = {
      id: doc.id,
      title: doc.title,
      filePath: doc.filePath,
      fileType: doc.fileType as 'pdf' | 'xml' | 'doc' | 'docx' | 'rtf',
      module: doc.module,
      section: doc.section,
      operation: doc.operation,
      sequenceNumber: selectedSequence.sequenceNumber,
      applicationNumber: selectedApp.number,
      archivePath: selectedApp.archivePath,
    };
    
    openECTDDocument(viewerDoc, { readOnly: true });
  }, [selectedApp, selectedSequence, openECTDDocument]);

  // Preview pane widths by size
  const paneWidths: Record<PreviewPaneSize, number> = {
    collapsed: 0,
    normal: 480,
    expanded: 720,
    fullscreen: typeof window !== 'undefined' ? window.innerWidth - 300 : 1200,
  };

  // Handle document selection with history tracking
  const handleSelectDocument = useCallback((doc: ECTDDocument) => {
    if (selectedDocument?.id === doc.id) return;
    
    // Add to history
    const newEntry: DocumentHistoryEntry = {
      document: doc,
      timestamp: Date.now(),
    };
    
    // If we're not at the end of history, truncate forward history
    const newHistory = documentHistory.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setDocumentHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setSelectedDocument(doc);
    
    // Auto-expand preview pane if collapsed
    if (previewPaneSize === 'collapsed') {
      setPreviewPaneSize('normal');
    }
  }, [selectedDocument, documentHistory, historyIndex, previewPaneSize]);

  // Navigate through document history
  const navigateHistory = useCallback((direction: 'back' | 'forward') => {
    if (direction === 'back' && historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedDocument(documentHistory[historyIndex - 1].document);
    } else if (direction === 'forward' && historyIndex < documentHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedDocument(documentHistory[historyIndex + 1].document);
    }
  }, [historyIndex, documentHistory]);

  // Open document in external viewer/popout - v0.12.6: Fixed to use demo content instead of non-existent URLs
  const openDocument = useCallback((doc: ECTDDocument, inPopout: boolean = false) => {
    if (!selectedApp || !selectedSequence) return;
    
    // Use the in-app viewer for document preview
    // This prevents 404 errors from trying to access non-existent file paths
    toast.info('Opening document in platform viewer');
    handleOpenInViewer(doc);
  }, [selectedApp, selectedSequence, toast, handleOpenInViewer]);

  // Get document preview URL
  const getDocumentPreviewUrl = useCallback((doc: ECTDDocument) => {
    if (!selectedApp || !selectedSequence) return '';
    
    const archivePath = selectedApp?.archivePath;
    const seqFolder = selectedApp?.ectdVersion === '3.2.2' 
      ? selectedSequence?.sequenceNumber.padStart(4, '0')
      : selectedSequence?.sequenceNumber;
    return `${archivePath}/${seqFolder}/${doc.filePath}`;
  }, [selectedApp, selectedSequence]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, panel: 'left' | 'right') => {
    e.preventDefault();
    setIsResizing(true);
    setResizingPanel(panel);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current || !resizingPanel) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      
      if (resizingPanel === 'right') {
        const newWidth = containerRect.right - e.clientX;
        // Clamp between min and max widths
        const clampedWidth = Math.max(320, Math.min(newWidth, containerRect.width - 400));
        setPreviewWidth(clampedWidth);
      } else if (resizingPanel === 'left') {
        const newWidth = e.clientX - containerRect.left;
        // Clamp between min and max widths
        const clampedWidth = Math.max(200, Math.min(newWidth, 500));
        setLeftPanelWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingPanel(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizingPanel]);

  // Calculate documents based on eCTD view mode
  const getViewModeDocuments = useCallback(() => {
    if (!selectedApp || !selectedSequence) return [];
    
    const sequenceIndex = selectedApp.sequences.findIndex(
      s => s.sequenceNumber === selectedSequence.sequenceNumber
    );
    
    if (ectdViewMode === 'sequence') {
      return selectedSequence.documents;
    }
    
    if (ectdViewMode === 'cumulative') {
      const allDocs: ECTDDocument[] = [];
      for (let i = 0; i <= sequenceIndex; i++) {
        selectedApp.sequences[i].documents.forEach(doc => {
          allDocs.push({
            ...doc,
            id: `${selectedApp.sequences[i].sequenceNumber}-${doc.id}`,
          });
        });
      }
      return allDocs;
    }
    
    if (ectdViewMode === 'current') {
      const currentState = new Map<string, ECTDDocument>();
      
      for (let i = 0; i <= sequenceIndex; i++) {
        const seq = selectedApp.sequences[i];
        seq.documents.forEach(doc => {
          const sectionKey = `${doc.module}-${doc.section}`;
          
          if (doc.operation === 'delete') {
            currentState.delete(sectionKey);
          } else if (doc.operation === 'replace' || doc.operation === 'new' || !currentState.has(sectionKey)) {
            currentState.set(sectionKey, {
              ...doc,
              id: `current-${doc.id}`,
            });
          } else if (doc.operation === 'append') {
            const existingDoc = currentState.get(sectionKey);
            if (existingDoc) {
              currentState.set(sectionKey, {
                ...doc,
                id: `current-${doc.id}`,
                title: `${existingDoc.title} (+ ${doc.title})`,
              });
            }
          }
        });
      }
      
      return Array.from(currentState.values());
    }
    
    return selectedSequence.documents;
  }, [selectedApp, selectedSequence, ectdViewMode]);

  // Update selection when filters change
  useEffect(() => {
    if (filteredApps.length > 0) {
      setSelectedApp(filteredApps[0]);
      setSelectedSequence(filteredApps[0]?.sequences?.[0] ?? null);
    } else {
      setSelectedApp(null);
      setSelectedSequence(null);
    }
  }, [filteredApps]);
  
  const handleCreateNewSequence = () => {
    if (!selectedApp) {
      toast.error('Please select an application first');
      return;
    }
    
    const maxSeq = Math.max(...selectedApp.sequences.map(s => parseInt(s.sequenceNumber)), 0);
    const nextSeqNum = String(maxSeq + 1).padStart(4, '0');
    
    createDraft({
      applicationId: selectedApp.id,
      sequenceNumber: nextSeqNum,
      sequenceType: 'amendment',
      description: 'New Sequence',
      region: selectedApp.region === 'US' ? 'fda' : selectedApp.region === 'EU' ? 'ema' : 'fda',
      createdBy: 'Sarah Chen',
    });
    
    setViewMode('builder');
    toast.success(`Created new sequence ${nextSeqNum}`);
  };

  const getSequenceStatusIcon = (status: ECTDSequence['status']) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4 text-slate-400" />;
      case 'validated': return <CheckCircle className="w-4 h-4 text-accent-blue" />;
      case 'submitted': return <Send className="w-4 h-4 text-accent-amber" />;
      case 'acknowledged': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'under-review': return <Eye className="w-4 h-4 text-accent-purple" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-accent-green" />;
    }
  };

  // v99: Removed legacy getStatusColor - using Badge component instead

  const getOperationBadge = (operation: ECTDDocument['operation']) => {
    // v99: Legacy helper for inline className usage - prefer documentOperationColorMap
    const colors = {
      new: 'bg-accent-green/20 text-accent-green',
      replace: 'bg-accent-amber/20 text-accent-amber',
      append: 'bg-accent-blue/20 text-accent-blue',
      delete: 'bg-accent-red/20 text-accent-red',
    };
    return colors[operation];
  };

  const getFileTypeIcon = (fileType: ECTDDocument['fileType']) => {
    switch (fileType) {
      case 'pdf': return <FileText className="w-4 h-4 text-accent-red" />;
      case 'xml': return <FileCode className="w-4 h-4 text-accent-amber" />;
      case 'xpt': return <Table className="w-4 h-4 text-accent-blue" />;
      default: return <FileText className="w-4 h-4 text-text-muted" />;
    }
  };

  // Get related correspondence
  const relatedCorrespondence = selectedApp && selectedSequence 
    ? selectedApp?.correspondence.filter(c => c.relatedSequence === selectedSequence?.sequenceNumber)
    : [];

  // Show empty state if no applications
  if (filteredApps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <UIEmptyState
          icon={<Package className="w-12 h-12" />}
          title="No Applications Found"
          description="Try adjusting your filters to see more results."
        />
      </div>
    );
  }

  // v130: Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><span className="text-sm text-text-muted">Loading eCTD workspace...</span></div>
      </div>
    );
  }

  // Calculate stats
  const totalSequences = filteredApps.reduce((acc, app) => acc + app.sequences.length, 0);
  const underReview = filteredApps.flatMap(app => app.sequences).filter(s => s.status === 'under-review').length;
  const submitted = filteredApps.flatMap(app => app.sequences).filter(s => s.status === 'submitted' || s.status === 'acknowledged').length;

  // Determine actual preview width based on size mode
  const actualPreviewWidth = previewPaneSize === 'collapsed' ? 0 
    : previewPaneSize === 'fullscreen' ? '100%'
    : previewWidth;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Data Package Banner — shown when a validated package is waiting to be imported */}
      {manifest && !manifest.importedToSubmission && (
        <div className="flex items-center gap-4 px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg flex-shrink-0">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-emerald-400">
                Validated Data Package Ready — {manifest.studyId}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {manifest.datasets.length} SDTM datasets · {manifest.totalRecords.toLocaleString()} records · Score {manifest.overallScore}% ·
                {manifest.packageStatus === 'READY' ? ' All datasets pass CDISC validation' : manifest.packageStatus === 'PARTIAL' ? ' Some datasets have warnings' : ' Blocking errors present'}
                <span className="ml-2 text-text-muted/60">{new Date(manifest.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Dataset pills */}
            <div className="hidden md:flex gap-1 flex-wrap max-w-xs">
              {manifest.datasets.slice(0, 6).map(d => (
                <span key={d.domain} className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${d.status === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' : d.status === 'FAIL' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {d.domain}
                </span>
              ))}
              {manifest.datasets.length > 6 && (
                <span className="text-[10px] text-text-muted">+{manifest.datasets.length - 6}</span>
              )}
            </div>
            <button
              onClick={() => {
                const seq = selectedSequence?.sequenceNumber ?? '0001';
                markImported(seq);
                toast.success(`${manifest.datasets.length} datasets imported to sequence ${seq}`, {
                  action: { label: 'View in Builder', onClick: () => setViewMode('builder') }
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Import to Submission
            </button>
            <button
              onClick={() => useDataPackageStore.getState().clearManifest()}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Imported confirmation */}
      {manifest?.importedToSubmission && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-500/5 border-b border-blue-500/15 flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-400">
            Data package imported to sequence {manifest.submissionSequence} · {manifest.datasets.length} datasets pre-mapped to eCTD slots · {manifest.importedAt ? new Date(manifest.importedAt).toLocaleTimeString() : ''}
          </span>
          <button onClick={() => useDataPackageStore.getState().clearManifest()} className="ml-auto text-[10px] text-text-muted hover:text-text-primary">Dismiss</button>
        </div>
      )}
      {/* Header - hidden when embedded in UnifiedPublishingScreen */}
      {!embedded && (
      <>
      {/* v0.51.0: ScreenHeader adoption — standardized header */}
      <ScreenHeader
        title="eCTD Workspace"
        subtitle="Browse, build, and manage eCTD submissions"
        icon={<FileCode className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-text-muted">
                <span className="font-semibold text-text-primary">{filteredApps.length}</span> Apps
              </span>
              <span className="text-text-muted">
                <span className="font-semibold text-accent-amber">{underReview}</span> In Review
              </span>
              <span className="text-text-muted">
                <span className="font-semibold text-accent-green">{submitted}</span> Submitted
              </span>
            </div>
            <Button
              onClick={handleCreateNewSequence}
              variant="primary"
              size="sm"
              className="bg-accent-green hover:bg-accent-green/90"
            >
              <Plus className="w-4 h-4" />
              New Sequence
            </Button>
          </div>
        }
      />
      <div className="border-b border-border bg-surface">
        <div className="px-6 pt-3 pb-2">
          {/* v117: Breadcrumb */}
          <Breadcrumb 
            moduleId="ectd-workspace" 
            viewLabel={viewMode === 'overview' ? 'Overview' :
                      viewMode === 'viewer' ? 'Viewer' :
                      viewMode === 'builder' ? 'Builder' :
                      viewMode === 'publishing-tools' ? 'Publishing Tools' :
                      viewMode === 'workflow' ? 'Workflow' :
                      viewMode === 'compliance' ? 'Compliance' :
                      viewMode === 'cross-references' ? 'Cross References' :
                      viewMode === 'impact-analysis' ? 'Impact Analysis' :
                      viewMode === 'assembly' ? 'Assembly' :
                      viewMode === 'thread' ? 'Thread' : 'Overview'}
            className="mb-1"
          />
        </div>
        {/* View Toggle */}
        <div className="px-6 pb-2 flex items-center gap-2">
          <div className="flex bg-surface-card rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setViewMode('viewer')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'viewer' 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Eye className="w-4 h-4" />
              Viewer
            </button>
            <button
              onClick={() => setViewMode('builder')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'builder' 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Package className="w-4 h-4" />
              Builder
            </button>
            <button
              onClick={() => setViewMode('publishing-tools')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'publishing-tools' 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Publish Tools
            </button>
            <button
              onClick={() => setViewMode('workflow')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'workflow' 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Zap className="w-4 h-4" />
              Workflow
            </button>
            <button
              onClick={() => setViewMode('compliance')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'compliance' 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Shield className="w-4 h-4" />
              Compliance
            </button>
            <button
              onClick={() => setViewMode('assembly')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'assembly' 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Assembly
            </button>
            <button
              onClick={() => setViewMode('thread')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'thread' 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Thread
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Embedded Mode Controls - Compact toolbar when header is hidden */}
      {embedded && (
        <div className="border-b border-border bg-surface-elevated px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex bg-surface-card rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setViewMode('viewer')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'viewer' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Eye className="w-4 h-4" />
              Viewer
            </button>
            <button
              onClick={() => setViewMode('builder')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'builder' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Package className="w-4 h-4" />
              Builder
            </button>
            <button
              onClick={() => setViewMode('publishing-tools')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'publishing-tools' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Publish Tools
            </button>
            <button
              onClick={() => setViewMode('cross-references')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'cross-references' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Cross-Refs
            </button>
            <button
              onClick={() => setViewMode('compliance')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'compliance' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Shield className="w-4 h-4" />
              Compliance
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              <span className="font-semibold text-text-primary">{filteredApps.length}</span> Apps
            </span>
            <Button onClick={handleCreateNewSequence} variant="primary" size="sm">
              <Plus className="w-4 h-4" />
              New Sequence
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'builder' ? (
        <SubmissionBuilder
          applicationId={selectedApp?.id || ''}
          applicationName={selectedApp ? `${selectedApp.type} ${selectedApp.number}` : ''}
          onClose={() => setViewMode('viewer')}
        />
      ) : viewMode === 'publishing-tools' ? (
        <div className="flex-1 overflow-hidden flex min-h-0 h-full">
          {/* Left Panel - Document List */}

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden fixed left-3 top-16 z-30 p-2 bg-surface-elevated border border-border rounded-lg shadow-lg text-text-secondary hover:text-text-primary"
              aria-label="Open eCTD Navigator"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
            </button>
            {mobileSidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />}
          <div className={`${mobileSidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden lg:flex"} w-80 bg-surface-elevated border-r border-border flex flex-col flex-shrink-0 overflow-hidden`}>
            <div className="p-3 border-b border-border flex-shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">Documents</h2>
              <p className="text-xs text-text-muted mt-0.5">{selectedSequence?.documents.length || 0} documents in sequence</p>
            </div>
            <ScrollFadeContainer direction="vertical" className="flex-1 overflow-y-auto p-2">
              {selectedSequence?.documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${
                    selectedDocument?.id === doc.id 
                      ? 'bg-accent-blue/10 border border-accent-blue/30' 
                      : 'hover:bg-surface-card border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getFileTypeIcon(doc.fileType)}
                    <span className="text-sm text-text-primary truncate">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span className={`px-1.5 py-0.5 rounded ${getOperationBadge(doc.operation)}`}>
                      {doc.operation}
                    </span>
                    <span>{doc.module}/{doc.section}</span>
                  </div>
                </button>
              ))}
            </ScrollFadeContainer>
          </div>
          
          {/* Publishing Tools Panels */}
          <div className="flex-1 flex">
            <div className="flex-1 border-r border-border">
              <HyperlinkManagerPanel 
                documents={selectedSequence?.documents || []} 
                selectedDocument={selectedDocument}
              />
            </div>
            <div className="flex-1 border-r border-border">
              <PDFValidatorPanel 
                documents={selectedSequence?.documents || []} 
                selectedDocument={selectedDocument}
              />
            </div>
            <div className="flex-1">
              <BackboneGeneratorPanel 
                documents={selectedSequence?.documents || []}
                submissionInfo={{
                  applicationNumber: selectedApp?.number,
                  applicationType: selectedApp?.type,
                  sequenceNumber: selectedSequence?.sequenceNumber,
                  companyName: 'Ligature Pharmaceuticals',
                }}
              />
            </div>
          </div>
        </div>
      ) : viewMode === 'workflow' ? (
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Sequence Info */}
          <div className="hidden lg:flex w-80 bg-surface-elevated border-r border-border flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">Selected Submission</h2>
              <p className="text-xs text-text-muted mt-1">Configure and run the end-to-end publishing workflow</p>
            </div>
            
            {/* Application/Sequence Selection */}
            <div className="p-4 border-b border-border">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Application</label>
                  <select
                    value={selectedApp?.id || ''}
                    onChange={(e) => {
                      const app = filteredApps.find(a => a.id === e.target.value);
                      if (app) {
                        setSelectedApp(app);
                        setSelectedSequence(app.sequences?.[0] ?? null);
                      }
                    }}
                    className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                  >
                    {filteredApps.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.type} {app.number} - {app.productName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Sequence</label>
                  <select
                    value={selectedSequence?.sequenceNumber || ''}
                    onChange={(e) => {
                      const seq = selectedApp?.sequences.find(s => s.sequenceNumber === e.target.value);
                      if (seq) {
                        setSelectedSequence(seq);
                      }
                    }}
                    className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                  >
                    {selectedApp?.sequences.map(seq => (
                      <option key={seq.sequenceNumber} value={seq.sequenceNumber}>
                        Seq {seq.sequenceNumber} - {seq.submissionType} ({seq.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submission Stats */}
            <div className="p-4 flex-1 overflow-auto">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Submission Contents</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Total Documents</span>
                  <span className="font-medium text-text-primary">{selectedSequence?.documents.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">PDF Documents</span>
                  <span className="font-medium text-text-primary">
                    {selectedSequence?.documents.filter(d => d.fileType === 'pdf').length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">New Documents</span>
                  <span className="font-medium text-accent-green">
                    {selectedSequence?.documents.filter(d => d.operation === 'new').length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Replacements</span>
                  <span className="font-medium text-accent-amber">
                    {selectedSequence?.documents.filter(d => d.operation === 'replace').length || 0}
                  </span>
                </div>
              </div>

              {/* Modules Breakdown */}
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-6 mb-3">By Module</h3>
              <div className="space-y-1">
                {['m1', 'm2', 'm3', 'm4', 'm5'].map(mod => {
                  const count = selectedSequence?.documents.filter(d => d.module === mod).length || 0;
                  return (
                    <div key={mod} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{mod.toUpperCase()}</span>
                      <span className="font-medium text-text-primary">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Workflow */}
          <div className="flex-1 bg-surface overflow-hidden">
            <PublishingWorkflowPanel
              documents={selectedSequence?.documents || []}
              applicationNumber={selectedApp?.number || 'Unknown'}
              sequenceNumber={selectedSequence?.sequenceNumber || '0000'}
              submissionType={selectedSequence?.submissionType || 'original'}
              companyName="Ligature Pharmaceuticals"
              region={selectedApp?.region === 'US' ? 'FDA' : selectedApp?.region === 'EU' ? 'EMA' : 'FDA'}
              onComplete={(workflow) => {
                toast.success(`Publishing workflow completed: ${workflow.documentsProcessed} documents processed`);
              }}
              onCancel={() => {
                toast.info('Publishing workflow cancelled');
              }}
            />
          </div>
        </div>
      ) : viewMode === 'compliance' ? (
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Compliance Overview */}
          <div className="hidden lg:flex w-80 bg-surface-elevated border-r border-border flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-accent-green" />
                <h2 className="text-sm font-semibold text-text-primary">21 CFR Part 11</h2>
              </div>
              <p className="text-xs text-text-muted">Electronic records compliance audit trail</p>
            </div>
            
            {/* Filter by Submission */}
            <div className="p-4 border-b border-border">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Filter Scope</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Application</label>
                  <select
                    value={selectedApp?.id || ''}
                    onChange={(e) => {
                      const app = filteredApps.find(a => a.id === e.target.value);
                      if (app) {
                        setSelectedApp(app);
                        setSelectedSequence(app.sequences?.[0] ?? null);
                      }
                    }}
                    className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="">All Applications</option>
                    {filteredApps.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.type} {app.number}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Sequence</label>
                  <select
                    value={selectedSequence?.sequenceNumber || ''}
                    onChange={(e) => {
                      const seq = selectedApp?.sequences.find(s => s.sequenceNumber === e.target.value);
                      if (seq) setSelectedSequence(seq);
                    }}
                    className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                    disabled={!selectedApp}
                  >
                    <option value="">All Sequences</option>
                    {selectedApp?.sequences.map(seq => (
                      <option key={seq.sequenceNumber} value={seq.sequenceNumber}>
                        Seq {seq.sequenceNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="p-4 flex-1 overflow-auto">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Compliance Status</h3>
              <div className="space-y-3">
                <div className="p-3 bg-accent-green/10 rounded-lg border border-accent-green/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-green" />
                    <span className="text-sm font-medium text-text-primary">Audit Trail Active</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">All actions are being logged</p>
                </div>
                
                <div className="p-3 bg-surface-card rounded-lg border border-border">
                  <div className="text-xs text-text-muted">Electronic Signatures</div>
                  <div className="text-lg font-semibold text-text-primary">Enabled</div>
                </div>
                
                <div className="p-3 bg-surface-card rounded-lg border border-border">
                  <div className="text-xs text-text-muted">Retention Policy</div>
                  <div className="text-lg font-semibold text-text-primary">7 Years</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Audit Trail */}
          <div className="flex-1 bg-surface overflow-hidden">
            <AuditTrailPanel 
              targetType={selectedApp ? 'submission' : undefined}
              targetId={selectedSequence?.sequenceNumber}
            />
          </div>
        </div>
      ) : viewMode === 'cross-references' ? (
        /* v0.9.17d: Cross-Reference Validation & Graph View */
        <CrossReferencesView
          selectedSequence={selectedSequence}
          selectedDocument={selectedDocument}
          selectedApp={selectedApp}
          onDocumentClick={(docId) => {
            const doc = selectedSequence?.documents.find(d => d.id === docId);
            if (doc) setSelectedDocument(doc);
          }}
          onViewDocument={(docId) => {
            const doc = selectedSequence?.documents.find(d => d.id === docId);
            if (doc) handleOpenInViewer(doc);
          }}
        />
      ) : viewMode === 'assembly' ? (
        /* v0.6.6: Submission Assembly View */
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Assembly Queue */}
          <div className="hidden lg:flex w-96 bg-surface-elevated border-r border-border flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="w-5 h-5 text-accent-blue" />
                <h2 className="text-sm font-semibold text-text-primary">Submission Assembly</h2>
              </div>
              <p className="text-xs text-text-muted">Document → eCTD integration queue</p>
              
              {/* Trigger Banner */}
              <div className="mt-3 p-2 bg-surface-card rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-amber" />
                  <span className="text-xs font-medium text-text-primary">
                    {assemblyDashboardSummary.documentsReadyToIntegrate} documents ready to integrate
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {assemblyDashboardSummary.documentsIntegratedToday} integrated today • {nexavantSequenceAssembly.overallReadiness}% overall readiness
                </div>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-2 p-3 border-b border-border">
              <div className="p-2 bg-surface-card rounded-lg text-center">
                <div className="text-lg font-bold text-emerald-400">{nexavantSequenceAssembly.filledSlots}</div>
                <div className="text-xs text-text-muted">Filled</div>
              </div>
              <div className="p-2 bg-surface-card rounded-lg text-center">
                <div className="text-lg font-bold text-blue-400">{nexavantSequenceAssembly.readyToFillSlots}</div>
                <div className="text-xs text-text-muted">Ready</div>
              </div>
              <div className="p-2 bg-surface-card rounded-lg text-center">
                <div className="text-lg font-bold text-red-400">{nexavantSequenceAssembly.blockedSlots}</div>
                <div className="text-xs text-text-muted">Blocked</div>
              </div>
            </div>

            {/* Assembly Queue List */}
            <div className="flex-1 overflow-auto p-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Integration Queue</h3>
              <div className="space-y-2">
                {submissionAssemblyQueue.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer hover:border-accent-blue/50 ${
                      item.status === 'ready' ? 'bg-blue-500/5 border-blue-500/20' :
                      item.status === 'integrated' ? 'bg-emerald-500/5 border-emerald-500/20' :
                      item.status === 'blocked' ? 'bg-red-500/5 border-red-500/20' :
                      'bg-surface-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{item.documentTitle}</div>
                        <div className="text-xs text-text-muted mt-0.5">→ {item.targetSlot} {item.targetSlotTitle}</div>
                      </div>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                        item.status === 'ready' ? 'bg-blue-500/20 text-blue-400' :
                        item.status === 'integrated' ? 'bg-emerald-500/20 text-emerald-400' :
                        item.status === 'pending-approval' ? 'bg-amber-500/20 text-amber-400' :
                        item.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {item.status.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className={`px-1.5 py-0.5 rounded ${
                        item.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                        item.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {item.priority}
                      </span>
                      <span>{item.operation}</span>
                      {item.automationEligible && (
                        <span className="flex items-center gap-1 text-accent-green">
                          <Zap className="w-3 h-3" />
                          auto
                        </span>
                      )}
                    </div>
                    
                    {item.blockedReason && (
                      <div className="mt-2 text-xs text-red-400 flex items-start gap-1">
                        <span className="shrink-0">⚠</span>
                        <span>{item.blockedReason}</span>
                      </div>
                    )}
                    
                    {item.status === 'ready' && (
                      <div className="mt-2 flex gap-2">
                        <button className="flex-1 px-2 py-1 text-xs font-medium bg-accent-blue text-white rounded hover:bg-accent-blue/90 transition-colors" onClick={deadClick}>
                          Integrate Now
                        </button>
                        <button className="px-2 py-1 text-xs font-medium bg-surface-card border border-border rounded hover:bg-surface-elevated transition-colors" onClick={deadClick}>
                          View
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Panel - Module Readiness Grid */}
          <div className="flex-1 overflow-auto p-6">
            {/* Application Context */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-accent-blue" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-text-primary">
                    {nexavantSequenceAssembly.applicationNumber} — Sequence {nexavantSequenceAssembly.sequenceNumber}
                  </h1>
                  <p className="text-sm text-text-muted">
                    {nexavantSequenceAssembly.productName} • {nexavantSequenceAssembly.submissionType} submission
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent-blue">{nexavantSequenceAssembly.overallReadiness}%</div>
                    <div className="text-xs text-text-muted">Overall Readiness</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">{nexavantSequenceAssembly.targetDate}</div>
                    <div className="text-xs text-text-muted">Target Date</div>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 bg-surface-card rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-accent-blue to-accent-green transition-all duration-500"
                  style={{ width: `${nexavantSequenceAssembly.overallReadiness}%` }}
                />
              </div>
            </div>

            {/* Module Readiness Cards */}
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Module Readiness</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {nexavantSequenceAssembly.moduleReadiness.map(mod => (
                <div key={mod.module} className="p-4 bg-surface-card rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{mod.label}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {mod.filledSlots}/{mod.totalSlots} slots filled
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        mod.percentComplete === 100 ? 'text-emerald-400' :
                        mod.percentComplete >= 75 ? 'text-blue-400' :
                        mod.percentComplete >= 50 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {mod.percentComplete}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini Progress Bar */}
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        mod.percentComplete === 100 ? 'bg-emerald-400' :
                        mod.percentComplete >= 75 ? 'bg-blue-400' :
                        mod.percentComplete >= 50 ? 'bg-amber-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${mod.percentComplete}%` }}
                    />
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-text-muted">{mod.filledSlots} filled</span>
                    </span>
                    {mod.readySlots > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-text-muted">{mod.readySlots} ready</span>
                      </span>
                    )}
                    {mod.blockedSlots > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-text-muted">{mod.blockedSlots} blocked</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Integration Log */}
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Recent Integrations</h2>
            <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {getRecentIntegrations(nexavantSequenceAssembly, 72).slice(0, 5).map(log => (
                  <div key={log.id} className="p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      log.automated ? 'bg-accent-green/10' : 'bg-accent-blue/10'
                    }`}>
                      {log.automated ? (
                        <Zap className="w-4 h-4 text-accent-green" />
                      ) : (
                        <FileCheck className="w-4 h-4 text-accent-blue" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{log.documentTitle}</div>
                      <div className="text-xs text-text-muted">
                        → {log.ctdSection} • {log.performedBy} • {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.action === 'auto-placed' ? 'bg-accent-green/20 text-accent-green' :
                      log.action === 'manual-placed' ? 'bg-accent-blue/20 text-accent-blue' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {log.action.replace('-', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* R&D Connected Callout */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-accent-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">R&D Connected: Document → Submission</h3>
                  <p className="text-xs text-text-muted mt-1">
                    When documents are approved in Authoring, they automatically slot into their eCTD positions.
                    {nexavantSequenceAssembly.integrationLog.filter(l => l.automated).length} documents auto-integrated this week.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'thread' ? (
        /* v0.6.7: Full Thread View - Data → Document → Submission */
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Thread List */}
          <div className="hidden lg:flex w-96 bg-surface-elevated border-r border-border flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-5 h-5 text-accent-purple" />
                <h2 className="text-sm font-semibold text-text-primary">Submission Threads</h2>
              </div>
              <p className="text-xs text-text-muted">Data → Document → Submission provenance</p>
              
              {/* Summary Banner */}
              <div className="mt-3 p-2 bg-surface-card rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-amber" />
                  <span className="text-xs font-medium text-text-primary">
                    {threadSummary.averageAutomationScore}% average automation • {threadSummary.averageHandoffs} handoffs
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {threadSummary.totalActiveThreads} active threads • {threadSummary.blockedThreads} blocked
                </div>
              </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-auto p-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Document Threads</h3>
              <div className="space-y-2">
                {allSubmissionThreads.map(thread => (
                  <div
                    key={thread.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer hover:border-accent-blue/50 ${
                      thread.overallStatus === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' :
                      thread.overallStatus === 'blocked' ? 'bg-red-500/5 border-red-500/20' :
                      'bg-surface-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{thread.documentTitle}</div>
                        <div className="text-xs text-text-muted mt-0.5">{thread.threadName}</div>
                      </div>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${overallStatusConfig[thread.overallStatus]?.bgColor} ${overallStatusConfig[thread.overallStatus]?.color}`}>
                        {overallStatusConfig[thread.overallStatus]?.label}
                      </span>
                    </div>
                    
                    {/* Stage Progress */}
                    <div className="flex items-center gap-1 mb-2">
                      {(['data-source', 'generation', 'authoring', 'integration', 'validation'] as const).map((stage, idx) => {
                        const isCurrentStage = thread.currentStage === stage;
                        const isPastStage = ['data-source', 'generation', 'authoring', 'integration', 'validation'].indexOf(thread.currentStage) > idx;
                        return (
                          <div
                            key={stage}
                            className={`flex-1 h-1.5 rounded-full ${
                              isPastStage ? 'bg-emerald-400' :
                              isCurrentStage ? 'bg-blue-400' :
                              'bg-slate-600'
                            }`}
                          />
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className={`px-1.5 py-0.5 rounded ${threadStageConfig[thread.currentStage]?.bgColor} ${threadStageConfig[thread.currentStage]?.color}`}>
                        {threadStageConfig[thread.currentStage]?.label}
                      </span>
                      <span>{thread.automationScore}% automated</span>
                      <span className="text-emerald-400">{thread.handoffs} handoffs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Panel - Thread Detail (Hero: CSR Efficacy) */}
          <div className="flex-1 overflow-auto p-6">
            {/* Thread Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20 flex items-center justify-center">
                  <GitBranch className="w-6 h-6 text-accent-purple" />
                </div>
                <div className="flex-1">
                  <h1 className="text-lg font-semibold text-text-primary">{csrEfficacyThread.documentTitle}</h1>
                  <p className="text-sm text-text-muted">
                    {csrEfficacyThread.productName} • {csrEfficacyThread.studyName}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${overallStatusConfig[csrEfficacyThread.overallStatus]?.color}`}>
                    {csrEfficacyThread.automationScore}%
                  </div>
                  <div className="text-xs text-text-muted">Automation Score</div>
                </div>
              </div>
              
              {/* Key Metrics Bar */}
              <div className="flex items-center gap-4 p-3 bg-surface-card rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Duration:</span>
                  <span className="text-sm font-medium text-text-primary">{csrEfficacyThread.totalDuration}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Touch Points:</span>
                  <span className="text-sm font-medium text-text-primary">{csrEfficacyThread.touchPoints}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Handoffs:</span>
                  <span className="text-sm font-bold text-emerald-400">{csrEfficacyThread.handoffs}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Status:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${overallStatusConfig[csrEfficacyThread.overallStatus]?.bgColor} ${overallStatusConfig[csrEfficacyThread.overallStatus]?.color}`}>
                    {overallStatusConfig[csrEfficacyThread.overallStatus]?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Thread Stages Visualization */}
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Thread Stages</h2>
            <div className="grid grid-cols-5 gap-3 mb-8">
              {/* Stage 1: Data Source */}
              <div className="p-4 bg-surface-card rounded-lg border-2 border-purple-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <FileCode className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-purple-400">Data Source</div>
                    <div className="text-xs text-text-muted">Locked</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  {csrEfficacyThread.dataSources.slice(0, 3).map(ds => (
                    <div key={ds.id} className="flex items-center justify-between">
                      <span className="text-text-secondary">{ds.datasetName}</span>
                      <span className="text-emerald-400">✓</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {csrEfficacyThread.dataSources.reduce((sum, ds) => sum + ds.recordCount, 0).toLocaleString()} records
                </div>
              </div>

              {/* Stage 2: Generation */}
              <div className="p-4 bg-surface-card rounded-lg border-2 border-amber-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-400">Generation</div>
                    <div className="text-xs text-text-muted">AI Generated</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Sections</span>
                    <span className="text-text-primary">{csrEfficacyThread.generation?.sectionsGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Tables</span>
                    <span className="text-text-primary">{csrEfficacyThread.generation?.tablesGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Confidence</span>
                    <span className="text-emerald-400">{csrEfficacyThread.generation?.confidenceScore}%</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {csrEfficacyThread.generation?.automationRate}% automated
                </div>
              </div>

              {/* Stage 3: Authoring */}
              <div className="p-4 bg-surface-card rounded-lg border-2 border-blue-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-400">Authoring</div>
                    <div className="text-xs text-text-muted">Approved</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Pages</span>
                    <span className="text-text-primary">{csrEfficacyThread.authoring.pageCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Reviewers</span>
                    <span className="text-text-primary">{csrEfficacyThread.authoring.reviewers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">AI Suggestions</span>
                    <span className="text-emerald-400">{csrEfficacyThread.authoring.aiSuggestionsAccepted}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  v{csrEfficacyThread.authoring.documentVersion} by {csrEfficacyThread.authoring.approvedBy}
                </div>
              </div>

              {/* Stage 4: Integration */}
              <div className="p-4 bg-surface-card rounded-lg border-2 border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <LayoutGrid className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-cyan-400">Integration</div>
                    <div className="text-xs text-text-muted">Auto-Placed</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Target</span>
                    <span className="text-text-primary">{csrEfficacyThread.integration.ctdSection}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Sequence</span>
                    <span className="text-text-primary">{csrEfficacyThread.integration.targetSequence}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Action</span>
                    <span className="text-emerald-400">{csrEfficacyThread.integration.integrationAction}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {csrEfficacyThread.integration.applicationNumber}
                </div>
              </div>

              {/* Stage 5: Validation */}
              <div className="p-4 bg-surface-card rounded-lg border-2 border-emerald-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-400">Validation</div>
                    <div className="text-xs text-text-muted">Passed</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Checks Run</span>
                    <span className="text-text-primary">{csrEfficacyThread.validation?.checksRun}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Passed</span>
                    <span className="text-emerald-400">{csrEfficacyThread.validation?.checksPassed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Status</span>
                    <span className="text-emerald-400">✓ Ready</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Full validation complete
                </div>
              </div>
            </div>

            {/* Timeline */}
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Thread Timeline</h2>
            <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
              <div className="divide-y divide-border max-h-80 overflow-auto">
                {csrEfficacyThread.milestones.map((milestone, idx) => (
                  <div key={milestone.id} className="p-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${threadStageConfig[milestone.stage]?.bgColor}`}>
                      {milestone.automated ? (
                        <Zap className={`w-4 h-4 ${threadStageConfig[milestone.stage]?.color}`} />
                      ) : (
                        <FileText className={`w-4 h-4 ${threadStageConfig[milestone.stage]?.color}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{milestone.event}</span>
                        {milestone.automated && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">Auto</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{milestone.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        <span>{new Date(milestone.timestamp).toLocaleString()}</span>
                        {milestone.actorName && <span>• {milestone.actorName}</span>}
                        {milestone.duration && <span>• {milestone.duration}</span>}
                      </div>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${threadStageConfig[milestone.stage]?.bgColor} ${threadStageConfig[milestone.stage]?.color}`}>
                      {threadStageConfig[milestone.stage]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* R&D Connected Callout */}
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                  <GitBranch className="w-5 h-5 text-accent-purple" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">R&D Connected: The Full Thread</h3>
                  <p className="text-xs text-text-muted mt-1">
                    <strong className="text-text-primary">Database locked. Document generated. Submission assembled.</strong> 
                    <br />
                    From ADTTE lock to eCTD slot 5.3.5.1 in {csrEfficacyThread.totalDuration}. 
                    {csrEfficacyThread.automationScore}% automated, {csrEfficacyThread.handoffs} system handoffs.
                    <br />
                    <span className="text-emerald-400 font-medium">That's not document management — that's R&D Connected.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-hidden flex">
          {/* Left Panel - v0.39.2: Resizable Sequence Timeline */}
          <div 
            className="bg-surface-elevated border-r border-border flex flex-col flex-shrink-0"
            style={{ width: leftPanelWidth }}
          >
            {/* Application Selector */}
            <div className="p-3 border-b border-border">
              <label className="block text-xs font-medium text-text-muted mb-1.5">Application</label>
              <select
                value={selectedApp?.id || ''}
                onChange={(e) => {
                  const app = filteredApps.find(a => a.id === e.target.value);
                  if (app) {
                    setSelectedApp(app);
                    setSelectedSequence(app.sequences?.[0] ?? null);
                    setSelectedDocument(null);
                  }
                }}
                className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
              >
                {filteredApps.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.type} {app.number} - {app.productName}
                  </option>
                ))}
              </select>
            </div>

            {/* Sequence Timeline with View Modes */}
            {selectedApp && (
              <div className="flex-1 overflow-hidden">
                <SequenceTimeline
                  application={selectedApp}
                  selectedSequence={selectedSequence}
                  onSelectSequence={(seq) => {
                    setSelectedSequence(seq);
                    setSelectedDocument(null);
                  }}
                  onSelectDocument={(doc, seqNum) => {
                    // Find the sequence and set it if different
                    if (seqNum !== selectedSequence?.sequenceNumber) {
                      const seq = selectedApp?.sequences.find(s => s.sequenceNumber === seqNum);
                      if (seq) setSelectedSequence(seq);
                    }
                    handleSelectDocument(doc);
                  }}
                  viewMode={ectdViewMode}
                  onViewModeChange={setEctdViewMode}
                />
              </div>
            )}
          </div>

          {/* Left Panel Resize Handle */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'left')}
            className={`w-1 bg-border hover:bg-accent-blue cursor-col-resize flex-shrink-0 flex items-center justify-center transition-colors ${
              resizingPanel === 'left' ? 'bg-accent-blue' : ''
            }`}
          >
            <GripVertical className="w-3 h-3 text-text-muted" />
          </div>

          {/* Middle Panel - CTD Tree View */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Header */}
            <div className="p-3 border-b border-border bg-surface flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    {selectedApp?.type} {selectedApp?.number} — Seq {selectedSequence?.sequenceNumber}
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">{selectedSequence?.description}</p>
                </div>
                {selectedSequence && (
                  <div className="flex items-center gap-1.5">
                    {getSequenceStatusIcon(selectedSequence.status)}
                    {getSequenceStatusBadge(selectedSequence.status)}
                  </div>
                )}
              </div>
              
              {/* eCTD View Mode Toggle - v163: Added Lifecycle view */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">View:</span>
                <div className="flex bg-surface-card rounded-lg p-0.5 border border-border">
                  <button
                    onClick={() => setEctdViewMode('sequence')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      ectdViewMode === 'sequence' 
                        ? 'bg-accent-blue text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title="View documents in selected sequence only"
                  >
                    Sequence
                  </button>
                  <button
                    onClick={() => setEctdViewMode('cumulative')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      ectdViewMode === 'cumulative' 
                        ? 'bg-accent-blue text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title="View all documents up to selected sequence"
                  >
                    Cumulative
                  </button>
                  <button
                    onClick={() => setEctdViewMode('current')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      ectdViewMode === 'current' 
                        ? 'bg-accent-blue text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title="View current state of dossier with document lifecycle history"
                  >
                    Current
                  </button>
                </div>
              </div>
            </div>

            {/* CTD Tree */}
            <div className="flex-1 overflow-auto p-3">
              <CTDTree
                documents={getViewModeDocuments()}
                onSelectDocument={handleSelectDocument}
                onOpenDocument={(doc) => openDocument(doc, false)}
                selectedDocumentId={selectedDocument?.id}
                viewMode={ectdViewMode}
              />
            </div>
            
            {/* Related Correspondence */}
            {relatedCorrespondence.length > 0 && (
              <div className="border-t border-border bg-surface flex-shrink-0">
                <details className="group">
                  <summary className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-surface-card transition-colors">
                    <div className="flex items-center gap-2 text-xs">
                      <MessageSquare className="w-3 h-3 text-accent-amber" />
                      <span className="font-medium text-text-primary">Related Correspondence</span>
                      <span className="text-text-muted">({relatedCorrespondence.length})</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-text-muted group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 pb-2 space-y-1">
                    {relatedCorrespondence.map(corr => (
                      <div key={corr.id} className="p-2 bg-surface-card rounded border border-border text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-text-primary">{corr.type}</div>
                            <div className="text-text-secondary mt-0.5">{corr.subject}</div>
                          </div>
                          <button 
                            onClick={() => {
                              const lastMsg = corr.messages[corr.messages.length - 1];
                              const fileName = lastMsg.documentPath.split('/').pop();
                              window.open(`${ARCHIVE_PATHS.correspondence}/${fileName}`, '_blank');
                            }}
                            className="text-accent-blue hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Right Panel Resize Handle */}
          {previewPaneSize !== 'collapsed' && previewPaneSize !== 'fullscreen' && (
            <div
              ref={resizeRef}
              onMouseDown={(e) => handleResizeStart(e, 'right')}
              className={`w-1 bg-border hover:bg-accent-blue cursor-col-resize flex-shrink-0 flex items-center justify-center transition-colors ${
                resizingPanel === 'right' ? 'bg-accent-blue' : ''
              }`}
            >
              <GripVertical className="w-3 h-3 text-text-muted" />
            </div>
          )}

          {/* Right Panel - Document Preview */}
          <div 
            className={`bg-surface-elevated border-l border-border flex flex-col transition-all duration-200 ${
              previewPaneSize === 'fullscreen' ? 'absolute inset-0 z-50' : ''
            }`}
            style={{ 
              width: previewPaneSize === 'collapsed' ? 0 
                : previewPaneSize === 'fullscreen' ? '100%' 
                : previewWidth,
              minWidth: previewPaneSize === 'collapsed' ? 0 : 320,
            }}
          >
            {previewPaneSize !== 'collapsed' && (
              <>
                {/* Preview Header */}
                <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {/* History Navigation */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigateHistory('back')}
                        disabled={historyIndex <= 0}
                        className="p-1 rounded hover:bg-surface-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Back"
                      >
                        <ArrowLeft className="w-4 h-4 text-text-muted" />
                      </button>
                      <button
                        onClick={() => navigateHistory('forward')}
                        disabled={historyIndex >= documentHistory.length - 1}
                        className="p-1 rounded hover:bg-surface-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Forward"
                      >
                        <ArrowRight className="w-4 h-4 text-text-muted" />
                      </button>
                    </div>
                    
                    <div className="h-4 w-px bg-border" />
                    
                    <h3 className="text-sm font-medium text-text-primary">
                      {selectedDocument ? 'Document Preview' : 'Select a Document'}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Zoom Controls (for PDF) */}
                    {selectedDocument?.fileType === 'pdf' && (
                      <>
                        <button
                          onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))}
                          className="p-1 rounded hover:bg-surface-card transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4 text-text-muted" />
                        </button>
                        <span className="text-xs text-text-muted w-10 text-center">{pdfZoom}%</span>
                        <button
                          onClick={() => setPdfZoom(Math.min(200, pdfZoom + 25))}
                          className="p-1 rounded hover:bg-surface-card transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4 text-text-muted" />
                        </button>
                        <div className="h-4 w-px bg-border mx-1" />
                      </>
                    )}
                    
                    {/* Panel Size Controls */}
                    <button
                      onClick={() => setPreviewPaneSize(previewPaneSize === 'expanded' ? 'normal' : 'expanded')}
                      className="p-1 rounded hover:bg-surface-card transition-colors"
                      title={previewPaneSize === 'expanded' ? 'Normal Size' : 'Expand'}
                    >
                      {previewPaneSize === 'expanded' ? (
                        <Minimize2 className="w-4 h-4 text-text-muted" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                    <button
                      onClick={() => setPreviewPaneSize(previewPaneSize === 'fullscreen' ? 'normal' : 'fullscreen')}
                      className="p-1 rounded hover:bg-surface-card transition-colors"
                      title={previewPaneSize === 'fullscreen' ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {previewPaneSize === 'fullscreen' ? (
                        <X className="w-4 h-4 text-text-muted" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                    <button
                      onClick={() => selectedDocument && openDocument(selectedDocument, true)}
                      disabled={!selectedDocument}
                      className="p-1 rounded hover:bg-surface-card disabled:opacity-30 transition-colors"
                      title="Open in New Window"
                    >
                      <ExternalLink className="w-4 h-4 text-text-muted" />
                    </button>
                    <button
                      onClick={() => setPreviewPaneSize('collapsed')}
                      className="p-1 rounded hover:bg-surface-card transition-colors"
                      title="Close Preview"
                    >
                      <PanelRightClose className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                </div>

                {/* Breadcrumb Trail */}
                {documentHistory.length > 0 && (
                  <div className="px-3 py-2 bg-surface border-b border-border flex-shrink-0 overflow-x-auto">
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        onClick={() => {
                          setSelectedDocument(null);
                          setDocumentHistory([]);
                          setHistoryIndex(-1);
                        }}
                        className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <Home className="w-3 h-3" />
                      </button>
                      {documentHistory.slice(Math.max(0, historyIndex - 3), historyIndex + 1).map((entry, idx, arr) => (
                        <div key={entry.timestamp} className="flex items-center gap-1">
                          <ChevronRight className="w-3 h-3 text-text-muted" />
                          <button
                            onClick={() => {
                              const actualIndex = Math.max(0, historyIndex - 3) + idx;
                              setHistoryIndex(actualIndex);
                              setSelectedDocument(entry.document);
                            }}
                            className={`px-1.5 py-0.5 rounded truncate max-w-[120px] transition-colors ${
                              idx === arr.length - 1
                                ? 'bg-accent-blue/10 text-accent-blue font-medium'
                                : 'text-text-muted hover:text-text-primary'
                            }`}
                            title={entry.document.title}
                          >
                            {entry.document.title}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Preview Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {selectedDocument ? (
                    <>
                      {/* Document Info Header */}
                      <div className="p-3 bg-surface-card border-b border-border flex-shrink-0">
                        <div className="flex items-start gap-3">
                          {getFileTypeIcon(selectedDocument.fileType)}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text-primary truncate">{selectedDocument.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-text-muted">Module {selectedDocument.module}</span>
                              {selectedDocument.section && (
                                <>
                                  <span className="text-xs text-text-muted">•</span>
                                  <span className="text-xs text-text-muted">{selectedDocument.section}</span>
                                </>
                              )}
                              {getDocumentOperationBadge(selectedDocument.operation)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Preview Frame */}
                      <div className="flex-1 overflow-hidden bg-surface-elevated">
                        {selectedDocument.fileType === 'pdf' ? (
                          // PDF metadata card - theme-aware
                          <div className="h-full flex flex-col items-center justify-center p-6">
                            <div className="w-full max-w-md bg-surface-card rounded-lg border border-border p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-accent-red/10 rounded-lg flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-accent-red" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-text-primary">PDF Document</div>
                                  <div className="text-xs text-text-muted">eCTD Compliant</div>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-2 border-b border-border">
                                  <span className="text-text-muted">Title</span>
                                  <span className="text-text-primary font-medium text-right max-w-[200px] truncate">{selectedDocument.title}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-border">
                                  <span className="text-text-muted">Module</span>
                                  <span className="text-text-primary">{selectedDocument.module}</span>
                                </div>
                                {selectedDocument.section && (
                                  <div className="flex justify-between py-2 border-b border-border">
                                    <span className="text-text-muted">Section</span>
                                    <span className="text-text-primary">{selectedDocument.section}</span>
                                  </div>
                                )}
                                <div className="flex justify-between py-2 border-b border-border">
                                  <span className="text-text-muted">Operation</span>
                                  <span className="text-text-primary capitalize">{selectedDocument.operation}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-border">
                                  <span className="text-text-muted">Path</span>
                                  <span className="text-text-secondary font-mono text-xs truncate max-w-[200px]">{selectedDocument.filePath}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                  <span className="text-text-muted">Checksum</span>
                                  <span className="text-text-secondary font-mono text-xs">{selectedDocument.checksum?.substring(0, 12)}...</span>
                                </div>
                              </div>
                              <div className="mt-4 p-3 bg-surface rounded-lg text-xs text-text-muted text-center border border-border">
                                <Shield className="w-4 h-4 inline mr-1.5 text-accent-green" />
                                Validated for eCTD compliance • {selectedDocument.checksumType?.toUpperCase()} verified
                              </div>
                            </div>
                          </div>
                        ) : selectedDocument.fileType === 'xml' ? (
                          <div className="p-4 overflow-auto h-full">
                            <pre className="text-xs text-text-secondary font-mono bg-surface-card rounded-lg p-4 border border-border">
                              <code>
                                {`<?xml version="1.0" encoding="UTF-8"?>\n<!-- XML Preview -->\n<document>\n  <title>${selectedDocument.title}</title>\n  <path>${selectedDocument.filePath}</path>\n</document>`}
                              </code>
                            </pre>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-text-muted">
                            <div className="text-center">
                              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">Preview not available for {selectedDocument.fileType} files</p>
                              <button
                                onClick={() => openDocument(selectedDocument, false)}
                                className="mt-3 px-4 py-2 bg-accent-blue text-white text-sm rounded-lg hover:bg-accent-blue/90"
                              >
                                Open in New Tab
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="p-3 border-t border-border bg-surface flex items-center gap-2 flex-shrink-0">
                        <Button 
                          onClick={() => handleOpenInViewer(selectedDocument)}
                          variant="primary"
                          size="sm"
                          className="flex-1"
                        >
                          <BookOpen className="w-4 h-4" />
                          Read in Viewer
                        </Button>
                        <IconButton
                          icon={<ExternalLink className="w-4 h-4" />}
                          label="Open in New Tab"
                          onClick={() => openDocument(selectedDocument, false)}
                          variant="secondary"
                          size="sm"
                        />
                        <IconButton
                          icon={<Download className="w-4 h-4" />}
                          label="Download"
                          onClick={() => {
                            toast.info(`Download queued for "${selectedDocument.filePath.split('/').pop()}"`);
                          }}
                          variant="secondary"
                          size="sm"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-sm p-4">
                      <UIEmptyState
                        icon={<FileText className="w-12 h-12" />}
                        title="Select a Document"
                        description="Click any document in the tree view to preview"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Collapsed Preview Toggle */}
          {previewPaneSize === 'collapsed' && (
            <button
              onClick={() => setPreviewPaneSize('normal')}
              className="w-8 bg-surface-elevated border-l border-border flex items-center justify-center hover:bg-surface-card transition-colors"
              title="Show Preview Panel"
            >
              <PanelRight className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// v0.9.17d: Cross-References View Component
// =============================================================================

import { CrossReferenceValidationPanel } from '@/components/publishing/CrossReferenceValidationPanel';
import { useDeadClick } from '@/hooks/useDeadClick';

interface CrossReferencesViewProps {
  selectedSequence: ECTDSequence | null;
  selectedDocument: ECTDDocument | null;
  selectedApp: ECTDApplication | null;
  onDocumentClick: (docId: string) => void;
  onViewDocument: (docId: string) => void;
}

function CrossReferencesView({
  selectedSequence,
  selectedDocument,
  selectedApp,
  onDocumentClick,
  onViewDocument,
}: CrossReferencesViewProps) {
  const [activeTab, setActiveTab] = useState<'validation' | 'graph'>('validation');
  
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Tab Header */}
      <div className="border-b border-border bg-surface-elevated px-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'validation'
                ? 'text-accent-blue border-accent-blue font-medium'
                : 'text-text-secondary hover:text-text-primary border-transparent'
            }`}
          >
            <Shield className="w-4 h-4" />
            Link Validation
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'graph'
                ? 'text-accent-blue border-accent-blue font-medium'
                : 'text-text-secondary hover:text-text-primary border-transparent'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Reference Graph
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'validation' ? (
          <CrossReferenceValidationPanel
            sequenceId={selectedSequence?.sequenceNumber}
            applicationId={selectedApp?.id}
          />
        ) : (
          <CrossReferenceGraph
            focusDocumentId={selectedDocument?.id}
            onDocumentClick={onDocumentClick}
            onViewDocument={onViewDocument}
          />
        )}
      </div>
    </div>
  );
}
