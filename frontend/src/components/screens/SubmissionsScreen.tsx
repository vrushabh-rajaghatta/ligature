

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  FileText,
  Folder,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Eye,
  Download,
  MessageSquare,
  Filter,
  Search,
  Globe,
  Calendar,
  ExternalLink,
  Plus,
  Play,
  Loader2,
  Activity,
  History,
  RefreshCw,
  GitBranch,
  Flag,
  Package,
  Users,
  Layers,
  Bell,
  ArrowRight,
  X,
  Target,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  BarChart3,
  Zap,
  Shield,
  XCircle,
  Circle
} from 'lucide-react';
import { ARCHIVE_PATHS } from '@/data/ectd-data';
import { ECTDApplication, ECTDSequence, ECTDDocument, CTD_MODULES } from '@/types/ectd';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { useFilteredECTDApplications } from '@/stores/ectd-adapter';
import { useSequenceBridge } from '@/store/useSequenceBridge';
import {
  INDSubmission, ModuleReadiness, SectionReadiness, Milestone,
  CriticalPathItem, GapItem, RiskFactor, INDReadinessView,
  indSubmissions, mockDocuments, getBlockingItems, getCriticalGaps, getActiveRisks,
  getDocumentsByModule
} from '@/data/ind-readiness-data';
import {
  RegulatorySubmission, SubmissionStatus, SubmissionType,
  regulatorySubmissions, getPortfolioMetrics, getActiveSubmissions,
  getSubmissionsDueInDays, getProduct
} from '@/data/regulatory-submissions-data';
import { useProducts } from '@/stores/products-store';
import { CTDTree } from '@/components/ectd/CTDTree';
import { SubmissionBuilder } from '@/components/submissions/SubmissionBuilder';
import { ValidationPanel } from '@/components/submissions/ValidationPanel';
import { GatewayMonitor, GatewayStatusBadge } from '@/components/submissions/GatewayMonitor';
import { SubmissionTracker } from '@/components/submissions/SubmissionTracker';
import { PipelineView } from '@/components/submissions/PipelineView';
import { LifecycleView } from '@/components/submissions/LifecycleView';
import { PlanningView } from '@/components/submissions/PlanningView';
import { PublishingView } from '@/components/submissions/PublishingView';
import { GatewayStatusPanel } from '@/components/submissions/GatewayStatusPanel';
import { useSequenceBuilderStore } from '@/store/useSequenceBuilderStore';
import { useCrossModuleStore } from '@/store/useCrossModuleStore';
import { FilterState } from '@/components/layout/FilterBar';
import { useToast } from '@/components/ui/Toast';
// v94: UI Component Library imports
// v177: Added ReturnBreadcrumb for cross-module navigation
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter, StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar, LabeledProgress } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
import { StatCardGridSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
// v112: Cross-module navigation
import { useIncomingNavigation, SubmissionsViewMode } from '@/hooks/useModuleNavigation';
// v159: Cross-module event system
import { useCrossModuleEventStore, usePendingActions } from '@/store/useCrossModuleEventStore';
// Removed: PendingActionsList (was from demo components)
// v191: Multi-Region Submission Tracker
import { MultiRegionSubmissionTracker } from './MultiRegionSubmissionTracker';
// v0.44.48: Cascade engine
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useDeadClick } from '@/hooks/useDeadClick';

interface SubmissionsScreenProps {
  filters?: FilterState;
}

// View mode types - now includes planning, publishing, IND readiness, portfolio, and multi-region
type ViewMode = 'overview' | 'viewer' | 'builder' | 'tracker' | 'pipeline' | 'lifecycle' | 'planning' | 'publishing' | 'ind-portfolio' | 'ind-overview' | 'ind-modules' | 'ind-timeline' | 'ind-gaps' | 'ind-documents' | 'multi-region';

// IND readiness sub-view type
type INDView = 'ind-portfolio' | 'ind-overview' | 'ind-modules' | 'ind-timeline' | 'ind-gaps' | 'ind-documents';

// Portfolio grouping options
type PortfolioGroupBy = 'status' | 'type' | 'therapeutic-area' | 'target-date' | 'region';

// Tab groups for the header
const tabGroups = [
  {
    label: 'Global',
    tabs: [
      { id: 'multi-region' as ViewMode, label: 'Multi-Region', icon: <Globe className="w-4 h-4" /> },
    ]
  },
  {
    label: 'Readiness',
    tabs: [
      { id: 'ind-portfolio' as ViewMode, label: 'Portfolio', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'ind-overview' as ViewMode, label: 'Details', icon: <Target className="w-4 h-4" /> },
      { id: 'ind-modules' as ViewMode, label: 'Modules', icon: <Layers className="w-4 h-4" /> },
      { id: 'ind-timeline' as ViewMode, label: 'Timeline', icon: <GitBranch className="w-4 h-4" /> },
      { id: 'ind-gaps' as ViewMode, label: 'Gaps', icon: <AlertCircle className="w-4 h-4" /> },
    ]
  },
  {
    label: 'eCTD',
    tabs: [
      { id: 'overview' as ViewMode, label: 'Overview', icon: <Layers className="w-4 h-4" /> },
      { id: 'viewer' as ViewMode, label: 'Viewer', icon: <Eye className="w-4 h-4" /> },
      { id: 'builder' as ViewMode, label: 'Builder', icon: <Package className="w-4 h-4" /> },
    ]
  },
  {
    label: 'Planning',
    tabs: [
      { id: 'pipeline' as ViewMode, label: 'Pipeline', icon: <Calendar className="w-4 h-4" /> },
      { id: 'planning' as ViewMode, label: 'Team & RACI', icon: <Users className="w-4 h-4" /> },
    ]
  },
  {
    label: 'Publishing',
    tabs: [
      { id: 'publishing' as ViewMode, label: 'Publishing', icon: <Send className="w-4 h-4" /> },
      { id: 'tracker' as ViewMode, label: 'Tracker', icon: <History className="w-4 h-4" /> },
      { id: 'lifecycle' as ViewMode, label: 'Lifecycle', icon: <RefreshCw className="w-4 h-4" /> },
    ]
  },
];

// v94: Color mapping for Badge components
const submissionStatusColorMap: Record<SubmissionStatus, 'red' | 'amber' | 'blue' | 'purple' | 'green' | 'gray'> = {
  blocked: 'red',
  delayed: 'red',
  'at-risk': 'amber',
  'on-track': 'blue',
  submitted: 'purple',
  approved: 'green',
};

const sequenceStatusColorMap: Record<string, 'gray' | 'blue' | 'amber' | 'green' | 'purple'> = {
  draft: 'gray',
  validated: 'blue',
  submitted: 'amber',
  acknowledged: 'green',
  'under-review': 'purple',
  approved: 'green',
};

const operationColorMap: Record<string, 'green' | 'amber' | 'blue' | 'red'> = {
  new: 'green',
  replace: 'amber',
  append: 'blue',
  delete: 'red',
};

const indStatusColorMap: Record<string, 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'gray'> = {
  complete: 'green',
  'in-progress': 'blue',
  'at-risk': 'amber',
  blocked: 'red',
  'not-started': 'gray',
  pending: 'gray',
  missed: 'red',
  completed: 'green',
};

const getProgressBadgeColor = (percent: number): 'green' | 'blue' | 'amber' | 'red' => {
  if (percent >= 90) return 'green';
  if (percent >= 70) return 'blue';
  if (percent >= 50) return 'amber';
  return 'red';
};

const getDaysColor = (days: number): 'red' | 'amber' | 'gray' => {
  if (days <= 0) return 'red';
  if (days <= 30) return 'red';
  if (days <= 60) return 'amber';
  return 'gray';
};

export function SubmissionsScreen({ filters }: SubmissionsScreenProps) {
  const products = useProducts();
  const toast = useToast();
  const currentDraft = useSequenceBuilderStore(s => s.currentDraft);
  const setCurrentDraft = useSequenceBuilderStore(s => s.setCurrentDraft);
  
  // v112: Cross-module navigation
  const { getContext } = useIncomingNavigation();
  
  // Sequence bridge for coordinated creation across stores
  const { createSequence } = useSequenceBridge();
  
  // Cross-module integration - get stable references
  const acceptHandoff = useCrossModuleStore(s => s.acceptHandoff);
  const rejectHandoff = useCrossModuleStore(s => s.rejectHandoff);
  const navigationContext = useCrossModuleStore(s => s.navigationContext);
  const clearNavigationContext = useCrossModuleStore(s => s.clearNavigationContext);
  const getHandoffsForModule = useCrossModuleStore(s => s.getHandoffsForModule);
    const { deadClick } = useDeadClick();
  const pendingHandoffs = useMemo(() => getHandoffsForModule('submissions'), [getHandoffsForModule]);
  const [showHandoffBanner, setShowHandoffBanner] = useState(true);
  const [hasHandledNavContext, setHasHandledNavContext] = useState(false);
  
  // Get filtered applications from Portfolio Store via eCTD adapter
  // This is the key integration point - data now comes from the same store
  // as Portfolio and ProgramDetailScreen
  const storeFilters = useMemo(() => ({
    product: filters?.product,
    region: filters?.region,
    applicationType: filters?.applicationType,
  }), [filters]);
  const filteredApps = useFilteredECTDApplications(storeFilters);
  
  // Get selectedApplicationId from Portfolio store for cross-module navigation
  const portfolioSelectedAppId = usePortfolioStore(s => s.selectedApplicationId);
  const selectApplicationInStore = usePortfolioStore(s => s.selectApplication);

  const [selectedApp, setSelectedApp] = useState<ECTDApplication | null>(filteredApps[0] || null);
  const [selectedSequence, setSelectedSequence] = useState<ECTDSequence | null>(filteredApps[0]?.sequences[0] || null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['1', '2', '3', '5']));
  const [selectedDocument, setSelectedDocument] = useState<ECTDDocument | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview'); // v0.44.48: Fixed — ind-portfolio had no render, overview is correct landing
  const [showValidation, setShowValidation] = useState(false);
  const [showGatewayMonitor, setShowGatewayMonitor] = useState(false);
  const [ectdViewMode, setEctdViewMode] = useState<'sequence' | 'cumulative' | 'current'>('sequence');

  // IND Readiness state - now using RegulatorySubmission
  const [selectedSubmission, setSelectedSubmission] = useState<RegulatorySubmission | null>(null);
  const [expandedINDModules, setExpandedINDModules] = useState<Set<string>>(new Set(['m2', 'm3', 'm5']));
  
  // Portfolio state
  const [portfolioGroupBy, setPortfolioGroupBy] = useState<PortfolioGroupBy>('status');
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [portfolioTypeFilter, setPortfolioTypeFilter] = useState<SubmissionType | 'all'>('all');
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<SubmissionStatus | 'all'>('all');

  // v128: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);
  
  // v159: Cross-module pending actions for submissions
  const submissionsPendingActions = usePendingActions('submissions');
  // v0.44.48: Cascade engine — flag amendments from safety signals
  const { chains, skipStep } = useCascadeEngine();

  // Handle incoming navigation context from other modules
  useEffect(() => {
    if (!hasHandledNavContext && navigationContext?.sourceModule === 'authoring' && navigationContext.handoffId) {
      setViewMode('builder');
      setShowHandoffBanner(true);
      setHasHandledNavContext(true);
    }
  }, [navigationContext, hasHandledNavContext]);

  // Handle cross-module navigation from Portfolio/ProgramDetailScreen
  // When an application is selected in the Portfolio store, switch to it
  useEffect(() => {
    if (portfolioSelectedAppId && filteredApps.length > 0) {
      const appFromStore = filteredApps.find(app => app.id === portfolioSelectedAppId);
      if (appFromStore && appFromStore.id !== selectedApp?.id) {
        setSelectedApp(appFromStore);
        setSelectedSequence(appFromStore.sequences[0] || null);
        // Automatically switch to viewer or overview if coming from another module
        if (viewMode === 'ind-portfolio' || viewMode === 'ind-overview') {
          setViewMode('viewer');
        }
      }
    }
  }, [portfolioSelectedAppId, filteredApps]);

  // Reset handler when navigation context is cleared
  useEffect(() => {
    if (!navigationContext) {
      setHasHandledNavContext(false);
    }
  }, [navigationContext]);
  
  // v112: Apply incoming navigation context from StatCard clicks
  useEffect(() => {
    const context = getContext();
    if (context) {
      if (context.viewMode) {
        const viewModeMap: Record<string, ViewMode> = {
          'overview': 'overview',
          'tracker': 'tracker',
          'builder': 'builder',
          'validation': 'ind-gaps',
        };
        const targetView = viewModeMap[context.viewMode];
        if (targetView) {
          setViewMode(targetView);
        }
      }
      // Apply status filter if present
      if (context.filters?.status) {
        setPortfolioStatusFilter(context.filters.status as SubmissionStatus | 'all');
      }
    }
  }, [getContext]);

  // Handle accepting a handoff
  const handleAcceptHandoff = (handoffId: string) => {
    acceptHandoff(handoffId);
    toast.success('Document added to submission builder');
    clearNavigationContext();
    setShowHandoffBanner(false);
  };

  // Handle rejecting a handoff
  const handleRejectHandoff = (handoffId: string) => {
    rejectHandoff(handoffId);
    toast.info('Document handoff dismissed');
    clearNavigationContext();
    setShowHandoffBanner(false);
  };

  // Calculate documents based on eCTD view mode
  const getViewModeDocuments = useCallback(() => {
    if (!selectedApp || !selectedSequence) return [];
    
    const sequenceIndex = selectedApp.sequences.findIndex(
      s => s.sequenceNumber === selectedSequence.sequenceNumber
    );
    
    if (ectdViewMode === 'sequence') {
      // Sequence view: just this sequence's documents
      return selectedSequence.documents;
    }
    
    if (ectdViewMode === 'cumulative') {
      // Cumulative view: all documents from all sequences up to and including this one
      const allDocs: ECTDDocument[] = [];
      for (let i = 0; i <= sequenceIndex; i++) {
        selectedApp.sequences[i].documents.forEach(doc => {
          allDocs.push({
            ...doc,
            id: `${selectedApp.sequences[i].sequenceNumber}-${doc.id}`, // Make ID unique
            // Add metadata about which sequence it's from
          });
        });
      }
      return allDocs;
    }
    
    if (ectdViewMode === 'current') {
      // Current view: apply lifecycle operations (new, replace, append, delete)
      // Build a map of current state by section
      const currentState = new Map<string, ECTDDocument>();
      
      for (let i = 0; i <= sequenceIndex; i++) {
        const seq = selectedApp.sequences[i];
        seq.documents.forEach(doc => {
          const sectionKey = `${doc.module}-${doc.section}`;
          const existingDoc = currentState.get(sectionKey);
          
          // Apply lifecycle operation
          if (doc.operation === 'delete') {
            currentState.delete(sectionKey);
          } else if (doc.operation === 'replace' || doc.operation === 'new' || !existingDoc) {
            currentState.set(sectionKey, {
              ...doc,
              id: `current-${doc.id}`,
            });
          } else if (doc.operation === 'append' && existingDoc) {
            // For append, we'd ideally merge content - for now just keep the latest
            currentState.set(sectionKey, {
              ...doc,
              id: `current-${doc.id}`,
              title: `${existingDoc.title} (+ ${doc.title})`,
            });
          }
        });
      }
      
      return Array.from(currentState.values());
    }
    
    return selectedSequence.documents;
  }, [selectedApp, selectedSequence, ectdViewMode]);

  // Update selection when filters change, but respect portfolio store selection
  useEffect(() => {
    if (filteredApps.length > 0) {
      // If portfolio store has a selection, use that
      if (portfolioSelectedAppId) {
        const appFromStore = filteredApps.find(app => app.id === portfolioSelectedAppId);
        if (appFromStore) {
          setSelectedApp(appFromStore);
          setSelectedSequence(appFromStore.sequences[0] || null);
          return;
        }
      }
      // Otherwise, default to first app
      if (!selectedApp || !filteredApps.find(a => a.id === selectedApp.id)) {
        setSelectedApp(filteredApps[0]);
        setSelectedSequence(filteredApps[0].sequences[0] || null);
      }
    } else {
      setSelectedApp(null);
      setSelectedSequence(null);
    }
  }, [filteredApps, portfolioSelectedAppId]);
  
  const handleCreateNewSequence = () => {
    if (!selectedApp) {
      toast.error('Please select an application first');
      return;
    }
    
    // Use the sequence bridge to create in both stores
    const result = createSequence({
      applicationId: selectedApp.id,
      sequenceType: 'amendment',
      description: 'New Sequence',
      region: selectedApp.region === 'US' ? 'fda' : selectedApp.region === 'EU' ? 'ema' : 'fda',
      createdBy: 'Sarah Chen',
    });
    
    setViewMode('builder');
    toast.success(`Created sequence ${result.sequenceNumber}`);
  };

  const toggleModule = (moduleNum: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleNum)) {
      newExpanded.delete(moduleNum);
    } else {
      newExpanded.add(moduleNum);
    }
    setExpandedModules(newExpanded);
  };

  const getSequenceStatusIcon = (status: ECTDSequence['status']) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4 text-slate-400" />;
      case 'validated': return <CheckCircle className="w-4 h-4 text-accent-blue" />;
      case 'submitted': return <Send className="w-4 h-4 text-accent-amber" />;
      case 'acknowledged': return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'under-review': return <Eye className="w-4 h-4 text-accent-purple" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-accent-green" />;
    }
  };

  const getStatusColor = (status: ECTDSequence['status']) => {
    switch (status) {
      case 'draft': return 'bg-slate-500/20 text-slate-400';
      case 'validated': return 'bg-accent-blue/20 text-accent-blue';
      case 'submitted': return 'bg-accent-amber/20 text-accent-amber';
      case 'acknowledged': return 'bg-accent-green/20 text-accent-green';
      case 'under-review': return 'bg-accent-purple/20 text-accent-purple';
      case 'approved': return 'bg-accent-green/20 text-accent-green';
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

  const getFileIcon = (fileType: ECTDDocument['fileType']) => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'xml': return '📋';
      case 'xpt': return '📊';
      default: return '📁';
    }
  };

  // Group documents by module
  const documentsByModule = selectedSequence ? selectedSequence?.documents.reduce((acc, doc) => {
    if (!acc[doc.module]) acc[doc.module] = [];
    acc[doc.module].push(doc);
    return acc;
  }, {} as Record<string, ECTDDocument[]>) : {};

  // Calculate stats from filtered apps
  const totalSequences = filteredApps.reduce((acc, app) => acc + app.sequences.length, 0);
  const underReview = filteredApps.flatMap(app => app.sequences).filter(s => s.status === 'under-review').length;
  const submitted = filteredApps.flatMap(app => app.sequences).filter(s => s.status === 'submitted' || s.status === 'acknowledged').length;

  // Get related correspondence
  const relatedCorrespondence = selectedApp && selectedSequence 
    ? selectedApp?.correspondence.filter(c => c.relatedSequence === selectedSequence?.sequenceNumber)
    : [];

  const openDocument = (doc: ECTDDocument) => {
    if (!selectedApp || !selectedSequence) return;
    const archivePath = selectedApp?.archivePath;
    const seqFolder = selectedApp?.ectdVersion === '3.2.2' 
      ? selectedSequence?.sequenceNumber.padStart(4, '0')
      : selectedSequence?.sequenceNumber;
    const fullPath = `${archivePath}/${seqFolder}/${doc.filePath}`;
    window.open(fullPath, '_blank');
  };

  // ========== Portfolio & IND Readiness Helpers ==========
  
  // Filter submissions by global product/therapeutic area selection
  const matchingProductIds = useMemo(() => {
    if (!filters) return null;
    const hasActiveFilter = filters.product !== 'all' || filters.therapeuticArea !== 'all';
    if (!hasActiveFilter) return null;
    let filtered = [...products];
    if (filters.product !== 'all') filtered = filtered.filter(p => p.id === filters.product);
    if (filters.therapeuticArea !== 'all') filtered = filtered.filter(p => p.therapeuticArea.toLowerCase().replace(/\s+/g, '-') === filters.therapeuticArea);
    return new Set(filtered.map(p => p.id));
  }, [filters]);

  // Filter submissions for portfolio view
  const filteredSubmissions = useMemo(() => {
    let subs = regulatorySubmissions;
    
    // Apply global filter
    if (matchingProductIds) {
      subs = subs.filter(s => matchingProductIds.has(s.productId));
    }
    
    // Apply local portfolio filters
    if (portfolioTypeFilter !== 'all') {
      subs = subs.filter(s => s.submissionType === portfolioTypeFilter);
    }
    if (portfolioStatusFilter !== 'all') {
      subs = subs.filter(s => s.status === portfolioStatusFilter);
    }
    if (portfolioSearch) {
      const search = portfolioSearch.toLowerCase();
      subs = subs.filter(s => {
        const product = getProduct(s.productId);
        return (
          s.applicationNumber.toLowerCase().includes(search) ||
          product?.name.toLowerCase().includes(search) ||
          product?.brandName?.toLowerCase().includes(search) ||
          s.therapeuticArea.toLowerCase().includes(search)
        );
      });
    }
    
    return subs;
  }, [matchingProductIds, portfolioTypeFilter, portfolioStatusFilter, portfolioSearch]);

  // Group submissions for portfolio view
  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, RegulatorySubmission[]> = {};
    
    filteredSubmissions.forEach(sub => {
      let key: string;
      switch (portfolioGroupBy) {
        case 'status':
          key = sub.status;
          break;
        case 'type':
          key = sub.submissionType;
          break;
        case 'therapeutic-area':
          key = sub.therapeuticArea;
          break;
        case 'region':
          key = sub.region;
          break;
        case 'target-date':
          const target = new Date(sub.targetDate);
          const now = new Date();
          const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) key = 'Past Due';
          else if (diffDays <= 30) key = 'Next 30 Days';
          else if (diffDays <= 60) key = 'Next 60 Days';
          else if (diffDays <= 90) key = 'Next 90 Days';
          else key = 'Beyond 90 Days';
          break;
        default:
          key = 'Other';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(sub);
    });
    
    // Sort groups by priority
    const statusOrder = ['blocked', 'delayed', 'at-risk', 'on-track', 'submitted', 'approved'];
    const dateOrder = ['Past Due', 'Next 30 Days', 'Next 60 Days', 'Next 90 Days', 'Beyond 90 Days'];
    
    return Object.entries(groups).sort(([a], [b]) => {
      if (portfolioGroupBy === 'status') {
        return statusOrder.indexOf(a) - statusOrder.indexOf(b);
      }
      if (portfolioGroupBy === 'target-date') {
        return dateOrder.indexOf(a) - dateOrder.indexOf(b);
      }
      return a.localeCompare(b);
    });
  }, [filteredSubmissions, portfolioGroupBy]);

  // Portfolio metrics
  const portfolioMetrics = useMemo(() => getPortfolioMetrics(), []);

  // Get blocking items and gaps for selected submission
  const selectedBlockingItems = useMemo(() => {
    if (!selectedSubmission) return [];
    return selectedSubmission.criticalPath.filter(item => item.isBlocking && item.status !== 'completed');
  }, [selectedSubmission]);

  const selectedCriticalGaps = useMemo(() => {
    if (!selectedSubmission) return [];
    return selectedSubmission.gaps.filter(gap => gap.severity === 'critical' && gap.status !== 'resolved');
  }, [selectedSubmission]);

  const selectedActiveRisks = useMemo(() => {
    if (!selectedSubmission) return [];
    return selectedSubmission.riskFactors.filter(risk => risk.status === 'active');
  }, [selectedSubmission]);

  // Handle submission selection from portfolio
  const handleSelectSubmission = (submission: RegulatorySubmission) => {
    setSelectedSubmission(submission);
    setViewMode('ind-overview');
  };

  const getINDStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'complete': 'bg-accent-green/20 text-accent-green',
      'on-track': 'bg-accent-blue/20 text-accent-blue',
      'at-risk': 'bg-accent-amber/20 text-accent-amber',
      'blocked': 'bg-accent-red/20 text-accent-red',
      'delayed': 'bg-accent-red/20 text-accent-red',
      'not-started': 'bg-slate-500/20 text-slate-400',
      'completed': 'bg-accent-green/20 text-accent-green',
      'in-progress': 'bg-accent-blue/20 text-accent-blue',
      'missed': 'bg-accent-red/20 text-accent-red',
      'open': 'bg-accent-amber/20 text-accent-amber',
      'resolved': 'bg-accent-green/20 text-accent-green',
      'final': 'bg-accent-green/20 text-accent-green',
      'approved': 'bg-accent-green/20 text-accent-green',
      'submitted': 'bg-accent-purple/20 text-accent-purple',
      'in-review': 'bg-accent-blue/20 text-accent-blue',
      'draft': 'bg-accent-amber/20 text-accent-amber',
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  };

  const getStatusIcon = (status: SubmissionStatus) => {
    switch (status) {
      case 'blocked': return <XCircle className="w-4 h-4 text-accent-red" />;
      case 'delayed': return <AlertTriangle className="w-4 h-4 text-accent-red" />;
      case 'at-risk': return <AlertCircle className="w-4 h-4 text-accent-amber" />;
      case 'on-track': return <TrendingUp className="w-4 h-4 text-accent-blue" />;
      case 'submitted': return <Send className="w-4 h-4 text-accent-purple" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-accent-green" />;
      default: return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-accent-red/20 text-accent-red border-accent-red/30',
      major: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
      minor: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
      high: 'bg-accent-red/20 text-accent-red',
      medium: 'bg-accent-amber/20 text-accent-amber',
      low: 'bg-accent-blue/20 text-accent-blue',
    };
    return colors[severity] || 'bg-slate-500/20 text-slate-400';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-accent-green';
    if (percent >= 70) return 'bg-accent-blue';
    if (percent >= 50) return 'bg-accent-amber';
    return 'bg-accent-red';
  };

  const getGroupLabel = (key: string) => {
    if (portfolioGroupBy === 'status') {
      const labels: Record<string, string> = {
        'blocked': '🚫 Blocked',
        'delayed': '⚠️ Delayed',
        'at-risk': '⚡ At Risk',
        'on-track': '✓ On Track',
        'submitted': '📤 Submitted',
        'approved': '✅ Approved',
      };
      return labels[key] || key;
    }
    return key;
  };

  const toggleINDModuleExpand = (moduleId: string) => {
    const newExpanded = new Set(expandedINDModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedINDModules(newExpanded);
  };

  const daysUntilTarget = selectedSubmission ? Math.ceil((new Date(selectedSubmission.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const selectedProduct = selectedSubmission ? getProduct(selectedSubmission.productId) : null;

  // Show empty state if no applications match filter
  if (filteredApps.length === 0 && filteredSubmissions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          type="no-results"
          title="No Applications Found"
          description="Try adjusting your filters to see more results."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* v0.50.0: ScreenHeader adoption — standardized header with ViewOnlyBanner */}
      <ScreenHeader
        moduleId="submissions"
        title="Submissions"
        subtitle="eCTD packages, planning, publishing, and lifecycle management"
        icon={<Send className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <GatewayStatusBadge />
            {/* v0.50.0: CapabilityGate wiring for New Sequence */}
            <CapabilityGate moduleId="submissions" capability="author">
            <Button
              variant="success"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreateNewSequence}
            >
              New Sequence
            </Button>
            </CapabilityGate>
          </div>
        }
      />
      {/* Pending Handoffs Banner */}
      {showHandoffBanner && pendingHandoffs.length > 0 && (
        <div className="bg-accent-green/10 border-b border-accent-green/30 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-green/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-accent-green" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {pendingHandoffs.length} document{pendingHandoffs.length > 1 ? 's' : ''} ready for submission
                </div>
                <div className="text-xs text-text-muted">
                  {pendingHandoffs.map(h => h.sourceTitle).join(', ')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingHandoffs.length === 1 && (
                <>
                  <button
                    onClick={() => handleAcceptHandoff(pendingHandoffs[0].id)}
                    className="px-3 py-1.5 text-sm bg-accent-green text-white rounded-lg hover:bg-accent-green/90 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Add to Builder
                  </button>
                  <button
                    onClick={() => handleRejectHandoff(pendingHandoffs[0].id)}
                    className="px-3 py-1.5 text-sm bg-surface-card text-text-secondary rounded-lg hover:bg-surface-elevated"
                  >
                    Dismiss
                  </button>
                </>
              )}
              {pendingHandoffs.length > 1 && (
                <button
                  onClick={() => setViewMode('builder')}
                  className="px-3 py-1.5 text-sm bg-accent-green text-white rounded-lg hover:bg-accent-green/90 flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  Go to Builder
                </button>
              )}
              <button
                onClick={() => setShowHandoffBanner(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with grouped tabs */}
      <div className="border-b border-border bg-surface">
        <div className="px-6 pt-3 pb-2">
          {/* v116: Breadcrumb navigation */}
          <Breadcrumb 
            moduleId="submissions" 
            viewLabel={viewMode === 'overview' ? 'Overview' : viewMode === 'builder' ? 'Builder' : viewMode === 'tracker' ? 'Tracker' : viewMode === 'pipeline' ? 'Pipeline' : viewMode === 'planning' ? 'Planning' : viewMode === 'publishing' ? 'Publishing' : viewMode === 'multi-region' ? 'Multi-Region' : viewMode.startsWith('ind-') ? 'IND Readiness' : 'Dashboard'}
            className="mb-1"
          />
          {/* v177: Cross-module return navigation */}
          <ReturnBreadcrumb variant="inline" className="mb-1" />
        </div>

        {/* Grouped Tabs Navigation - v94: Migrated to ButtonGroup */}
        <div className="px-6 flex items-center gap-8">
          {tabGroups.map((group) => (
            <div key={group.label} className="flex items-center gap-1">
              <span className="text-xs text-text-muted uppercase tracking-wider mr-2">{group.label}</span>
              <ButtonGroup>
                {group.tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={viewMode === tab.id ? 'primary' : 'ghost'}
                    size="sm"
                    icon={tab.icon}
                    onClick={() => setViewMode(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
          ))}
          
          {/* Stats on the right - v94: Using Badge */}
          <div className="ml-auto flex items-center gap-4 text-sm pb-2">
            <Badge color="gray" variant="soft" size="sm">{filteredApps.length} Apps</Badge>
            <Badge color="amber" variant="soft" size="sm">{underReview} In Review</Badge>
            <Badge color="green" variant="soft" size="sm">{submitted} Submitted</Badge>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'ind-overview' ? (
        /* IND Readiness Overview */
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Submission Selector Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewMode('ind-portfolio')}
                    className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Portfolio
                  </button>
                  <div className="h-6 w-px bg-border" />
                  <h2 className="text-xl font-semibold text-text-primary">Submission Readiness</h2>
                </div>
                {/* Submission Selector Dropdown */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedSubmission?.id || ''}
                    onChange={(e) => {
                      const sub = regulatorySubmissions.find(s => s.id === e.target.value);
                      if (sub) setSelectedSubmission(sub);
                    }}
                    className="bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary min-w-[300px]"
                  >
                    <option value="">Select a submission...</option>
                    {filteredSubmissions.map(sub => {
                      const product = getProduct(sub.productId);
                      return (
                        <option key={sub.id} value={sub.id}>
                          {sub.submissionType} - {product?.brandName || product?.name} ({sub.applicationNumber}) - {sub.overallReadiness}%
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              {selectedSubmission && selectedProduct && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple text-xs rounded font-medium">
                    {selectedProduct?.name} ({selectedProduct?.brandName})
                  </span>
                  <p className="text-sm text-text-muted">{selectedProduct?.indication} • {selectedSubmission?.submissionType} • {selectedSubmission?.region}</p>
                </div>
              )}
            </div>

            {!selectedSubmission ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">No Submission Selected</h3>
                <p className="text-sm text-text-muted mb-4">Select a submission from the dropdown above or go back to the portfolio</p>
                <button
                  onClick={() => setViewMode('ind-portfolio')}
                  className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90"
                >
                  View Portfolio
                </button>
              </div>
            ) : (
              <>
                {/* Alert Banner */}
                {selectedCriticalGaps.length > 0 && (
                  <div className="mb-6 bg-accent-red/10 border border-accent-red/30 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent-red/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-accent-red" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-text-primary mb-1">{selectedCriticalGaps.length} Critical Gap{selectedCriticalGaps.length > 1 ? 's' : ''} Requiring Attention</h3>
                        <p className="text-sm text-text-secondary mb-2">{selectedCriticalGaps[0]?.description}</p>
                        <button onClick={() => setViewMode('ind-gaps')} className="text-sm text-accent-red hover:underline flex items-center gap-1">
                          View Gap Analysis <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overall Readiness */}
                {/* v94: Migrated to StatCard components */}
                {/* v128: Loading state */}
                {isLoading ? (
                  <StatCardGridSkeleton count={4} columns={4} className="mb-6" />
                ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                  <StatCard
                    label="Overall Readiness"
                    value={`${selectedSubmission?.overallReadiness}%`}
                    icon={<Target className="w-5 h-5" />}
                    accentColor="blue"
                  >
                    <ProgressBar 
                      value={selectedSubmission?.overallReadiness || 0} 
                      max={100} 
                      size="sm" 
                      color={getProgressBadgeColor(selectedSubmission?.overallReadiness || 0)}
                      className="mt-2"
                    />
                  </StatCard>
                  <StatCard
                    label="Modules Complete"
                    value={`${selectedSubmission?.modules.filter(m => m.status === 'complete').length}/${selectedSubmission?.modules.length}`}
                    icon={<CheckCircle className="w-5 h-5" />}
                    accentColor="green"
                  >
                    <p className="text-xs text-text-muted mt-1">{selectedSubmission?.modules.filter(m => m.status === 'at-risk' || m.status === 'blocked').length} at risk</p>
                  </StatCard>
                  <StatCard
                    label="Blocking Items"
                    value={selectedBlockingItems.length}
                    icon={<AlertTriangle className="w-5 h-5" />}
                    accentColor="amber"
                  >
                    <p className="text-xs text-text-muted mt-1">On critical path</p>
                  </StatCard>
                  <StatCard
                    label="Days to Target"
                    value={daysUntilTarget}
                    icon={<Calendar className="w-5 h-5" />}
                    accentColor={daysUntilTarget < 30 ? 'red' : daysUntilTarget < 60 ? 'amber' : 'blue'}
                  >
                    <p className="text-xs text-text-muted mt-1">{selectedSubmission?.targetDate}</p>
                  </StatCard>
                </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Module Status Summary - v94: Migrated to Card */}
                  <Card variant="elevated" className="col-span-1 md:col-span-2">
                    <CardHeader
                      title="Module Readiness"
                      action={
                        <Button variant="ghost" size="xs" onClick={() => setViewMode('ind-modules')}>
                          View Details <ChevronRight className="w-4 h-4" />
                        </Button>
                      }
                    />
                    <CardContent>
                    <div className="space-y-4">
                      {selectedSubmission?.modules.map(module => (
                        <div key={module.moduleId} className="flex items-center gap-4">
                          <div className="w-20 text-sm font-medium text-text-primary">M{module.moduleNumber}</div>
                          <div className="flex-1">
                            <LabeledProgress
                              label={module.moduleName}
                              value={module.completionPercent}
                              max={100}
                              size="sm"
                              color={getProgressBadgeColor(module.completionPercent)}
                            />
                          </div>
                          <Badge color={indStatusColorMap[module.status] || 'gray'} size="xs">
                            {module.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    </CardContent>
                  </Card>

              {/* Upcoming Milestones - v94: Migrated to Card */}
              <Card variant="elevated">
                <CardHeader
                  title="Milestones"
                  icon={<Calendar className="w-5 h-5 text-text-muted" />}
                />
                <CardContent>
                <div className="space-y-3">
                  {selectedSubmission?.milestones.slice(0, 5).map(milestone => (
                    <div key={milestone.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        milestone.status === 'completed' ? 'bg-accent-green' :
                        milestone.status === 'at-risk' ? 'bg-accent-amber' :
                        milestone.status === 'missed' ? 'bg-accent-red' : 'bg-accent-blue'
                      }`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{milestone.name}</div>
                        <div className="text-xs text-text-muted">{milestone.targetDate}</div>
                      </div>
                      <Badge color={indStatusColorMap[milestone.status] || 'gray'} size="xs">
                        {milestone.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights - v94: Migrated to Card */}
            <Card variant="default" className="mt-6 bg-accent-purple/10 border-accent-purple/30">
              <CardContent>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text-primary mb-2">AI Readiness Insights</h3>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <p><strong className="text-text-primary">Timeline Risk:</strong> Phase 1 CSR completion is on critical path. Current progress suggests 3-day delay risk to submission date.</p>
                    <p><strong className="text-text-primary">Cross-Module Dependency:</strong> Clinical Overview (M2.5) is blocked by CSR. Consider parallel drafting using preliminary data.</p>
                    <p><strong className="text-text-primary">Predicted Readiness:</strong> Based on current velocity, 85% readiness achievable by target date. Recommend resource surge on Module 2.</p>
                  </div>
                </div>
              </div>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        </div>
      ) : viewMode === 'ind-modules' ? (
        /* IND Module Grid - v94: Migrated to Card components */
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-text-primary">Module Readiness Grid</h2>
              <p className="text-sm text-text-muted mt-1">CTD module completion status aligned with DIA EDM Reference Model</p>
            </div>

            <div className="space-y-4">
              {selectedSubmission?.modules.map(module => (
                <Card key={module.moduleId} variant="elevated" padding="none">
                  {/* Module Header */}
                  <div 
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-card transition-colors"
                    onClick={() => toggleINDModuleExpand(module.moduleId)}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${
                      module.status === 'complete' ? 'bg-accent-green/20 text-accent-green' :
                      module.status === 'blocked' ? 'bg-accent-red/20 text-accent-red' :
                      module.status === 'at-risk' ? 'bg-accent-amber/20 text-accent-amber' :
                      'bg-accent-blue/20 text-accent-blue'
                    }`}>
                      M{module.moduleNumber}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-text-primary">{module.moduleName}</h3>
                        <Badge color={indStatusColorMap[module.status] || 'gray'} size="sm">
                          {module.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-text-muted">
                        <span><Users className="w-4 h-4 inline mr-1" />{module.owner}</span>
                        <span><Calendar className="w-4 h-4 inline mr-1" />Due: {module.dueDate}</span>
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <div className="text-2xl font-bold text-text-primary">{module.completionPercent}%</div>
                      <div className="text-xs text-text-muted">
                        {module.documentsComplete}/{module.documentsTotal} docs
                      </div>
                    </div>
                    <div className="w-32">
                      <ProgressBar 
                        value={module.completionPercent} 
                        max={100} 
                        size="sm" 
                        color={getProgressBadgeColor(module.completionPercent)}
                      />
                    </div>
                    {expandedINDModules.has(module.moduleId) ? (
                      <ChevronUp className="w-5 h-5 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-text-muted" />
                    )}
                  </div>

                  {/* Expanded Sections */}
                  {expandedINDModules.has(module.moduleId) && (
                    <div className="border-t border-border">
                      {/* Blockers */}
                      {module.blockers.length > 0 && (
                        <div className="px-4 py-3 bg-accent-red/5 border-b border-border">
                          <div className="flex items-center gap-2 text-sm text-accent-red">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium">Blocker:</span>
                            {module.blockers[0]}
                          </div>
                        </div>
                      )}

                      {/* Section Grid */}
                      <div className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-text-muted">
                              <th className="text-left pb-2 font-medium">Section</th>
                              <th className="text-left pb-2 font-medium">Owner</th>
                              <th className="text-left pb-2 font-medium">Due Date</th>
                              <th className="text-left pb-2 font-medium">Documents</th>
                              <th className="text-left pb-2 font-medium">Progress</th>
                              <th className="text-left pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(module.sections ?? []).map(section => (
                              <tr key={section.sectionId} className="border-t border-border/50">
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary">{section.sectionNumber}</span>
                                    <span className="text-sm text-text-secondary">{section.sectionName}</span>
                                    {section.requiredByEDM && (
                                      <Badge color="purple" size="xs">EDM</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 text-sm text-text-secondary">{section.owner}</td>
                                <td className="py-3 text-sm text-text-secondary">{section.dueDate}</td>
                                <td className="py-3 text-sm text-text-secondary">{section.documentsComplete}/{section.documentsTotal}</td>
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <ProgressBar 
                                      value={section.completionPercent} 
                                      max={100} 
                                      size="xs" 
                                      color={getProgressBadgeColor(section.completionPercent)}
                                      className="w-24"
                                    />
                                    <span className="text-xs text-text-muted">{section.completionPercent}%</span>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <Badge color={indStatusColorMap[section.status] || 'gray'} size="xs">
                                    {section.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Dependencies */}
                      {module.dependencies.length > 0 && (
                        <div className="px-4 py-3 bg-surface-card border-t border-border">
                          <span className="text-xs text-text-muted">Dependencies: </span>
                          {module.dependencies.map((dep, i) => (
                            <span key={dep} className="text-xs text-text-secondary">
                              Module {dep.replace('m', '')}{i < module.dependencies.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : viewMode === 'ind-timeline' ? (
        /* IND Critical Path Timeline - v94: Migrated */
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-text-primary">Critical Path Timeline</h2>
              <p className="text-sm text-text-muted mt-1">Blocking items and dependencies affecting submission date</p>
            </div>

            {/* Timeline Legend */}
            <div className="mb-6 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent-green" /><span className="text-text-muted">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent-blue" /><span className="text-text-muted">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-500" /><span className="text-text-muted">Not Started</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent-red" /><span className="text-text-muted">Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent-amber" /><span className="text-text-muted">On Critical Path</span>
              </div>
            </div>

            {/* Gantt-style Timeline */}
            <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-card">
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium w-64">Task</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium w-24">Module</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium w-32">Owner</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium w-24">Duration</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium w-24">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSubmission?.criticalPath.map((item) => {
                    const startDate = new Date(item.startDate);
                    const timelineStart = new Date('2024-12-10');
                    const timelineEnd = new Date('2025-02-20');
                    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
                    const startOffset = Math.max(0, (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                    const barWidth = item.duration;
                    const startPercent = (startOffset / totalDays) * 100;
                    const widthPercent = (barWidth / totalDays) * 100;
                    
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-surface-card">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.isBlocking && <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />}
                            <span className="text-sm font-medium text-text-primary">{item.task}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{item.module}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{item.owner}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{item.duration}d</td>
                        <td className="px-4 py-3">
                          <Badge color={indStatusColorMap[item.status] || 'gray'} size="xs">
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative h-6 bg-surface-card rounded">
                            <div 
                              className={`absolute h-6 rounded ${
                                item.status === 'completed' ? 'bg-accent-green' :
                                item.status === 'in-progress' ? 'bg-accent-blue' :
                                item.status === 'blocked' ? 'bg-accent-red' : 'bg-slate-500'
                              }`}
                              style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Milestones - v94: Migrated to Card */}
            <Card variant="elevated" className="mt-6">
              <CardContent>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Key Milestones</h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-4">
                  {selectedSubmission?.milestones.map(milestone => (
                    <div key={milestone.id} className="relative flex items-start gap-4 pl-8">
                      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-surface-elevated ${
                        milestone.status === 'completed' ? 'bg-accent-green' :
                        milestone.status === 'at-risk' ? 'bg-accent-amber' :
                        milestone.status === 'missed' ? 'bg-accent-red' : 'bg-accent-blue'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-text-primary">{milestone.name}</span>
                          <Badge color={indStatusColorMap[milestone.status] || 'gray'} size="xs">
                            {milestone.status}
                          </Badge>
                          <Badge 
                            color={milestone.type === 'regulatory' ? 'red' : milestone.type === 'clinical' ? 'blue' : 'gray'} 
                            size="xs"
                          >
                            {milestone.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-muted mt-1">{milestone.targetDate} • {milestone.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : viewMode === 'ind-gaps' ? (
        /* IND Gap Analysis - v94: Migrated */
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-text-primary">Gap Analysis</h2>
              <p className="text-sm text-text-muted mt-1">FDA IND requirements vs. current documentation status (EDM Reference Model aligned)</p>
            </div>

            {/* Summary Stats - v94: Migrated to StatCard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
              <StatCard
                label="Critical Gaps"
                value={selectedSubmission?.gaps.filter(g => g.severity === 'critical').length || 0}
                accentColor="red"
              />
              <StatCard
                label="Major Gaps"
                value={selectedSubmission?.gaps.filter(g => g.severity === 'major').length || 0}
                accentColor="amber"
              />
              <StatCard
                label="Minor Gaps"
                value={selectedSubmission?.gaps.filter(g => g.severity === 'minor').length || 0}
                accentColor="blue"
              />
              <StatCard
                label="Resolved"
                value={selectedSubmission?.gaps.filter(g => g.status === 'resolved').length || 0}
                accentColor="green"
              />
            </div>

            {/* Gap List - v94: Migrated to Card */}
            <div className="space-y-4">
              {selectedSubmission?.gaps.map(gap => (
                <Card key={gap.id} variant="default" className={`border ${getSeverityColor(gap.severity)}`}>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        gap.severity === 'critical' ? 'bg-accent-red/20' :
                        gap.severity === 'major' ? 'bg-accent-amber/20' : 'bg-accent-blue/20'
                      }`}>
                        {gap.severity === 'critical' ? <XCircle className="w-5 h-5 text-accent-red" /> :
                         gap.severity === 'major' ? <AlertTriangle className="w-5 h-5 text-accent-amber" /> :
                         <AlertCircle className="w-5 h-5 text-accent-blue" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-text-primary">{gap.module} • {gap.section}</span>
                          <Badge color={gap.severity === 'critical' ? 'red' : gap.severity === 'major' ? 'amber' : 'blue'} size="xs">
                            {gap.severity}
                          </Badge>
                          <Badge color={indStatusColorMap[gap.status] || 'gray'} size="xs">
                            {gap.status}
                          </Badge>
                          <Badge color="purple" size="xs">
                            {gap.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-primary mb-3">{gap.description}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm mb-3">
                          <div>
                            <span className="text-text-muted">FDA Requirement:</span>
                            <p className="text-text-secondary">{gap.fdaRequirement}</p>
                          </div>
                          <div>
                            <span className="text-text-muted">EDM Reference:</span>
                            <p className="text-text-secondary">{gap.edmReference}</p>
                          </div>
                        </div>
                        
                        <div className="bg-surface-card rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Zap className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs text-text-muted">Recommendation:</span>
                              <p className="text-sm text-text-primary">{gap.recommendation}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-3 text-xs text-text-muted">
                          <span><Users className="w-3 h-3 inline mr-1" />{gap.owner || 'Unassigned'}</span>
                          <span><Calendar className="w-3 h-3 inline mr-1" />{gap.dueDate || 'No date'}</span>
                          <span><Clock className="w-3 h-3 inline mr-1" />{gap.estimatedEffort}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Risk Factors Panel - v94: Migrated to Card */}
            <Card variant="elevated" className="mt-6">
              <CardContent>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Active Risk Factors</h3>
              <div className="space-y-3">
                {selectedSubmission?.riskFactors.filter(r => r.status === 'active').map(risk => (
                  <div key={risk.id} className="flex items-start gap-4 p-3 bg-surface-card rounded-lg">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      risk.impact === 'high' ? 'bg-accent-red/20' : risk.impact === 'medium' ? 'bg-accent-amber/20' : 'bg-accent-blue/20'
                    }`}>
                      <Shield className={`w-4 h-4 ${
                        risk.impact === 'high' ? 'text-accent-red' : risk.impact === 'medium' ? 'text-accent-amber' : 'text-accent-blue'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">{risk.title}</span>
                        <Badge color={risk.impact === 'high' ? 'red' : risk.impact === 'medium' ? 'amber' : 'blue'} size="xs">
                          {risk.impact} impact
                        </Badge>
                        <Badge color={risk.probability === 'high' ? 'red' : risk.probability === 'medium' ? 'amber' : 'blue'} size="xs">
                          {risk.probability} prob
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary mb-2">{risk.description}</p>
                      <p className="text-xs text-text-muted"><strong>Mitigation:</strong> {risk.mitigation}</p>
                    </div>
                  </div>
                ))}
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : viewMode === 'pipeline' ? (
        <PipelineView />
      ) : viewMode === 'lifecycle' ? (
        <LifecycleView />
      ) : viewMode === 'planning' ? (
        <PlanningView filters={filters} />
      ) : viewMode === 'publishing' ? (
        <PublishingView filters={filters} />
      ) : viewMode === 'multi-region' ? (
        <div className="flex-1 overflow-auto p-6">
          <MultiRegionSubmissionTracker />
        </div>
      ) : viewMode === 'builder' ? (
        <SubmissionBuilder
          applicationId={selectedApp?.id || ''}
          applicationName={selectedApp ? `${selectedApp.type} ${selectedApp.number}` : ''}
          onClose={() => setViewMode('overview')}
        />
      ) : viewMode === 'tracker' ? (
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-auto p-6 space-y-4 md:space-y-6">
            {/* Gateway Acknowledgment Tracking */}
            {selectedApp && (
              <GatewayStatusPanel 
                projectId={selectedApp.id}
                applicationNumber={selectedApp.number || 'N/A'}
                sequenceNumber="0000"
                submissionType={selectedApp.type || 'original-application'}
              />
            )}
            
            {/* Existing Submission Tracker */}
            <SubmissionTracker 
              applicationId={selectedApp?.id}
              onViewSequence={(draft) => {
                setViewMode('builder');
              }}
            />
          </div>
          <div className="hidden xl:block w-80 border-l border-border overflow-auto">
            <GatewayMonitor />
          </div>
        </div>
      ) : viewMode === 'overview' ? (
        /* Overview Mode - Application Cards - v94: Migrated to Card */
        <div className="flex-1 overflow-auto p-6">

          {/* v0.44.48: Cascade strip — submission amendments triggered by other modules */}
          {(() => {
            const subEntries = chains
              .filter(c => c.status !== 'dismissed' && c.status !== 'complete')
              .flatMap(chain =>
                chain.steps
                  .filter(s => s.targetModule === 'submissions' && (s.status === 'pending' || s.status === 'spawned'))
                  .map(step => ({ chain, step }))
              );
            if (subEntries.length === 0) return null;
            return (
              <div className="mb-5 space-y-2">
                {subEntries.map(({ chain, step }) => {
                  const mins = Math.floor((Date.now() - new Date(chain.trigger.triggeredAt).getTime()) / 60000);
                  const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
                  return (
                    <div key={`${chain.id}-${step.id}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border
                        bg-red-500/5 border-red-500/25 hover:border-red-500/40 transition-all"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Amendment Flag</span>
                          <span className="text-xs text-text-muted">· {ago}</span>
                        </div>
                        <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{step.title}</p>
                        <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">Triggered by: {chain.trigger.sourceLabel}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => setViewMode('builder')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                            bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Flag className="w-3 h-3" />
                          Review Impact
                        </button>
                        <button onClick={() => skipStep(chain.id, step.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Dismiss"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* v0.44.48: Hero — most urgent submission (blocked/delayed first, then at-risk) */}
          {(() => {
            const urgencyOrder: SubmissionStatus[] = ['blocked', 'delayed', 'at-risk'];
            const hero = filteredSubmissions.find(s => s.status === 'blocked')
              ?? filteredSubmissions.find(s => s.status === 'delayed')
              ?? filteredSubmissions.find(s => s.status === 'at-risk')
              ?? null;
            if (!hero) return null;
            const product = getProduct(hero.productId);
            const daysLeft = Math.ceil((new Date(hero.targetDate).getTime() - Date.now()) / 86400000);
            const criticalGaps = hero.gaps.filter(g => g.severity === 'critical' && g.status !== 'resolved').length;
            const isBlocked = hero.status === 'blocked' || hero.status === 'delayed';
            return (
              <div
                onClick={() => { setSelectedSubmission(hero); setViewMode('ind-overview'); }}
                className={`mb-5 flex items-start justify-between gap-3 p-4 rounded-xl border-l-4 border cursor-pointer
                  transition-all duration-150 hover:-translate-y-px hover:shadow-lg
                  ${isBlocked
                    ? 'border-l-red-500 border-red-500/25 bg-red-500/5 hover:shadow-red-500/10'
                    : 'border-l-amber-500 border-amber-500/20 bg-amber-500/5 hover:shadow-amber-500/10'
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isBlocked ? 'text-red-400' : 'text-amber-400'}`}>
                      {isBlocked ? '🚫 Submission Blocked' : '⚡ At Risk'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getINDStatusColor(hero.status)}`}>
                      {hero.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary leading-snug truncate">
                    {product?.name ?? hero.productId} — {hero.submissionType.toUpperCase()} ({hero.region})
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-mono text-xs text-text-muted">{hero.applicationNumber}</span>
                    {criticalGaps > 0 && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{criticalGaps} critical gap{criticalGaps > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`text-xs flex items-center gap-1 ${daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-400' : 'text-text-muted'}`}>
                      <Clock className="w-3 h-3" />
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d past target` : `${daysLeft}d to target`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedSubmission(hero); setViewMode('ind-overview'); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                    ${isBlocked ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  View Readiness
                </button>
              </div>
            );
          })()}

          {/* v159: Cross-Module Pending Actions Banner */}
          {submissionsPendingActions.length > 0 && (
            <Card variant="elevated" padding="md" className="mb-6 border-accent-amber/30 bg-accent-amber/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-amber/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-accent-amber" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {submissionsPendingActions.length} Pending Cross-Module Action{submissionsPendingActions.length > 1 ? 's' : ''}
                    </h3>
                    <Badge color="amber" size="xs">Incoming</Badge>
                  </div>
                  <div className="space-y-2 mt-2">
                    {submissionsPendingActions.slice(0, 3).map((action, idx) => (
                      <div key={idx} className="text-sm text-text-secondary flex items-center gap-2">
                        <Activity className="w-3 h-3 text-accent-amber" />
                        <span>{action.cascadeAction.description}</span>
                      </div>
                    ))}
                    {submissionsPendingActions.length > 3 && (
                      <div className="text-xs text-text-muted">
                        +{submissionsPendingActions.length - 3} more actions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {filteredApps.map(app => (
              <Card 
                key={app.id}
                variant="interactive"
                radius="xl"
                padding="lg"
                onClick={() => {
                  setSelectedApp(app);
                  setSelectedSequence(app.sequences[0] || null);
                  selectApplicationInStore(app.id); // Sync to portfolio store
                  setViewMode('viewer');
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {app.type} {app.number}
                      </h3>
                      <Badge 
                        color={app.ectdVersion === '4.0' ? 'purple' : 'gray'} 
                        size="xs"
                      >
                        eCTD v{app.ectdVersion}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary">{app.productName} ({app.substanceName})</p>
                    <p className="text-xs text-text-muted mt-1">{app.indication}</p>
                  </div>
                  <Globe className="w-5 h-5 text-text-muted" />
                </div>

                {/* Sequence Timeline */}
                <div className="mb-4">
                  <div className="text-xs text-text-muted mb-2">Sequences</div>
                  <div className="flex gap-2 flex-wrap">
                    {app.sequences.map(seq => (
                      <Badge 
                        key={seq.sequenceNumber}
                        color={sequenceStatusColorMap[seq.status] || 'gray'}
                        size="xs"
                        icon={getSequenceStatusIcon(seq.status)}
                      >
                        {seq.sequenceNumber}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Correspondence indicator */}
                {app.correspondence.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-accent-amber">
                    <MessageSquare className="w-3 h-3" />
                    {app.correspondence.length} correspondence thread{app.correspondence.length > 1 ? 's' : ''}
                  </div>
                )}

                <CardFooter className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-text-muted">
                    {app.sequences.length} sequence{app.sequences.length > 1 ? 's' : ''} • {app.sequences.reduce((acc, s) => acc + s.documents.length, 0)} documents
                  </span>
                  <Button variant="ghost" size="xs" onClick={() => {
                    setSelectedApp(app);
                    setSelectedSequence(app.sequences[0] || null);
                    setViewMode('viewer');
                  }}>
                    View eCTD <ChevronRight className="w-3 h-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Viewer Mode - eCTD Tree */
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Application/Sequence List */}
          <div className="hidden lg:flex w-72 bg-surface-elevated border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary mb-3">Applications</h2>
              <div className="space-y-2">
                {filteredApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => {
                      setSelectedApp(app);
                      setSelectedSequence(app.sequences[0] || null);
                      setSelectedDocument(null);
                      selectApplicationInStore(app.id); // Sync to portfolio store
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedApp?.id === app.id 
                        ? 'bg-accent-blue/20 border border-accent-blue/50' 
                        : 'bg-surface-card hover:bg-surface-card/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">
                        {app.type} {app.number}
                      </span>
                      <Badge color={app.ectdVersion === '4.0' ? 'purple' : 'gray'} size="xs">
                        v{app.ectdVersion}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-muted mt-1">{app.productName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sequence Timeline */}
            <div className="flex-1 overflow-auto p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Sequences</h3>
              <div className="space-y-2">
                {selectedApp?.sequences.map((seq, index) => (
                  <button
                    key={seq.sequenceNumber}
                    onClick={() => {
                      setSelectedSequence(seq);
                      setSelectedDocument(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors relative ${
                      selectedSequence?.sequenceNumber === seq.sequenceNumber 
                        ? 'bg-accent-blue/10 border border-accent-blue/30' 
                        : 'bg-surface-card hover:bg-surface-card/70'
                    }`}
                  >
                    {/* Timeline connector */}
                    {index < selectedApp?.sequences.length - 1 && (
                      <div className="absolute left-6 top-14 w-0.5 h-4 bg-border" />
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getSequenceStatusIcon(seq.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">
                            Seq {seq.sequenceNumber}
                          </span>
                          <span className="text-xs text-text-muted">{seq.submissionDate}</span>
                        </div>
                        <div className="text-xs text-text-secondary mt-1 truncate">
                          {seq.submissionType}
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          {seq.documents.length} documents
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Panel - CTD Tree View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border bg-surface">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {selectedApp?.type} {selectedApp?.number} — Sequence {selectedSequence?.sequenceNumber}
                  </h2>
                  <p className="text-sm text-text-muted mt-1">{selectedSequence?.description}</p>
                </div>
                {selectedSequence && (
                  <Badge color={sequenceStatusColorMap[selectedSequence.status] || 'gray'} size="md">
                    {getSequenceStatusIcon(selectedSequence.status)}
                    {selectedSequence.status.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                  </Badge>
                )}
              </div>
              
              {/* eCTD View Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">View:</span>
                <div className="flex bg-surface-card rounded-lg p-0.5 border border-border">
                  <button
                    onClick={() => setEctdViewMode('sequence')}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      ectdViewMode === 'sequence' 
                        ? 'bg-accent-blue text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title="Show documents from this sequence only"
                  >
                    Sequence
                  </button>
                  <button
                    onClick={() => setEctdViewMode('cumulative')}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      ectdViewMode === 'cumulative' 
                        ? 'bg-accent-blue text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title="Show all documents submitted up to this sequence"
                  >
                    Cumulative
                  </button>
                  <button
                    onClick={() => setEctdViewMode('current')}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      ectdViewMode === 'current' 
                        ? 'bg-accent-blue text-white' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title="Show current state after applying all lifecycle operations"
                  >
                    Current
                  </button>
                </div>
                <span className="text-xs text-text-muted ml-2">
                  {ectdViewMode === 'sequence' && '(This sequence only)'}
                  {ectdViewMode === 'cumulative' && '(All sequences up to this point)'}
                  {ectdViewMode === 'current' && '(Active documents after all operations)'}
                </span>
              </div>
            </div>

            {/* CTD Tree */}
            <div className="flex-1 overflow-auto p-4">
              <CTDTree
                documents={getViewModeDocuments()}
                onSelectDocument={setSelectedDocument}
                onOpenDocument={openDocument}
                selectedDocumentId={selectedDocument?.id}
                viewMode={ectdViewMode}
              />
            </div>
            
            {/* Related Correspondence - Bottom Panel */}
            {relatedCorrespondence.length > 0 && (
              <div className="border-t border-border bg-surface">
                <details className="group">
                  <summary className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-card transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-accent-amber" />
                      <span className="font-medium text-text-primary">Related Correspondence</span>
                      <span className="text-xs text-text-muted">({relatedCorrespondence.length})</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-3 space-y-2">
                    {relatedCorrespondence.map(corr => (
                      <div key={corr.id} className="p-2 bg-surface-card rounded border border-border">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-medium text-text-primary">{corr.type}</div>
                            <div className="text-xs text-text-secondary mt-0.5">{corr.subject}</div>
                            <div className="text-xs text-text-muted mt-1">{corr.messages[0]?.date || 'No date'}</div>
                          </div>
                          <button 
                            onClick={() => {
                              const lastMsg = corr.messages[corr.messages.length - 1];
                              const fileName = lastMsg.documentPath.split('/').pop();
                              window.open(`${ARCHIVE_PATHS.correspondence}/${fileName}`, '_blank');
                            }}
                            className="text-xs text-accent-blue hover:underline flex items-center gap-1"
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

          {/* Right Panel - Document Details */}
          <div className="hidden xl:flex w-80 bg-surface-elevated border-l border-border flex flex-col">
            {selectedDocument ? (
              <>
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-text-primary">Document Details</h3>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Title</div>
                      <div className="text-sm text-text-primary">{selectedDocument.title}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">File Path</div>
                      <div className="text-sm text-text-secondary font-mono text-xs break-all">
                        {selectedDocument.filePath}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Operation</div>
                      <Badge color={operationColorMap[selectedDocument.operation] || 'gray'} size="sm">
                        {selectedDocument.operation}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Checksum ({selectedDocument.checksumType.toUpperCase()})</div>
                      <div className="text-xs text-text-secondary font-mono break-all bg-surface p-2 rounded">
                        {selectedDocument.checksum}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Module / Section</div>
                      <div className="text-sm text-text-secondary">
                        Module {selectedDocument.module} {selectedDocument.section && `/ ${selectedDocument.section}`}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-border space-y-2">
                  <Button 
                    variant="primary"
                    fullWidth
                    icon={<Eye className="w-4 h-4" />}
                    onClick={() => openDocument(selectedDocument)}
                  >
                    View Document
                  </Button>
                  <Button 
                    variant="secondary"
                    fullWidth
                    icon={<Download className="w-4 h-4" />}
                    onClick={() => {
                      const archivePath = selectedApp?.archivePath;
                      const seqFolder = selectedApp?.ectdVersion === '3.2.2' 
                        ? selectedSequence?.sequenceNumber.padStart(4, '0')
                        : selectedSequence?.sequenceNumber;
                      const fullPath = `${archivePath}/${seqFolder}/${selectedDocument.filePath}`;
                      const link = document.createElement('a');
                      link.href = fullPath;
                      link.download = selectedDocument.filePath.split('/').pop() || 'document';
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                type="no-data"
                title="Select a document"
                description="Double-click to open"
                icon={<FileText className="w-12 h-12" />}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
